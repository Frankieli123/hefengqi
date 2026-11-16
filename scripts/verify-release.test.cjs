const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { test } = require("node:test");

const root = path.resolve(__dirname, "..");
const fixtureRoot = path.join(root, ".release-tests");
fs.mkdirSync(fixtureRoot, { recursive: true });
const required = [
  "/[locale]/page", "/[locale]/products/[slug]/page", "/[locale]/news/page", "/[locale]/solutions/page",
  "/[locale]/support/troubleshooting/page", "/[locale]/support/troubleshooting/[brand]/[model]/page",
  "/admin/(dashboard)/(secure)/analytics/page", "/admin/(dashboard)/(secure)/customer-service/page",
  "/api/customer-service/conversations/route", "/api/customer-service/conversations/[id]/messages/route", "/u/api/send/route",
];
const suffixes = [
  "规格参数、现货库存与批发报价",
  "Технические характеристики, склад и оптовая цена",
  "Datasheet, Specs, Stock & Wholesale Price",
];

function fixture() {
  const dist = fs.mkdtempSync(path.join(fixtureRoot, "gate-"));
  const product = path.join(dist, "server/app/[locale]/products/[slug]/page.js");
  const chunk = path.join(dist, "server/chunks/product.js");
  fs.mkdirSync(path.dirname(product), { recursive: true });
  fs.mkdirSync(path.dirname(chunk), { recursive: true });
  fs.writeFileSync(path.join(dist, "server/app-paths-manifest.json"), JSON.stringify(Object.fromEntries(required.map((route) => [route, `app${route}.js`]))));
  fs.writeFileSync(path.join(dist, "required-server-files.json"), JSON.stringify({ config: { typescript: { ignoreBuildErrors: false } } }));
  fs.writeFileSync(product, "module.exports = {};\n");
  fs.writeFileSync(chunk, "module.exports = 'CMS product title';\n");
  fs.writeFileSync(`${product}.nft.json`, JSON.stringify({ version: 1, files: [path.relative(path.dirname(product), chunk)] }));
  return { dist, product, chunk };
}

function verify(dist) {
  return spawnSync(process.execPath, [path.join(__dirname, "verify-release.cjs"), dist], { encoding: "utf8" });
}

test("accepts all eleven routes with TS enabled and a clean product graph", () => {
  const { dist } = fixture();
  const result = verify(dist);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /11/);
});

for (const [index, suffix] of suffixes.entries()) {
  test(`rejects legacy language suffix ${index + 1} in an actual product chunk`, () => {
    const { dist, chunk } = fixture();
    fs.writeFileSync(chunk, `module.exports = ${JSON.stringify(`MODEL | ${suffix}`)};\n`);
    const result = verify(dist);
    assert.notEqual(result.status, 0, "bad compiled product artifact was accepted");
    assert.match(result.stderr, /legacy commercial suffix/i);
  });
}

test("rejects a Unicode-escaped legacy suffix in the product route itself", () => {
  const { dist, product } = fixture();
  const escaped = [...suffixes[0]].map((character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`).join("");
  fs.writeFileSync(product, `module.exports = "MODEL | ${escaped}";\n`);
  const result = verify(dist);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /legacy commercial suffix/i);
});

test("does not scan test fixtures, source files or unrelated route/chunk text", () => {
  const { dist } = fixture();
  fs.mkdirSync(path.join(dist, "tests"));
  fs.writeFileSync(path.join(dist, "tests/title.test.js"), suffixes.join("\n"));
  fs.writeFileSync(path.join(dist, "server/chunks/unrelated.js"), suffixes.join("\n"));
  assert.equal(verify(dist).status, 0);
});

test("refuses an incomplete product trace rather than skipping the scan", () => {
  const { dist, chunk } = fixture();
  fs.renameSync(chunk, `${chunk}.preserved`);
  const result = verify(dist);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing.*product|product.*missing/i);
});

test("keeps the existing missing-feature route gate", () => {
  const { dist } = fixture();
  const file = path.join(dist, "server/app-paths-manifest.json");
  const routes = JSON.parse(fs.readFileSync(file));
  delete routes[required[0]];
  fs.writeFileSync(file, JSON.stringify(routes));
  assert.notEqual(verify(dist).status, 0);
});

test("keeps the existing TypeScript build gate", () => {
  const { dist } = fixture();
  fs.writeFileSync(path.join(dist, "required-server-files.json"), JSON.stringify({ config: { typescript: { ignoreBuildErrors: true } } }));
  assert.notEqual(verify(dist).status, 0);
});
