#!/bin/sh
set -eu

project_dir="${HEFENGQI_DEPLOY_DIR:-/mnt/vscode/hefengqi}"
source_dir="${HEFENGQI_SOURCE_DIR:-}"
service_name="${HEFENGQI_SERVICE_NAME:-hefengqi.service}"
release_root="$project_dir/.releases"
current_link="$project_dir/current"
lock_dir="$project_dir/.standalone-deploy.lock"
state_dir="${TMPDIR:-/tmp}/hefengqi-build-state-$$"

case "$project_dir" in
  /*) ;;
  *) echo "HEFENGQI_DEPLOY_DIR must be an absolute path" >&2; exit 2 ;;
esac
case "$source_dir" in
  /*) ;;
  *) echo "Set HEFENGQI_SOURCE_DIR to an explicit, clean, integrated source worktree" >&2; exit 2 ;;
esac
if [ "$(realpath "$source_dir")" = "$(realpath "$project_dir")" ]; then
  echo "Do not build from the historical production runtime worktree; use a clean integrated source worktree" >&2
  exit 2
fi
test -f "$source_dir/package.json"
test -f "$source_dir/next-env.d.ts"
test -f "$source_dir/tsconfig.json"

mkdir -p "$release_root"
if ! mkdir "$lock_dir" 2>/dev/null; then
  echo "another standalone deployment is already running" >&2
  exit 1
fi
restore_source_config() {
  if [ -d "$state_dir" ]; then
    cp "$state_dir/next-env.d.ts" "$source_dir/next-env.d.ts"
    cp "$state_dir/tsconfig.json" "$source_dir/tsconfig.json"
    rm -rf "$state_dir"
  fi
}
cleanup() {
  restore_source_config
  rmdir "$lock_dir" 2>/dev/null || true
}
trap cleanup EXIT INT TERM HUP

cd "$source_dir"
source_commit="$(git rev-parse HEAD)"
if ! git diff --quiet HEAD --; then
  echo "commit the release source before deploying" >&2
  exit 1
fi
if git rev-parse --verify origin/main >/dev/null 2>&1 && ! git merge-base --is-ancestor origin/main "$source_commit"; then
  echo "release source is missing changes from origin/main; integrate them before deploying" >&2
  exit 1
fi
if [ -f "$current_link/release.json" ]; then
  previous_commit="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).commit)' "$current_link/release.json")"
  if ! git merge-base --is-ancestor "$previous_commit" "$source_commit"; then
    echo "release source does not include the current production commit; refusing to drop deployed features" >&2
    exit 1
  fi
fi
mkdir "$state_dir"
cp next-env.d.ts tsconfig.json "$state_dir/"
release_id="$(date -u +%Y%m%d%H%M%S)-$$"
dist_dir="next-build"
release_dir="$release_root/$release_id"
release_tmp="$release_root/.$release_id.tmp"
previous_target=""
if [ -L "$current_link" ]; then previous_target="$(readlink "$current_link")"; fi

rm -rf "$source_dir/$dist_dir" "$release_tmp"

echo "building isolated release $release_id"
pnpm db:generate
NEXT_DIST_DIR="$dist_dir" pnpm build

node scripts/verify-release.cjs "$source_dir/$dist_dir/standalone/$dist_dir"
test -f "$source_dir/$dist_dir/standalone/server.js"
mv "$source_dir/$dist_dir/standalone" "$release_tmp"
node - "$release_tmp/release.json" "$source_commit" "$release_id" <<'NODE'
const fs = require("node:fs");
const [target, commit, release] = process.argv.slice(2);
fs.writeFileSync(target, JSON.stringify({ commit, release, builtAt: new Date().toISOString() }, null, 2) + "\n");
NODE
mv "$release_tmp" "$release_dir"
rm -rf "$source_dir/$dist_dir"

# An unrelated publisher may not honor this script's lock. Never overwrite a
# release that changed while this build was running.
if [ "$(readlink "$current_link" 2>/dev/null || true)" != "$previous_target" ]; then
  echo "production changed during the build; candidate retained without switching" >&2
  exit 1
fi
if [ "$(git rev-parse HEAD)" != "$source_commit" ]; then
  echo "source revision changed during the build; candidate retained without switching" >&2
  exit 1
fi

next_link="$project_dir/.current-$release_id"
ln -s "$release_dir" "$next_link"
mv -Tf "$next_link" "$current_link"

rollback() {
  if [ -n "$previous_target" ]; then
    old_link="$project_dir/.rollback-$release_id"
    ln -s "$previous_target" "$old_link"
    mv -Tf "$old_link" "$current_link"
    systemctl restart "$service_name" || true
  fi
}

systemctl daemon-reload
systemctl restart "$service_name"

healthy=0
for _ in $(seq 1 30); do
  if curl -fsS --max-time 2 http://127.0.0.1:3000/api/health/ready >/dev/null 2>&1; then healthy=1; break; fi
  sleep 1
done
if [ "$healthy" -ne 1 ]; then
  echo "new standalone release failed health check; rolling back" >&2
  rollback
  exit 1
fi

for route in /zh/solutions /zh/support/troubleshooting; do
  status="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "http://127.0.0.1:3000$route" || true)"
  if [ "$status" != "200" ]; then
    echo "required public route $route failed ($status); rolling back" >&2
    rollback
    exit 1
  fi
done

# Retain rollback releases. Cleanup is a separate, reviewed maintenance task;
# directory dates do not establish which release contains the complete site.

echo "standalone release $release_id is healthy"
