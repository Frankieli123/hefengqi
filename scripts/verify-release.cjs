/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const dist = process.argv[2];
assert(dist, "Pass the standalone build's dist directory");
const routes = JSON.parse(fs.readFileSync(path.join(dist, "server/app-paths-manifest.json"), "utf8"));
const required = [
  "/[locale]/page",
  "/[locale]/products/[slug]/page",
  "/[locale]/news/page",
  "/[locale]/solutions/page",
  "/[locale]/support/troubleshooting/page",
  "/[locale]/support/troubleshooting/[brand]/[model]/page",
  "/admin/(dashboard)/(secure)/analytics/page",
  "/admin/(dashboard)/(secure)/customer-service/page",
  "/api/customer-service/conversations/route",
  "/api/customer-service/conversations/[id]/messages/route",
  "/u/api/send/route",
];
const missing = required.filter((route) => !routes[route]);
assert.equal(missing.length, 0, `Release is missing required features: ${missing.join(", ")}`);
const { config } = JSON.parse(fs.readFileSync(path.join(dist, "required-server-files.json"), "utf8"));
assert.notEqual(config.typescript?.ignoreBuildErrors, true, "Releases must not skip TypeScript validation");
console.log(`Verified ${required.length} required release routes and TypeScript build gate`);
