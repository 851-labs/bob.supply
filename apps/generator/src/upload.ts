import { readdir } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

type UploadOptions = {
  readonly outDir: string;
  readonly batchId: string;
  readonly bucketName: string;
};

export function parseUploadArgs(args: readonly string[]): UploadOptions {
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
    batchId: stringValue(values.get("batch"), "batch-001"),
    bucketName: stringValue(values.get("bucket"), "bob-supply"),
  };
}

export async function uploadGeneratedAssets(options: UploadOptions): Promise<number> {
  const batchDir = join(options.outDir, options.batchId);
  const files = await listFiles(batchDir);
  let uploaded = 0;

  for (const filePath of files) {
    if (filePath.endsWith(`${sep}.DS_Store`) || filePath === ".DS_Store") continue;

    const key = relative(options.outDir, filePath).split(sep).join("/");
    const contentType = contentTypeForPath(filePath);
    if (contentType === undefined) continue;

    await Bun.$`bunx wrangler r2 object put ${`${options.bucketName}/${key}`} --file ${filePath} --content-type ${contentType} --remote`;
    uploaded += 1;
  }

  return uploaded;
}

export async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return await listFiles(path);
      if (entry.isFile()) return [path];
      return [];
    }),
  );

  return files.flat().sort((left, right) => left.localeCompare(right));
}

export function contentTypeForPath(path: string): string | undefined {
  switch (extname(path)) {
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    default:
      return undefined;
  }
}

function stringValue(value: string | true | undefined, fallback: string): string {
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

function isMainModule(): boolean {
  return process.argv[1] === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  const options = parseUploadArgs(process.argv.slice(2));
  const uploaded = await uploadGeneratedAssets(options);
  console.info(
    `Uploaded ${uploaded} generated assets to r2://${options.bucketName}/${options.batchId}/`,
  );
}
