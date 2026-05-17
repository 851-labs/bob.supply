import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "nitro";

const appDir = dirname(fileURLToPath(import.meta.url));
const generatedDir = resolve(appDir, "../../generated");
const batchDir = join(generatedDir, "batch-001");

export default defineConfig({
  compatibilityDate: "2026-05-16",
  preset: "cloudflare_module",
  publicAssets: [
    {
      baseURL: "generated/batch-001",
      dir: batchDir,
      maxAge: 60 * 60 * 24 * 365,
    },
  ],
  cloudflare: {
    deployConfig: true,
    nodeCompat: true,
    wrangler: {
      name: "bob-avatars-www",
      compatibility_date: "2026-05-16",
      r2_buckets: [
        {
          binding: "BOB_SUPPLY_BUCKET",
          bucket_name: "bob-supply",
        },
      ],
    },
  },
});
