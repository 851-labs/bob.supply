import {
  availabilityManifestKey,
  avatarObjectKey,
  selectAvatarForSeed,
  type AvailabilityManifest,
} from "@bob-avatars/core";

type BobSupplyObject = Pick<
  NonNullable<Awaited<ReturnType<CloudflareEnv["BOB_SUPPLY_BUCKET"]["get"]>>>,
  "arrayBuffer" | "body"
>;

export type BobSupplyBucket = {
  readonly get: (key: string) => Promise<BobSupplyObject | null>;
};

export type PfpEnv = {
  readonly BOB_SUPPLY_BUCKET?: BobSupplyBucket;
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
  storage?: AvatarStorage,
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

  const avatarStorage = storage ?? createStorage(env);
  if (avatarStorage === undefined) {
    return new Response("Avatar storage is unavailable", { status: 503 });
  }

  const availability = await loadAvailability(avatarStorage, ActiveBatchId);
  if (availability === undefined || availability.entries.length === 0) {
    return new Response("Avatar availability manifest is unavailable", { status: 503 });
  }

  const entry = await selectAvatarForSeed(seed, availability);
  if (entry === undefined) {
    return new Response("No avatars are available", { status: 503 });
  }

  const objectKey = avatarObjectKey(ActiveBatchId, entry);
  const image = await avatarStorage.getImage(objectKey);
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

export async function handleGeneratedAssetRequest(
  request: Request,
  env: PfpEnv = {},
): Promise<Response | undefined> {
  const url = new URL(request.url);
  const objectKey = generatedObjectKeyFromPath(url.pathname);
  if (objectKey === undefined) return undefined;

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: {
        Allow: "GET, HEAD",
      },
    });
  }

  if (env.BOB_SUPPLY_BUCKET === undefined) {
    return new Response("Generated asset storage is unavailable", { status: 503 });
  }

  const object = await env.BOB_SUPPLY_BUCKET.get(objectKey);
  if (object === null || object.body === null) {
    return new Response("Generated asset is missing", { status: 404 });
  }

  return new Response(request.method === "HEAD" ? null : object.body, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": contentTypeForObjectKey(objectKey),
      "X-Bob-Avatars-Key": objectKey,
    },
  });
}

export function generatedObjectKeyFromPath(pathname: string): string | undefined {
  const prefix = "/generated/";
  if (!pathname.startsWith(prefix)) return undefined;

  const objectKey = pathname.slice(prefix.length);
  if (!/^batch-001\/[a-z0-9-]+\/[0-9]{2}\.png$/.test(objectKey)) return undefined;

  return objectKey;
}

function createStorage(env: PfpEnv): AvatarStorage | undefined {
  if (env.BOB_SUPPLY_BUCKET !== undefined) {
    return createR2Storage(env.BOB_SUPPLY_BUCKET);
  }

  return undefined;
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

function contentTypeForObjectKey(objectKey: string): string {
  if (objectKey.endsWith(".png")) return "image/png";
  if (objectKey.endsWith(".json")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}
