const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { verifyRelease } = require("./verify-release.cjs");
const { root, sha256, artifactDirectory, snapshot, acquireLock, inventory, verifyTraces, completeTraces } = require("./release-common.cjs");

const artifact = artifactDirectory();
const unlockArtifact = acquireLock(artifact);
let unlockSource;
try {
  unlockSource = acquireLock(root);
  const record = JSON.parse(fs.readFileSync(path.join(artifact, "build-record.json"), "utf8"));
  snapshot(root, record);
  assert.equal(record.source, root, "Build came from another source tree");
  assert.equal(record.node, process.version, "Node changed since build");
  assert.equal(record.bundler, "webpack", "Only webpack releases are permitted");
  assert.equal(record.packageLockHash, sha256(fs.readFileSync(path.join(root, "pnpm-lock.yaml"))));
  const dist = path.join(root, ".next");
  assert.equal(record.distDigest, sha256(JSON.stringify(inventory(dist, { buildOutput: true }))), "Build output changed since verification");
  verifyRelease(dist);
  const standalone = path.join(dist, "standalone");
  assert(fs.existsSync(path.join(standalone, "server.js")), "Missing fresh standalone server.js");
  const stage = path.join(artifact, "standalone");
  assert(!fs.existsSync(stage), "Package staging directory already exists; never mix releases");
  fs.cpSync(standalone, stage, { recursive: true, verbatimSymlinks: true, errorOnExist: true, force: false });
  for (const [source, destination] of [[path.join(dist, "static"), path.join(stage, ".next/static")], [path.join(root, "public"), path.join(stage, "public")]]) {
    assert(!fs.existsSync(destination), `Unexpected preexisting package assets: ${destination}`);
    fs.cpSync(source, destination, { recursive: true, verbatimSymlinks: true, errorOnExist: true, force: false });
  }
  assert.equal(fs.readFileSync(path.join(stage, ".next/BUILD_ID"), "utf8").trim(), record.buildId, "Mixed BUILD_ID");
  assert.equal(sha256(fs.readFileSync(path.join(stage, "server.js"))), sha256(fs.readFileSync(path.join(standalone, "server.js"))), "Mixed standalone server.js");
  const completedTraceEntries = completeTraces(dist, stage);
  const tracedDependencies = verifyTraces(dist, stage);
  verifyRelease(path.join(stage, ".next"));
  const manifest = { ...record, packagedAt: new Date().toISOString(), tracedDependencies, completedTraceEntries, files: inventory(stage) };
  fs.writeFileSync(path.join(stage, "release-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
  snapshot(root, record);
  const archive = path.join(artifact, `ricewind-${record.commit.slice(0, 12)}-${record.buildId}.tar.gz`);
  assert(!fs.existsSync(archive), "Archive already exists");
  execFileSync("tar", ["--sort=name", "--owner=0", "--group=0", "--numeric-owner", "-czf", archive, "-C", stage, "."]);
  snapshot(root, record);
  assert.equal(record.distDigest, sha256(JSON.stringify(inventory(dist, { buildOutput: true }))), "Build output changed while packaging");
  const checksum = sha256(fs.readFileSync(archive));
  fs.writeFileSync(`${archive}.sha256`, `${checksum}  ${path.basename(archive)}\n`, { flag: "wx" });
  fs.writeFileSync(path.join(artifact, "release-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
  console.log(JSON.stringify({ archive, sha256: checksum, commit: record.commit, buildId: record.buildId, files: manifest.files.length, tracedDependencies, deployed: false }, null, 2));
} finally {
  if (unlockSource) unlockSource();
  unlockArtifact();
}
