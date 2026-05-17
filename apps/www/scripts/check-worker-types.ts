import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmpDirectory = await mkdtemp(join(tmpdir(), "bob-worker-types-"));
const tmpFile = join(tmpDirectory, "worker-configuration.d.ts");

try {
  const result = Bun.spawnSync([
    "wrangler",
    "types",
    tmpFile,
    "--config",
    ".output/server/wrangler.json",
    "--env-interface",
    "CloudflareEnv",
  ]);

  if (result.exitCode !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.exitCode);
  }

  const [expected, actual] = await Promise.all([
    readFile("src/worker-configuration.d.ts", "utf8"),
    readFile(tmpFile, "utf8"),
  ]);

  if (stripGeneratedCommand(expected) !== stripGeneratedCommand(actual)) {
    process.stderr.write(
      "Worker binding types are out of date. Run `bun run --cwd apps/www typegen`.\n",
    );
    process.exit(1);
  }
} finally {
  await rm(tmpDirectory, { recursive: true, force: true });
}

function stripGeneratedCommand(value: string): string {
  return value.split("\n").slice(1).join("\n");
}
