import { defineConfig } from "vite-plus";

export default defineConfig({
  resolve: {
    alias: {
      "@bob-supply/react": new URL("./packages/react/src/index.tsx", import.meta.url).pathname,
      "@bob-supply/sdk": new URL("./packages/sdk/src/index.ts", import.meta.url).pathname,
    },
  },
  fmt: {
    ignorePatterns: ["apps/www/src/routeTree.gen.ts", "apps/www/src/worker-configuration.d.ts"],
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
});
