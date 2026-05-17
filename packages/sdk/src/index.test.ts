import { describe, expect, it } from "vite-plus/test";
import { DefaultBobAvatarBaseUrl, bobAvatarUrl } from "./index";

describe("bobAvatarUrl", () => {
  it("builds an absolute PNG URL by default", () => {
    expect(bobAvatarUrl("alice")).toBe(`${DefaultBobAvatarBaseUrl}/alice?format=png`);
  });

  it("encodes seeds as path segments", () => {
    expect(bobAvatarUrl("alice bob")).toBe(`${DefaultBobAvatarBaseUrl}/alice%20bob?format=png`);
  });

  it("rejects empty seeds", () => {
    expect(() => bobAvatarUrl(" ")).toThrow(TypeError);
  });
});
