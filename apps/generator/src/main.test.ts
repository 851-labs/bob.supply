import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vite-plus/test";
import { parseArgs, run } from "./main";
import { contentTypeForPath, parseUploadArgs } from "./upload";

describe("generator cli", () => {
  it("parses conservative defaults", () => {
    expect(parseArgs([])).toEqual({
      outDir: "generated",
      provider: "codex",
      planOnly: false,
      availabilityOnly: false,
      force: false,
      concurrency: 4,
      limit: undefined,
    });
  });

  it("writes manifest and mock images", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "bob-avatars-"));
    try {
      await run({
        outDir,
        provider: "mock",
        planOnly: false,
        availabilityOnly: false,
        force: false,
        concurrency: 2,
        limit: 2,
      });

      const manifest = JSON.parse(
        await readFile(join(outDir, "batch-001", "manifest.json"), "utf8"),
      ) as {
        readonly totalImages: number;
      };

      expect(manifest.totalImages).toBe(400);
      expect(await readFile(join(outDir, "batch-001", "siberian-cat", "01.png"))).toHaveLength(68);
      expect(await readFile(join(outDir, "batch-001", "siberian-cat", "02.png"))).toHaveLength(68);

      const availability = JSON.parse(
        await readFile(join(outDir, "batch-001", "available.json"), "utf8"),
      ) as {
        readonly totalImages: number;
        readonly entries: readonly { readonly path: string }[];
      };

      expect(availability.totalImages).toBe(2);
      expect(availability.entries.map((entry) => entry.path)).toEqual([
        "siberian-cat/01.png",
        "siberian-cat/02.png",
      ]);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });
});

describe("generated upload cli", () => {
  it("parses upload defaults", () => {
    expect(parseUploadArgs([])).toEqual({
      outDir: "generated",
      batchId: "batch-001",
      bucketName: "bob-supply",
    });
  });

  it("parses upload overrides", () => {
    expect(
      parseUploadArgs(["--out", "../../generated", "--batch", "batch-002", "--bucket", "test"]),
    ).toEqual({
      outDir: "../../generated",
      batchId: "batch-002",
      bucketName: "test",
    });
  });

  it("maps generated upload content types", () => {
    expect(contentTypeForPath("batch-001/available.json")).toBe("application/json; charset=utf-8");
    expect(contentTypeForPath("batch-001/siberian-cat/01.png")).toBe("image/png");
    expect(contentTypeForPath(".DS_Store")).toBeUndefined();
  });
});
