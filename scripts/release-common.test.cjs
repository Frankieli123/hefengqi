const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { test } = require("node:test");
const { root, assertIdentity, acquireLock, inventory, offlineEnvironment, verifyTraces, completeTraces } = require("./release-common.cjs");

const fixtures = path.join(root, ".release-tests");
fs.mkdirSync(fixtures, { recursive: true });
function fixture() { return fs.mkdtempSync(path.join(fixtures, "identity-")); }
const identity = { commit: "committed-head", status: "", sourceDigest: "source-sha256" };

test("refuses dirty and untracked release inputs", () => {
  for (const status of [" M src/page.tsx", "?? uncommitted.ts", "M  package.json"]) {
    assert.throws(() => assertIdentity({ ...identity, status }), /clean and committed/);
  }
});

test("refuses HEAD changes during build or packaging", () => {
  assert.throws(() => assertIdentity({ ...identity, commit: "new-head" }, identity), /HEAD changed/);
});

test("refuses source digest changes even with an unchanged HEAD", () => {
  assert.throws(() => assertIdentity({ ...identity, sourceDigest: "other-sha256" }, identity), /digest changed/);
});

test("locks both build and packaging against concurrent operations", () => {
  const directory = fixture();
  const unlock = acquireLock(directory);
  assert.throws(() => acquireLock(directory), /Parallel release refused/);
  assert(fs.existsSync(path.join(directory, ".release-operation.lock/owner.json")));
  unlock();
  const nextUnlock = acquireLock(directory);
  nextUnlock();
});

test("does not inherit production credentials or DB URLs into validation", () => {
  const environment = offlineEnvironment(fixture());
  assert.match(environment.DATABASE_URL, /127\.0\.0\.1:1\/ricewind_build_only/);
  assert.equal(environment.ANALYTICS_DB_TEST, "0");
  assert.equal(environment.DEMO_MODE, "false");
  for (const key of ["OPENAI_API_KEY", "BETTER_AUTH_SECRET", "UMAMI_PASSWORD", "RESEND_API_KEY", "AI_API_KEY"]) assert.equal(environment[key], undefined);
});

test("offline validation rejects network access without opening a socket", () => {
  const result = spawnSync(process.execPath, ["-e", "require('node:net').connect(443, 'example.com')"], { env: offlineEnvironment(fixture()), encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /network\/DB access is forbidden/);
});

for (const entry of [".env", ".env.production", "credentials.json", "private.key", ".next/cache/data", ".release-tests/test-dist.js", "analytics-build-old/server.js"]) {
  test(`package inventory refuses ${entry}`, () => {
    const directory = fixture();
    fs.mkdirSync(path.dirname(path.join(directory, entry)), { recursive: true });
    fs.writeFileSync(path.join(directory, entry), "nonsecret-test-fixture");
    assert.throws(() => inventory(directory), /Forbidden package entry/);
  });
}

test("package inventory refuses escaped shared-dependency symlinks", () => {
  const directory = fixture();
  fs.symlinkSync(root, path.join(directory, "shared-node-modules"));
  assert.throws(() => inventory(directory), /escapes release/);
});

test("package inventory hashes real files and preserves only internal symlinks", () => {
  const directory = fixture();
  fs.writeFileSync(path.join(directory, "server.js"), "fresh server");
  fs.symlinkSync("server.js", path.join(directory, "internal.js"));
  const files = inventory(directory);
  assert.equal(files.length, 2);
  assert.equal(files[0].kind, "symlink");
  assert.equal(files[1].sha256.length, 64);
});

test("full standalone traces refuse missing and mixed dependencies", () => {
  const directory = fixture();
  const dist = path.join(directory, "dist");
  const stage = path.join(directory, "stage");
  const source = path.join(directory, "dependency.js");
  fs.mkdirSync(dist);
  fs.mkdirSync(stage);
  fs.writeFileSync(source, "fresh dependency");
  fs.writeFileSync(path.join(dist, "route.js.nft.json"), JSON.stringify({ files: ["../dependency.js"] }));
  assert.throws(() => verifyTraces(dist, stage), /Missing standalone traced dependency/);
  const destination = path.join(stage, path.relative(root, source));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, "old release dependency");
  assert.throws(() => verifyTraces(dist, stage), /Mixed traced dependency/);
  fs.writeFileSync(destination, "fresh dependency");
  assert.equal(verifyTraces(dist, stage), 1);
});

test("full standalone traces handle pnpm directory links and still hash their traced leaves", () => {
  const directory = fixture();
  const dist = path.join(directory, "dist");
  const stage = path.join(directory, "stage");
  const source = path.join(directory, "dependencies");
  fs.mkdirSync(dist);
  fs.mkdirSync(stage);
  fs.mkdirSync(source);
  fs.writeFileSync(path.join(source, "file.js"), "fresh directory dependency");
  fs.symlinkSync("dependencies", path.join(directory, "linked"));
  fs.writeFileSync(path.join(dist, "page.js.nft.json"), JSON.stringify({ files: ["../linked", "../dependencies/file.js"] }));
  const destination = path.join(stage, path.relative(root, source));
  fs.mkdirSync(destination, { recursive: true });
  fs.symlinkSync("dependencies", path.join(path.dirname(destination), "linked"));
  assert.throws(() => verifyTraces(dist, stage), /Missing standalone traced dependency/);
  fs.writeFileSync(path.join(destination, "file.js"), "old dependency");
  assert.throws(() => verifyTraces(dist, stage), /Mixed traced dependency/);
  fs.writeFileSync(path.join(destination, "file.js"), "fresh directory dependency");
  assert.equal(verifyTraces(dist, stage), 2);
});

test("completes omitted NFT files only from this independent source without overwriting", () => {
  const directory = fixture();
  const dist = path.join(directory, "dist");
  const stage = path.join(directory, "stage");
  fs.mkdirSync(dist);
  fs.mkdirSync(stage);
  fs.writeFileSync(path.join(directory, "dependency.js"), "this build dependency");
  fs.writeFileSync(path.join(dist, "page.js.nft.json"), JSON.stringify({ files: ["../dependency.js"] }));
  assert.equal(completeTraces(dist, stage), 1);
  assert.equal(completeTraces(dist, stage), 0);
  assert.equal(verifyTraces(dist, stage), 1);
});
