import { describe, expect, it } from "vite-plus/test";
import {
  Animals,
  PromptTemplate,
  animalSlug,
  avatarObjectKey,
  availabilityManifestKey,
  createAvailabilityManifest,
  createManifest,
  promptForAnimal,
  selectAvatarForSeed,
} from "./index";

describe("batch planning", () => {
  it("has 100 animals", () => {
    expect(Animals).toHaveLength(100);
  });

  it("uses the exact prompt template", () => {
    expect(PromptTemplate).toBe(
      "create a pfp for a {animal} in cartoon bobs burgers style with solid background",
    );
    expect(promptForAnimal("siberian cat")).toBe(
      "create a pfp for a siberian cat in cartoon bobs burgers style with solid background",
    );
  });

  it("creates 4 variants for each animal", () => {
    const manifest = createManifest();
    expect(manifest.totalImages).toBe(400);
    expect(manifest.entries.filter((entry) => entry.animal === "siberian cat")).toHaveLength(4);
  });

  it("creates stable animal slugs", () => {
    expect(animalSlug("Siberian Cat")).toBe("siberian-cat");
  });

  it("creates a sorted availability manifest from existing paths", () => {
    const manifest = createManifest({
      animals: ["siberian cat", "orange tabby cat"],
      variantsPerAnimal: 2,
    });
    const availability = createAvailabilityManifest(
      manifest,
      new Set(["siberian-cat/02.png", "orange-tabby-cat/01.png"]),
    );

    expect(availability).toMatchObject({
      batchId: "batch-001",
      totalImages: 2,
    });
    expect(availability.entries.map((entry) => entry.path)).toEqual([
      "orange-tabby-cat/01.png",
      "siberian-cat/02.png",
    ]);
  });

  it("creates stable R2 object keys", () => {
    const [entry] = createManifest({ animals: ["siberian cat"], variantsPerAnimal: 1 }).entries;

    expect(availabilityManifestKey("batch-001")).toBe("batch-001/available.json");
    expect(avatarObjectKey("batch-001", entry)).toBe("batch-001/siberian-cat/01.png");
  });

  it("selects the same avatar for the same raw seed", async () => {
    const manifest = createManifest({
      animals: ["siberian cat", "orange tabby cat"],
      variantsPerAnimal: 2,
    });
    const availability = createAvailabilityManifest(
      manifest,
      new Set(manifest.entries.map((entry) => entry.path)),
    );

    await expect(selectAvatarForSeed("Alice", availability)).resolves.toEqual(
      await selectAvatarForSeed("Alice", availability),
    );
  });

  it("uses raw UTF-8 seeds without trimming or lowercasing", async () => {
    const manifest = createManifest({
      animals: ["siberian cat", "orange tabby cat"],
      variantsPerAnimal: 2,
    });
    const availability = createAvailabilityManifest(
      manifest,
      new Set(manifest.entries.map((entry) => entry.path)),
    );

    await expect(selectAvatarForSeed("Alice", availability)).resolves.not.toEqual(
      await selectAvatarForSeed("alice", availability),
    );
  });
});
