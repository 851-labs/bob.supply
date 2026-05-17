import { defineConfig } from "nitro";

export default defineConfig({
  compatibilityDate: "2026-05-16",
  preset: "cloudflare_module",
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
