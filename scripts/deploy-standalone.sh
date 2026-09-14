#!/bin/sh
set -eu

project_dir="${HEFENGQI_DEPLOY_DIR:-/mnt/vscode/hefengqi}"
service_name="${HEFENGQI_SERVICE_NAME:-hefengqi.service}"
release_root="$project_dir/.releases"
current_link="$project_dir/current"
lock_dir="$project_dir/.standalone-deploy.lock"
state_dir="${TMPDIR:-/tmp}/hefengqi-build-state-$$"

case "$project_dir" in
  /*) ;;
  *) echo "HEFENGQI_DEPLOY_DIR must be an absolute path" >&2; exit 2 ;;
esac

mkdir -p "$release_root"
if ! mkdir "$lock_dir" 2>/dev/null; then
  echo "another standalone deployment is already running" >&2
  exit 1
fi
restore_source_config() {
  if [ -d "$state_dir" ]; then
    cp "$state_dir/next-env.d.ts" "$project_dir/next-env.d.ts"
    cp "$state_dir/tsconfig.json" "$project_dir/tsconfig.json"
    rm -rf "$state_dir"
  fi
}
cleanup() {
  restore_source_config
  rmdir "$lock_dir" 2>/dev/null || true
}
trap cleanup EXIT INT TERM HUP

cd "$project_dir"
mkdir "$state_dir"
cp next-env.d.ts tsconfig.json "$state_dir/"
release_id="$(date -u +%Y%m%d%H%M%S)-$$"
dist_dir="next-build"
release_dir="$release_root/$release_id"
release_tmp="$release_root/.$release_id.tmp"
previous_target=""
if [ -L "$current_link" ]; then previous_target="$(readlink "$current_link")"; fi

rm -rf "$project_dir/$dist_dir" "$release_tmp"

echo "building isolated release $release_id"
pnpm db:generate
NEXT_DIST_DIR="$dist_dir" pnpm build

test -f "$project_dir/$dist_dir/standalone/server.js"
mv "$project_dir/$dist_dir/standalone" "$release_tmp"
mv "$release_tmp" "$release_dir"
rm -rf "$project_dir/$dist_dir"

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

# Keep the current release and two rollback targets. Targets are restricted to
# the release directory created by this script.
find "$release_root" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort -r | awk 'NR > 3' | while IFS= read -r old; do
  case "$old" in
    .*.tmp|"$release_id") ;;
    *) rm -rf "$release_root/$old" ;;
  esac
done

echo "standalone release $release_id is healthy"
