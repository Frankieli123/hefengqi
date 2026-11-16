/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const distDir = process.env.NEXT_DIST_DIR || ".next";
const standaloneDir = path.join(distDir, "standalone");
const standaloneDistDir = path.join(standaloneDir, distDir);

const copies = [
  { source: path.join(distDir, "static"), destination: path.join(standaloneDistDir, "static") },
  { source: "public", destination: path.join(standaloneDir, "public") },
  { source: path.join(distDir, "server"), destination: path.join(standaloneDistDir, "server") },
];

const requiredAfterCopy = [
  path.join(standaloneDir, "server.js"),
  standaloneDistDir,
  path.join(standaloneDistDir, "server/pages-manifest.json"),
  path.join(standaloneDistDir, "static"),
  path.join(standaloneDir, "public"),
];

function assertExists(target) {
  if (!fs.existsSync(target)) {
    throw new Error(`Required standalone artifact is missing: ${target}`);
  }
}

try {
  assertExists(path.join(standaloneDir, "server.js"));
  copies.forEach(({ source }) => assertExists(source));
  for (const { source, destination } of copies) {
    fs.rmSync(destination, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.cpSync(source, destination, { recursive: true, force: true, errorOnExist: false });
  }
  requiredAfterCopy.forEach(assertExists);
  console.log("Standalone assets and server chunks copied and verified successfully.");
} catch (err) {
  console.error("Failed to copy standalone assets:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
