import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import {
  availabilityManifestKey,
  createAvailabilityManifest,
  createManifest,
  type ManifestEntry,
} from "@bob-supply/core";

type ProviderName = "mock" | "codex";

type CliOptions = {
  readonly outDir: string;
  readonly provider: ProviderName;
  readonly planOnly: boolean;
  readonly availabilityOnly: boolean;
  readonly force: boolean;
  readonly concurrency: number;
  readonly limit?: number;
};

type ImageProvider = {
  readonly name: ProviderName;
  readonly generate: (entry: ManifestEntry, outputPath: string) => Promise<void>;
};

const PlaceholderPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

export async function run(options: CliOptions): Promise<void> {
  const manifest = createManifest();
  const batchDir = resolve(options.outDir, manifest.batchId);
  const manifestPath = join(batchDir, "manifest.json");
  await mkdir(batchDir, { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  if (options.availabilityOnly) {
    const availabilityPath = await writeAvailabilityManifest(batchDir);
    console.info(`Wrote availability manifest: ${availabilityPath}`);
    return;
  }

  if (options.planOnly) {
    console.info(`Wrote manifest: ${manifestPath}`);
    console.info(`Planned images: ${manifest.totalImages}`);
    return;
  }

  const provider = createProvider(options.provider);
  const entries =
    options.limit === undefined ? manifest.entries : manifest.entries.slice(0, options.limit);
  const counters = {
    generated: 0,
    skipped: 0,
  };

  await runWithConcurrency(entries, options.concurrency, async (entry) => {
    const outputPath = join(batchDir, entry.path);
    if (!options.force && existsSync(outputPath)) {
      counters.skipped += 1;
      return;
    }

    await mkdir(dirname(outputPath), { recursive: true });
    await provider.generate(entry, outputPath);
    counters.generated += 1;
    console.info(`[${provider.name}] ${entry.animal} #${entry.variant} -> ${outputPath}`);
  });

  console.info(`Generated: ${counters.generated}`);
  console.info(`Skipped existing: ${counters.skipped}`);
  console.info(`Manifest: ${manifestPath}`);
  console.info(`Availability manifest: ${await writeAvailabilityManifest(batchDir)}`);
}

export function parseArgs(args: readonly string[]): CliOptions {
  const values = new Map<string, string | true>();

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg?.startsWith("--")) continue;

    const key = arg.slice(2);
    const next = args[index + 1];
    if (next === undefined || next.startsWith("--")) {
      values.set(key, true);
      continue;
    }

    values.set(key, next);
    index += 1;
  }

  return {
    outDir: stringValue(values.get("out"), "generated"),
    provider: providerValue(values.get("provider")),
    planOnly: values.has("plan-only"),
    availabilityOnly: values.has("availability-only"),
    force: values.has("force"),
    concurrency: positiveInteger(values.get("concurrency"), 4),
    limit: optionalPositiveInteger(values.get("limit")),
  };
}

async function writeAvailabilityManifest(batchDir: string): Promise<string> {
  const manifest = createManifest();
  const availablePaths = new Set(
    manifest.entries
      .filter((entry) => existsSync(join(batchDir, entry.path)))
      .map((entry) => entry.path),
  );
  const availability = createAvailabilityManifest(manifest, availablePaths);
  const outputPath = join(dirname(batchDir), availabilityManifestKey(manifest.batchId));
  await writeFile(outputPath, `${JSON.stringify(availability, null, 2)}\n`);
  return outputPath;
}

function createProvider(name: ProviderName): ImageProvider {
  switch (name) {
    case "mock":
      return MockProvider;
    case "codex":
      return CodexProvider;
  }
}

const MockProvider: ImageProvider = {
  name: "mock",
  generate: async (_entry, outputPath) => {
    await writeFile(outputPath, PlaceholderPng);
  },
};

const CodexProvider: ImageProvider = {
  name: "codex",
  generate: async (entry, outputPath) => {
    const args = ["exec", "--cd", process.cwd(), "--dangerously-bypass-approvals-and-sandbox"];
    args.push(
      [
        "Generate exactly one PNG image file.",
        `Use this exact image prompt: ${JSON.stringify(entry.prompt)}.`,
        `Save the image exactly at: ${JSON.stringify(outputPath)}.`,
        "Do not edit source files or write any other artifacts.",
      ].join("\n"),
    );

    const { stdout, stderr, exitCode } = await spawnCodex(args);

    if (exitCode !== 0) {
      throw new Error(`codex image generation failed (${exitCode}):\n${stdout}\n${stderr}`);
    }

    if (!existsSync(outputPath)) {
      throw new Error(`codex completed but did not create ${outputPath}`);
    }
  },
};

function stringValue(value: string | true | undefined, fallback: string): string {
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

function providerValue(value: string | true | undefined): ProviderName {
  if (value === "codex" || value === "mock") return value;
  return "codex";
}

function optionalPositiveInteger(value: string | true | undefined): number | undefined {
  if (typeof value !== "string") return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function positiveInteger(value: string | true | undefined, fallback: number): number {
  return optionalPositiveInteger(value) ?? fallback;
}

async function runWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  runItem: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const workerCount = Math.max(1, Math.min(concurrency, items.length));

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      for (;;) {
        const index = cursor;
        cursor += 1;
        const item = items[index];
        if (item === undefined) return;
        await runItem(item);
      }
    }),
  );
}

function isMainModule(): boolean {
  return process.argv[1] === fileURLToPath(import.meta.url);
}

function spawnCodex(args: readonly string[]): Promise<{
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number | null;
}> {
  return new Promise((resolve, reject) => {
    const child = spawn("codex", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolve({
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
        exitCode,
      });
    });
  });
}

if (isMainModule()) {
  await run(parseArgs(process.argv.slice(2)));
}
