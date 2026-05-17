import { defineConfig } from "vite-plus";

export default defineConfig({
  resolve: {
    alias: {
      "@bob-supply/sdk": new URL("../sdk/src/index.ts", import.meta.url).pathname,
    },
  },
  pack: {
    entry: ["src/index.tsx"],
    dts: true,
    format: ["esm"],
  },
  test: {
    globals: false,
  },
});
