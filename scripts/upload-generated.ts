import { readdir } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";
import { $ } from "bun";

const BucketName = "bob-supply";
const GeneratedDir = "generated";
const ActiveBatchId = "batch-001";
const BatchDir = join(GeneratedDir, ActiveBatchId);

const files = await listFiles(BatchDir);
let uploaded = 0;

for (const filePath of files) {
  if (filePath.endsWith(`${sep}.DS_Store`) || filePath === ".DS_Store") continue;

  const key = relative(GeneratedDir, filePath).split(sep).join("/");
  const contentType = contentTypeForPath(filePath);
  if (contentType === undefined) continue;

  await $`bunx wrangler r2 object put ${`${BucketName}/${key}`} --file ${filePath} --content-type ${contentType} --remote`;
  uploaded += 1;
}

console.info(`Uploaded ${uploaded} generated assets to r2://${BucketName}/${ActiveBatchId}/`);

async function listFiles(dir: string): Promise<string[]> {
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

function contentTypeForPath(path: string): string | undefined {
  switch (extname(path)) {
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    default:
      return undefined;
  }
}
