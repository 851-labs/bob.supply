import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, type Plugin } from "vite";
import { handlePfpRequest } from "./src/pfp";

const appDir = dirname(fileURLToPath(import.meta.url));
const generatedDir = resolve(appDir, "../../generated");

export default defineConfig({
  server: {
    allowedHosts: ["tuftlords-macbook-pro.tail6fc9a.ts.net"],
    port: 3001,
  },
  plugins: [pfpApi(), generatedAssets(), nitro(), tailwindcss(), tanstackStart(), react()],
});

function pfpApi(): Plugin {
  return {
    name: "bob-pfp-api",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (!request.url) {
          next();
          return;
        }

        const pfpResponse = await handlePfpRequest(
          new Request(new URL(request.url, "http://localhost"), {
            method: request.method,
            headers: request.headers as HeadersInit,
          }),
        );
        if (pfpResponse === undefined) {
          next();
          return;
        }

        response.statusCode = pfpResponse.status;
        pfpResponse.headers.forEach((value, key) => response.setHeader(key, value));
        response.end(Buffer.from(await pfpResponse.arrayBuffer()));
      });
    },
  };
}

function generatedAssets(): Plugin {
  return {
    name: "bob-generated-assets",
    configureServer(server) {
      server.middlewares.use("/generated", async (request, response, next) => {
        if (!request.url) {
          next();
          return;
        }

        const pathname = new URL(request.url, "http://localhost").pathname;
        const filePath = normalize(join(generatedDir, decodeURIComponent(pathname)));
        if (!filePath.startsWith(`${generatedDir}${sep}`)) {
          response.statusCode = 403;
          response.end("Forbidden");
          return;
        }

        try {
          const fileStat = await stat(filePath);
          if (!fileStat.isFile()) {
            next();
            return;
          }

          response.setHeader("Content-Type", contentType(filePath));
          response.setHeader("Content-Length", String(fileStat.size));
          createReadStream(filePath).pipe(response);
        } catch {
          next();
        }
      });
    },
  };
}

function contentType(filePath: string): string {
  switch (extname(filePath)) {
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    default:
      return "application/octet-stream";
  }
}
