import { beforeEach, describe, expect, it } from "vitest";
import { createAvailabilityManifest, createManifest } from "@bob-avatars/core";
import {
  clearPfpAvailabilityCache,
  handlePfpRequest,
  seedFromPath,
  type AvatarStorage,
} from "./pfp";

const PngBytes = new Uint8Array([137, 80, 78, 71]);

describe("pfp api", () => {
  beforeEach(() => {
    clearPfpAvailabilityCache();
  });

  it("extracts raw decoded seeds from image paths", () => {
    expect(seedFromPath("/pfp/Alice")).toBe("Alice");
    expect(seedFromPath("/pfp/alice%20smith")).toBe("alice smith");
    expect(seedFromPath("/pfp/")).toBeUndefined();
    expect(seedFromPath("/pfp/alice/avatar")).toBeUndefined();
    expect(seedFromPath("/avatar/Alice")).toBeUndefined();
  });

  it("returns deterministic png responses for available avatars", async () => {
    const response = await handlePfpRequest(
      new Request("https://example.com/pfp/alice?format=png&size=256"),
      {},
      storageWithAvailability(),
    );

    expect(response?.status).toBe(200);
    expect(response?.headers.get("Content-Type")).toBe("image/png");
    expect(response?.headers.get("Cache-Control")).toBe("public, max-age=86400");
    expect(response?.headers.get("X-Bob-Avatars-Batch")).toBe("batch-001");
    expect(response?.headers.get("X-Bob-Avatars-Key")).toMatch(/^batch-001\/.+\/0[12]\.png$/);
    await expect(response?.arrayBuffer()).resolves.toHaveProperty("byteLength", PngBytes.length);
  });

  it("returns undefined for non-pfp routes", async () => {
    await expect(
      handlePfpRequest(new Request("https://example.com/"), {}, storageWithAvailability()),
    ).resolves.toBeUndefined();
  });

  it("rejects non-get pfp requests", async () => {
    const response = await handlePfpRequest(
      new Request("https://example.com/pfp/alice", { method: "POST" }),
      {},
      storageWithAvailability(),
    );

    expect(response?.status).toBe(405);
    expect(response?.headers.get("Allow")).toBe("GET");
  });

  it("rejects unsupported formats", async () => {
    const response = await handlePfpRequest(
      new Request("https://example.com/pfp/alice?format=webp"),
      {},
      storageWithAvailability(),
    );

    expect(response?.status).toBe(400);
  });

  it("returns 503 when availability is unavailable", async () => {
    const response = await handlePfpRequest(
      new Request("https://example.com/pfp/alice"),
      {},
      {
        sourceId: "missing",
        getText: async () => undefined,
        getImage: async () => PngBytes,
      },
    );

    expect(response?.status).toBe(503);
  });

  it("returns 502 when the selected image is missing", async () => {
    const response = await handlePfpRequest(
      new Request("https://example.com/pfp/alice"),
      {},
      storageWithAvailability({ imageMissing: true }),
    );

    expect(response?.status).toBe(502);
  });
});

function storageWithAvailability(options: { readonly imageMissing?: boolean } = {}): AvatarStorage {
  const manifest = createManifest({
    animals: ["siberian cat", "orange tabby cat"],
    variantsPerAnimal: 2,
  });
  const availability = createAvailabilityManifest(
    manifest,
    new Set(manifest.entries.map((entry) => entry.path)),
  );

  return {
    sourceId: `test-${options.imageMissing ? "missing-image" : "ok"}`,
    getText: async () => `${JSON.stringify(availability)}\n`,
    getImage: async () => (options.imageMissing ? undefined : PngBytes),
  };
}
