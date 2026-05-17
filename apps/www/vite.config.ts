import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite-plus";

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@bob-supply/sdk": new URL("../../packages/sdk/src/index.ts", import.meta.url).pathname,
    },
  },
  plugins: [
    nitro({
      compatibilityDate: "2026-05-16",
      preset: "cloudflare_module",
      cloudflare: {
        deployConfig: true,
        nodeCompat: true,
        wrangler: {
          name: "bob-supply",
          compatibility_date: "2026-05-16",
          observability: {
            enabled: true,
          },
          routes: [
            {
              pattern: "bob.supply",
              custom_domain: true,
            },
          ],
          r2_buckets: [
            {
              binding: "BOB_SUPPLY_BUCKET",
              bucket_name: "bob-supply",
            },
          ],
        },
      },
    }),
    tailwindcss(),
    tanstackStart(),
    react(),
  ],
});
