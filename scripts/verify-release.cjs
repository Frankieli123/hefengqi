const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

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
const legacySuffixes = [
  "规格参数、现货库存与批发报价",
  "Технические характеристики, склад и оптовая цена",
  "Datasheet, Specs, Stock & Wholesale Price",
];

function verifyRelease(directory) {
  assert(directory, "Pass the standalone build's dist directory");
  const dist = path.resolve(directory);
  const routes = JSON.parse(fs.readFileSync(path.join(dist, "server/app-paths-manifest.json"), "utf8"));
  const missing = required.filter((route) => !routes[route]);
  assert.equal(missing.length, 0, `Release is missing required features: ${missing.join(", ")}`);
  const { config } = JSON.parse(fs.readFileSync(path.join(dist, "required-server-files.json"), "utf8"));
  assert.notEqual(config.typescript?.ignoreBuildErrors, true, "Releases must not skip TypeScript validation");
  const server = path.join(dist, "server");
  const product = path.resolve(server, routes["/[locale]/products/[slug]/page"]);
  assert(product.startsWith(`${server}${path.sep}`), "Product route escapes server directory");
  assert(fs.existsSync(product), "Missing product route");
  assert(fs.existsSync(`${product}.nft.json`), "Missing product trace");
  const trace = JSON.parse(fs.readFileSync(`${product}.nft.json`, "utf8"));
  assert(Array.isArray(trace.files), "Missing product trace files");
  const files = new Set([product]);
  for (const relative of trace.files) {
    const file = path.resolve(path.dirname(product), relative);
    if (file.startsWith(`${server}${path.sep}`) && file.endsWith(".js")) {
      assert(fs.existsSync(file), `Missing product trace dependency: ${path.relative(dist, file)}`);
      files.add(file);
    }
  }
  for (const file of files) {
    const code = fs.readFileSync(file, "utf8")
      .replace(/\\u\{([0-9a-f]+)\}|\\u([0-9a-f]{4})|\\x([0-9a-f]{2})/gi, (_, point, unicode, hex) => String.fromCodePoint(parseInt(point ?? unicode ?? hex, 16)))
      .toLowerCase();
    assert(!legacySuffixes.some((suffix) => code.includes(suffix.toLowerCase())), `Legacy commercial suffix in product artifact: ${path.relative(dist, file)}`);
  }
  return { routes: required.length, productFiles: files.size, typescript: "enabled" };
}

if (require.main === module) {
  const result = verifyRelease(process.argv[2]);
  console.log(`Verified ${result.routes} required release routes, TypeScript build gate and ${result.productFiles} product route/chunks`);
}

module.exports = { verifyRelease };
