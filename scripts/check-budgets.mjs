import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const projectRoot = resolve(import.meta.dirname, "..");
const distDirectory = resolve(projectRoot, "dist");
const limits = {
  largestJavaScriptBytes: 700_000,
  largestJavaScriptGzipBytes: 190_000,
  lazyChunkBytes: 50_000,
  cssGzipBytes: 15_000,
  usdzBytes: 10_000_000,
};

function filesWithin(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? filesWithin(path) : [path];
  });
}

const files = filesWithin(distDirectory);
const javascript = files
  .filter((file) => extname(file) === ".js")
  .map((file) => {
    const content = readFileSync(file);
    return {
      file,
      bytes: content.byteLength,
      gzipBytes: gzipSync(content).byteLength,
    };
  })
  .sort((left, right) => right.bytes - left.bytes);
const css = files
  .filter((file) => extname(file) === ".css")
  .map((file) => {
    const content = readFileSync(file);
    return { file, gzipBytes: gzipSync(content).byteLength };
  });
const usdz = files
  .filter((file) => extname(file) === ".usdz")
  .map((file) => ({ file, bytes: statSync(file).size }));

const failures = [];
const largestJavaScript = javascript[0];
if (!largestJavaScript) {
  failures.push("No JavaScript output was found.");
} else {
  if (largestJavaScript.bytes > limits.largestJavaScriptBytes) {
    failures.push(
      `Largest JS is ${largestJavaScript.bytes} B (limit ${limits.largestJavaScriptBytes} B).`,
    );
  }
  if (largestJavaScript.gzipBytes > limits.largestJavaScriptGzipBytes) {
    failures.push(
      `Largest JS gzip is ${largestJavaScript.gzipBytes} B (limit ${limits.largestJavaScriptGzipBytes} B).`,
    );
  }
}

for (const chunk of javascript.slice(1)) {
  if (chunk.bytes > limits.lazyChunkBytes) {
    failures.push(
      `${relative(distDirectory, chunk.file)} is ${chunk.bytes} B (lazy limit ${limits.lazyChunkBytes} B).`,
    );
  }
}
for (const stylesheet of css) {
  if (stylesheet.gzipBytes > limits.cssGzipBytes) {
    failures.push(
      `${relative(distDirectory, stylesheet.file)} gzip is ${stylesheet.gzipBytes} B (limit ${limits.cssGzipBytes} B).`,
    );
  }
}
for (const asset of usdz) {
  if (asset.bytes > limits.usdzBytes) {
    failures.push(
      `${relative(distDirectory, asset.file)} is ${asset.bytes} B (USDZ limit ${limits.usdzBytes} B).`,
    );
  }
}

console.log("WebXR-Lab resource budget");
console.log(
  `  main JS: ${largestJavaScript?.bytes ?? 0} B / ${largestJavaScript?.gzipBytes ?? 0} B gzip`,
);
console.log(`  lazy JS chunks: ${Math.max(0, javascript.length - 1)}`);
console.log(`  CSS files: ${css.length}`);
console.log(`  USDZ files: ${usdz.length}`);

if (failures.length > 0) {
  console.error("\nBudget failures:");
  failures.forEach((failure) => console.error(`  - ${failure}`));
  process.exit(1);
}

console.log("  status: PASS");
