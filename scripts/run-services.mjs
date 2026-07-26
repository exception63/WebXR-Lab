import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const viteCli = resolve(projectRoot, "node_modules", "vite", "bin", "vite.js");
const setupCertificates = resolve(import.meta.dirname, "setup-certs.mjs");
const serveProfile = resolve(import.meta.dirname, "serve-profile.mjs");
const serveCollaboration = resolve(import.meta.dirname, "serve-collaboration.mjs");
const packageManager = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

if (!existsSync(viteCli)) {
  console.error("Dependencies are missing. Run `pnpm install` first.");
  process.exit(1);
}

const certificateResult = spawnSync(process.execPath, [setupCertificates], {
  cwd: projectRoot,
  stdio: "inherit",
});
if (certificateResult.status !== 0) {
  process.exit(certificateResult.status ?? 1);
}

const buildId = `local-${new Date()
  .toISOString()
  .replaceAll("-", "")
  .replaceAll(":", "")
  .replace(/\.\d{3}Z$/, "Z")}`;
console.log(`\nBuilding field-test version ${buildId}...`);
const buildResult = spawnSync(packageManager, ["build"], {
  cwd: projectRoot,
  env: {
    ...process.env,
    VITE_BUILD_ID: buildId,
  },
  stdio: "inherit",
});
if (buildResult.status !== 0) {
  process.exit(buildResult.status ?? 1);
}

console.log(
  "\nStarting the certificate page, production WebXR HTTPS preview, and WSS room.",
);
console.log("Press Control+C once to stop all three services.\n");

const children = [
  spawn(process.execPath, [serveProfile], {
    cwd: projectRoot,
    stdio: "inherit",
  }),
  spawn(process.execPath, [serveCollaboration], {
    cwd: projectRoot,
    stdio: "inherit",
  }),
  spawn(
    process.execPath,
    [viteCli, "preview", "--host", "0.0.0.0", "--port", "8443"],
    {
      cwd: projectRoot,
      stdio: "inherit",
    },
  ),
];

let stopping = false;

const stopAll = (exitCode = 0) => {
  if (stopping) {
    return;
  }
  stopping = true;
  console.log("\nStopping all WebXR-Lab services...");
  for (const child of children) {
    if (child.exitCode === null && !child.killed) {
      child.kill("SIGTERM");
    }
  }
  setTimeout(() => process.exit(exitCode), 500);
};

for (const child of children) {
  child.on("error", (error) => {
    console.error(error.message);
    stopAll(1);
  });
  child.on("exit", (code, signal) => {
    if (!stopping) {
      console.error(`A service stopped unexpectedly (${signal ?? `exit ${code ?? 1}`}).`);
      stopAll(code ?? 1);
    }
  });
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
