/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const copies = [
  { source: ".next/static", destination: ".next/standalone/.next/static" },
  { source: "public", destination: ".next/standalone/public" },
  { source: ".next/server", destination: ".next/standalone/.next/server" },
];

const requiredAfterCopy = [
  ".next/standalone/server.js",
  ".next/standalone/.next/server",
  ".next/standalone/.next/server/pages-manifest.json",
  ".next/standalone/.next/static",
  ".next/standalone/public",
];

function assertExists(target) {
  if (!fs.existsSync(target)) {
    throw new Error(`Required standalone artifact is missing: ${target}`);
  }
}

try {
  assertExists(".next/standalone/server.js");
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
