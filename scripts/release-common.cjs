const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");
const git = (directory, ...args) => execFileSync("git", ["-C", directory, ...args], { encoding: "utf8" }).trim();
const inside = (directory, file) => file === directory || file.startsWith(`${directory}${path.sep}`);
const forbidden = (relative) => /(^|\/)(?:\.env(?:\..*)?|\.git|\.cache|\.pnpm-store|\.release-[^/]*|analytics-build-[^/]*|traffic-breakdown-build-[^/]*|current|\.releases|credentials(?:\.[^/]*)?)(\/|$)|(^|\/)\.next\/cache(\/|$)|\.(?:pem|key|p12|pfx)$/.test(relative);

function artifactDirectory(args = process.argv.slice(2)) {
  assert.equal(args.length, 2, "Usage: --artifact-dir /absolute/task/artifacts");
  assert.equal(args[0], "--artifact-dir");
  assert(path.isAbsolute(args[1]), "Artifact directory must be absolute");
  const directory = path.resolve(args[1]);
  fs.mkdirSync(directory, { recursive: true });
  assert(!inside(root, fs.realpathSync(directory)), "Artifacts must be outside the source tree");
  return directory;
}

function sourceDigest(directory = root) {
  const tracked = execFileSync("git", ["-C", directory, "ls-files", "-s", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean).sort();
  return sha256(JSON.stringify(tracked.map((entry) => {
    const [metadata, relative] = entry.split("\t");
    assert(!forbidden(relative), `Forbidden tracked input: ${relative}`);
    const file = path.join(directory, relative);
    const stat = fs.lstatSync(file);
    assert(!stat.isSymbolicLink(), `Tracked source symlink is not permitted: ${relative}`);
    return [metadata.split(" ")[0], relative, sha256(fs.readFileSync(file))];
  })));
}

function assertIdentity(actual, expected) {
  assert.equal(actual.status, "", "Release source must be clean and committed (including untracked files)");
  if (expected) {
    assert.equal(actual.commit, expected.commit, "HEAD changed during release");
    assert.equal(actual.sourceDigest, expected.sourceDigest, "Source digest changed during release");
  }
  return actual;
}

function snapshot(directory = root, expected) {
  assert.equal(git(directory, "rev-parse", "--show-toplevel"), directory, "Use an independent repository root");
  assert(!fs.lstatSync(path.join(directory, "node_modules")).isSymbolicLink(), "Shared node_modules is forbidden");
  assert(!fs.readdirSync(directory).some((name) => name === ".env" || name.startsWith(".env.")), "Environment files are forbidden in the release source; do not read/copy them");
  const status = git(directory, "status", "--porcelain", "--untracked-files=all");
  assert.equal(status, "", "Release source must be clean and committed (including untracked files)");
  const state = assertIdentity({
    commit: git(directory, "rev-parse", "HEAD"),
    status,
    sourceDigest: sourceDigest(directory),
  }, expected);
  for (const commit of ["628a3cf5003e6247db4d9b9d3cfe80d78dddbf9b", "276d14a9c2269126c808515fe99b4975ea778166"]) {
    execFileSync("git", ["-C", directory, "merge-base", "--is-ancestor", commit, state.commit]);
  }
  return state;
}

function acquireLock(directory) {
  const lock = path.join(directory, ".release-operation.lock");
  try { fs.mkdirSync(lock); } catch (error) {
    if (error.code === "EEXIST") throw new Error(`Parallel release refused; lock exists: ${lock}`);
    throw error;
  }
  fs.writeFileSync(path.join(lock, "owner.json"), JSON.stringify({ pid: process.pid, root, at: new Date().toISOString() }));
  return () => {
    fs.unlinkSync(path.join(lock, "owner.json"));
    fs.rmdirSync(lock);
  };
}

function offlineEnvironment(artifact) {
  const home = path.join(artifact, "build-home");
  fs.mkdirSync(home, { recursive: true });
  return {
    PATH: process.env.PATH,
    HOME: home,
    XDG_CACHE_HOME: path.join(home, ".cache"),
    LANG: "C.UTF-8", TZ: "UTC", CI: "true", NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1", NEXT_DIST_DIR: ".next",
    SITE_URL: "https://ricewind.com", DEMO_MODE: "false",
    DATABASE_URL: "postgresql://ricewind_build_placeholder:nonproduction@127.0.0.1:1/ricewind_build_only?connect_timeout=1",
    ANALYTICS_DB_TEST: "0",
    NODE_OPTIONS: `--require=${path.join(__dirname, "release-offline.cjs")}`,
  };
}

function runStep(artifact, name, command, args, environment) {
  const steps = path.join(artifact, "steps");
  fs.mkdirSync(steps, { recursive: true });
  const descriptor = fs.openSync(path.join(steps, `${name}.log`), "w");
  let result;
  try { result = spawnSync(command, args, { cwd: root, env: environment, stdio: ["ignore", descriptor, descriptor] }); }
  finally { fs.closeSync(descriptor); }
  const exit = result.status ?? 1;
  fs.writeFileSync(path.join(steps, `${name}.exit`), `${exit}\n`);
  assert.equal(exit, 0, `${name} failed (exit ${exit}); inspect its artifact log`);
}

function inventory(directory, { buildOutput = false } = {}) {
  const entries = [];
  function visit(relative) {
    const absolute = path.join(directory, relative);
    const stat = fs.lstatSync(absolute);
    if (buildOutput && relative === "cache") return;
    assert(relative !== "cache", "Cache is forbidden in a release package");
    assert(!forbidden(relative), `Forbidden package entry: ${relative}`);
    if (stat.isSymbolicLink()) {
      assert(inside(directory, fs.realpathSync(absolute)), `Package symlink escapes release: ${relative}`);
      entries.push({ path: relative, kind: "symlink", target: fs.readlinkSync(absolute) });
    } else if (stat.isDirectory()) {
      for (const name of fs.readdirSync(absolute).sort()) visit(relative ? `${relative}/${name}` : name);
    } else {
      assert(stat.isFile(), `Unexpected package entry: ${relative}`);
      entries.push({ path: relative, kind: "file", bytes: stat.size, sha256: sha256(fs.readFileSync(absolute)) });
    }
  }
  visit("");
  return entries;
}

function verifyTraces(dist, standalone) {
  let count = 0;
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === "standalone" || entry.name === "cache") continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.name.endsWith(".nft.json")) {
        const trace = JSON.parse(fs.readFileSync(absolute, "utf8"));
        for (const relative of trace.files) {
          const source = path.resolve(path.dirname(absolute), relative);
          assert(inside(root, source), `Traced dependency escapes independent source: ${source}`);
          const destination = path.join(standalone, path.relative(root, source));
          assert(fs.existsSync(destination), `Missing standalone traced dependency: ${path.relative(root, source)}`);
          assert(inside(standalone, fs.realpathSync(destination)), "Traced dependency points outside package");
          assert.equal(sha256(fs.readFileSync(destination)), sha256(fs.readFileSync(source)), `Mixed traced dependency: ${relative}`);
          count += 1;
        }
      }
    }
  }
  visit(dist);
  return count;
}

module.exports = { root, sha256, git, inside, forbidden, artifactDirectory, sourceDigest, assertIdentity, snapshot, acquireLock, offlineEnvironment, runStep, inventory, verifyTraces };
