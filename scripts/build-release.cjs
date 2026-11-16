const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { verifyRelease } = require("./verify-release.cjs");
const { root, sha256, artifactDirectory, snapshot, acquireLock, offlineEnvironment, runStep, inventory } = require("./release-common.cjs");

const artifact = artifactDirectory();
const unlockArtifact = acquireLock(artifact);
let unlockSource;
try {
  unlockSource = acquireLock(root);
  const state = snapshot();
  const dist = path.join(root, ".next");
  assert(!fs.existsSync(dist), "Existing .next refused; preserve it in task artifacts before rebuilding");
  assert(!fs.existsSync(path.join(artifact, "build-record.json")), "Existing build record refused; choose a new artifact subdirectory");
  const environment = offlineEnvironment(artifact);
  const generated = ["next-env.d.ts", "tsconfig.json"].map((name) => ({ name, before: fs.readFileSync(path.join(root, name)) }));
  const evidence = path.join(artifact, "generated-source");
  fs.mkdirSync(evidence);
  for (const { name, before } of generated) fs.writeFileSync(path.join(evidence, `${name}.before`), before);
  try {
    runStep(artifact, "prisma-generate", process.execPath, [require.resolve("prisma/build/index.js"), "generate"], { ...environment, NODE_OPTIONS: "" });
    snapshot(root, state);
    runStep(artifact, "production-webpack-build", process.execPath, [require.resolve("next/dist/bin/next"), "build", "--webpack"], environment);
  } finally {
    for (const { name, before } of generated) {
      fs.writeFileSync(path.join(evidence, `${name}.after`), fs.readFileSync(path.join(root, name)));
      fs.writeFileSync(path.join(root, name), before);
    }
  }
  snapshot(root, state);
  const gates = verifyRelease(dist);
  const buildId = fs.readFileSync(path.join(dist, "BUILD_ID"), "utf8").trim();
  const record = {
    schemaVersion: 1, commit: state.commit, sourceDigest: state.sourceDigest,
    buildId, bundler: "webpack", node: process.version,
    packageLockHash: sha256(fs.readFileSync(path.join(root, "pnpm-lock.yaml"))),
    distDigest: sha256(JSON.stringify(inventory(dist, { buildOutput: true }))),
    builtAt: new Date().toISOString(), source: root, gates,
    environment: "offline non-production placeholder; no runtime/HTTP/DB acceptance", status: "build-verified-not-deployed",
  };
  snapshot(root, state);
  fs.writeFileSync(path.join(artifact, "build-record.json"), `${JSON.stringify(record, null, 2)}\n`, { flag: "wx" });
  console.log(JSON.stringify(record, null, 2));
} finally {
  if (unlockSource) unlockSource();
  unlockArtifact();
}
