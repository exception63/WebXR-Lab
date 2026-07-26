import { createReadStream, existsSync, statSync } from "node:fs";
import { networkInterfaces, hostname } from "node:os";
import { resolve } from "node:path";
import { createServer } from "node:http";

const projectRoot = resolve(import.meta.dirname, "..");
const profilePath = resolve(projectRoot, ".certs", "WebXR-Lab-Root-CA.mobileconfig");
const port = Number.parseInt(process.env.WEBXR_LAB_PROFILE_PORT ?? "8080", 10);
const host = "0.0.0.0";

if (!existsSync(profilePath)) {
  console.error("Certificate profile is missing. Run `pnpm certs` first.");
  process.exit(1);
}

const page = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>WebXR-Lab 证书安装</title>
  <style>
    :root { color-scheme: light dark; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0c1020; color: #f7f8ff; }
    main { width: min(42rem, calc(100% - 2rem)); box-sizing: border-box; padding: 2rem; border: 1px solid #364064; border-radius: 1.5rem; background: #151b31; }
    h1 { margin-top: 0; font-size: clamp(1.7rem, 6vw, 2.6rem); }
    p, li { line-height: 1.6; color: #d8ddf0; }
    a { display: block; margin: 1.5rem 0; padding: 1rem; border-radius: 999px; background: #7ae7ff; color: #071018; text-align: center; font-weight: 700; text-decoration: none; }
    code { color: #9fffc8; }
  </style>
</head>
<body>
  <main>
    <h1>WebXR-Lab 本地证书</h1>
    <p>此页面来自你的 Mac，仅安装 WebXR-Lab 的公开开发根证书，不包含私钥。</p>
    <a href="/WebXR-Lab-Root-CA.mobileconfig">下载描述文件</a>
    <ol>
      <li>允许下载后，立即打开 Vision Pro 的“设置”。</li>
      <li>在账户信息下方点按“已下载描述文件”，然后点右上角“安装”。</li>
      <li>再到“通用 → 关于本机 → 证书信任设置”，启用完全信任。</li>
    </ol>
    <p>待安装描述文件会在约 8 分钟后被系统自动删除。</p>
  </main>
</body>
</html>`;

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (request.method === "GET" && requestUrl.pathname === "/") {
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(page);
    return;
  }

  if (
    request.method === "GET" &&
    requestUrl.pathname === "/WebXR-Lab-Root-CA.mobileconfig"
  ) {
    response.writeHead(200, {
      "Content-Type": "application/x-apple-aspen-config",
      "Content-Disposition": 'attachment; filename="WebXR-Lab-Root-CA.mobileconfig"',
      "Content-Length": statSync(profilePath).size,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    createReadStream(profilePath).pipe(response);
    return;
  }

  response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("Not found");
});

server.listen(port, host, () => {
  const localHostName = hostname().replace(/\.local$/i, "");
  const addresses = new Set([`${localHostName}.local`]);

  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) {
        addresses.add(entry.address);
      }
    }
  }

  console.log("WebXR-Lab certificate profile server is ready.");
  console.log("Open one of these addresses in Vision Pro Safari:");
  for (const address of addresses) {
    console.log(`  http://${address}:${port}`);
  }
  console.log("\nThis server exposes only the public .mobileconfig profile.");
});

