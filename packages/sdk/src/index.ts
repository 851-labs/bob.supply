export const DefaultBobAvatarBaseUrl = "https://bob.supply";

export type BobAvatarFormat = "png";

export type BobAvatarUrlOptions = {
  readonly format?: BobAvatarFormat;
};

function isBobAvatarSeed(seed: string): boolean {
  return seed.trim().length > 0;
}

export function bobAvatarUrl(seed: string, options: BobAvatarUrlOptions = {}): string {
  if (!isBobAvatarSeed(seed)) {
    throw new TypeError("Bob avatar seed must not be empty.");
  }

  const path = `/${encodeURIComponent(seed)}`;
  const url = new URL(path, DefaultBobAvatarBaseUrl);
  url.searchParams.set("format", options.format ?? "png");
  return url.toString();
}
