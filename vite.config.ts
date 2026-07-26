import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

const certificateDirectory = resolve(import.meta.dirname, ".certs");
const keyPath = resolve(certificateDirectory, "server-key.pem");
const certificatePath = resolve(certificateDirectory, "server.pem");
const forceHttp = process.env.WEBXR_LAB_HTTP === "1";
const reportDirectory = resolve(import.meta.dirname, "reports/local");

const https = !forceHttp && existsSync(keyPath) && existsSync(certificatePath)
  ? {
      key: readFileSync(keyPath),
      cert: readFileSync(certificatePath),
    }
  : undefined;

function localReportReceiver(): Plugin {
  const handler = (
    request: IncomingMessage,
    response: ServerResponse,
    next: () => void,
  ): void => {
    const requestUrl = new URL(request.url ?? "/", "https://webxr-lab.local");
    if (requestUrl.pathname !== "/api/reports") {
      next();
      return;
    }

    if (request.method !== "POST") {
      response.writeHead(405, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
      return;
    }

    const chunks: Buffer[] = [];
    let size = 0;
    let rejected = false;

    request.on("data", (chunk: Buffer) => {
      if (rejected) {
        return;
      }
      size += chunk.length;
      if (size > 1_000_000) {
        rejected = true;
        response.writeHead(413, { "content-type": "application/json" });
        response.end(JSON.stringify({ ok: false, error: "Report exceeds 1 MB." }));
        return;
      }
      chunks.push(chunk);
    });

    request.on("end", () => {
      if (rejected) {
        return;
      }

      try {
        const report = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
          schemaVersion?: unknown;
          generatedAt?: unknown;
        };
        if (report.schemaVersion !== 1 || typeof report.generatedAt !== "string") {
          throw new Error("Expected a WebXR-Lab schemaVersion 1 report.");
        }

        mkdirSync(reportDirectory, { recursive: true });
        const timestamp = new Date().toISOString().replaceAll(":", "-");
        const filename = `vision-pro-${timestamp}-${randomUUID().slice(0, 8)}.json`;
        writeFileSync(resolve(reportDirectory, filename), `${JSON.stringify(report, null, 2)}\n`, {
          encoding: "utf8",
          mode: 0o600,
        });

        response.writeHead(201, { "content-type": "application/json" });
        response.end(JSON.stringify({ ok: true, filename }));
      } catch (error) {
        response.writeHead(400, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    });
  };

  return {
    name: "webxr-lab-local-report-receiver",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

function localAssetCacheHeaders(): Plugin {
  return {
    name: "webxr-lab-local-asset-cache",
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(
          request.url ?? "/",
          "https://webxr-lab.local",
        ).pathname;
        if (
          /^\/assets\/.+-[A-Za-z0-9_-]{8,}\.(?:js|css)$/.test(pathname)
        ) {
          response.setHeader("cache-control", "public, max-age=31536000, immutable");
        } else if (pathname.startsWith("/assets/")) {
          response.setHeader("cache-control", "public, max-age=3600");
        }
        if (pathname.endsWith(".usdz")) {
          response.setHeader("content-type", "model/vnd.usdz+zip");
          response.setHeader("x-content-type-options", "nosniff");
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [localReportReceiver(), localAssetCacheHeaders()],
  server: {
    host: "0.0.0.0",
    port: 8443,
    strictPort: true,
    https,
  },
  preview: {
    host: "0.0.0.0",
    port: 8443,
    strictPort: true,
    https,
  },
  build: {
    target: "es2022",
    sourcemap: true,
    manifest: true,
    chunkSizeWarningLimit: 700,
  },
});
