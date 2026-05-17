import {
  availabilityManifestKey,
  avatarObjectKey,
  selectAvatarForSeed,
  type AvailabilityManifest,
} from "@bob-avatars/core";

export type BobSupplyBucket = {
  readonly get: (key: string) => Promise<R2ObjectBody | null>;
};

export type PfpEnv = {
  readonly BOB_SUPPLY_BUCKET?: BobSupplyBucket;
};

type R2ObjectBody = {
  readonly body: ReadableStream<Uint8Array> | null;
  readonly arrayBuffer?: () => Promise<ArrayBuffer>;
};

export type AvatarStorage = {
  readonly sourceId: string;
  readonly getText: (key: string) => Promise<string | undefined>;
  readonly getImage: (key: string) => Promise<BodyInit | undefined>;
};

let availabilityCache:
  | {
      readonly sourceId: string;
      readonly key: string;
      readonly value: Promise<AvailabilityManifest | undefined>;
    }
  | undefined;

const ActiveBatchId = "batch-001";

export function clearPfpAvailabilityCache(): void {
  availabilityCache = undefined;
}

export async function handlePfpRequest(
  request: Request,
  env: PfpEnv = {},
  storage: AvatarStorage = createStorage(env),
): Promise<Response | undefined> {
  const url = new URL(request.url);
  const seed = seedFromPath(url.pathname);
  if (seed === undefined) {
    return undefined;
  }

  if (request.method !== "GET") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: {
        Allow: "GET",
      },
    });
  }

  const format = url.searchParams.get("format") ?? "png";
  if (format !== "png") {
    return new Response("Unsupported avatar format", { status: 400 });
  }

  const availability = await loadAvailability(storage, ActiveBatchId);
  if (availability === undefined || availability.entries.length === 0) {
    return new Response("Avatar availability manifest is unavailable", { status: 503 });
  }

  const entry = await selectAvatarForSeed(seed, availability);
  if (entry === undefined) {
    return new Response("No avatars are available", { status: 503 });
  }

  const objectKey = avatarObjectKey(ActiveBatchId, entry);
  const image = await storage.getImage(objectKey);
  if (image === undefined) {
    return new Response("Selected avatar image is missing", { status: 502 });
  }

  return new Response(image, {
    headers: {
      "Cache-Control": "public, max-age=86400",
      "Content-Type": "image/png",
      "X-Bob-Avatars-Batch": ActiveBatchId,
      "X-Bob-Avatars-Key": objectKey,
    },
  });
}

export function seedFromPath(pathname: string): string | undefined {
  const slug = pathname.slice(1);
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) return undefined;

  return slug;
}

function createStorage(env: PfpEnv): AvatarStorage {
  if (env.BOB_SUPPLY_BUCKET !== undefined) {
    return createR2Storage(env.BOB_SUPPLY_BUCKET);
  }

  return createLocalStorage();
}

function createR2Storage(bucket: BobSupplyBucket): AvatarStorage {
  return {
    sourceId: "r2",
    getText: async (key) => {
      const object = await bucket.get(key);
      if (object === null) return undefined;

      if (object.arrayBuffer !== undefined) {
        return new TextDecoder().decode(await object.arrayBuffer());
      }

      if (object.body === null) return undefined;
      return await new Response(object.body).text();
    },
    getImage: async (key) => {
      const object = await bucket.get(key);
      return object?.body ?? undefined;
    },
  };
}

function createLocalStorage(): AvatarStorage {
  return {
    sourceId: "local",
    getText: async (key) => {
      const { readFile } = await import("node:fs/promises");
      const { dirname, join, resolve } = await import("node:path");
      const { fileURLToPath } = await import("node:url");

      try {
        const generatedDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../../generated");
        return await readFile(join(generatedDir, key), "utf8");
      } catch {
        return undefined;
      }
    },
    getImage: async (key) => {
      const { readFile } = await import("node:fs/promises");
      const { dirname, join, resolve } = await import("node:path");
      const { fileURLToPath } = await import("node:url");

      try {
        const generatedDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../../generated");
        return await readFile(join(generatedDir, key));
      } catch {
        return undefined;
      }
    },
  };
}

async function loadAvailability(
  storage: AvatarStorage,
  batchId: string,
): Promise<AvailabilityManifest | undefined> {
  const key = availabilityManifestKey(batchId);
  if (
    availabilityCache === undefined ||
    availabilityCache.sourceId !== storage.sourceId ||
    availabilityCache.key !== key
  ) {
    availabilityCache = {
      sourceId: storage.sourceId,
      key,
      value: readAvailability(storage, key),
    };
  }

  return await availabilityCache.value;
}

async function readAvailability(
  storage: AvatarStorage,
  key: string,
): Promise<AvailabilityManifest | undefined> {
  const text = await storage.getText(key);
  if (text === undefined) return undefined;

  try {
    return JSON.parse(text) as AvailabilityManifest;
  } catch {
    return undefined;
  }
}
