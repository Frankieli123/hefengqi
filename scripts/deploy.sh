#!/bin/sh
set -eu

[ "$#" -eq 1 ] || { echo "usage: $0 <git-sha-image-tag>" >&2; exit 2; }
new_tag="$1"
case "$new_tag" in *[!a-fA-F0-9]*) echo "image tag must be a Git SHA" >&2; exit 2;; esac

project_dir="${HEFENGQI_DEPLOY_DIR:-/srv/hefengqi}"
env_file="$project_dir/.env.production"
state_file="$project_dir/.deployed-image"
[ -f "$env_file" ] || { echo "missing $env_file" >&2; exit 1; }
cd "$project_dir"
previous_tag="$(cat "$state_file" 2>/dev/null || true)"

set_tag() {
  target="$1"
  temp="$(mktemp "$project_dir/.env.production.XXXXXX")"
  awk -v tag="$target" 'BEGIN{done=0} /^IMAGE_TAG=/{print "IMAGE_TAG=" tag; done=1; next} {print} END{if(!done) print "IMAGE_TAG=" tag}' "$env_file" > "$temp"
  chmod 0600 "$temp"
  mv "$temp" "$env_file"
}

rollback() {
  if [ -n "$previous_tag" ]; then
    echo "deployment failed; restoring image $previous_tag" >&2
    set_tag "$previous_tag"
    docker compose --env-file "$env_file" up -d web worker gateway
  fi
}

deploy() {
  docker compose --env-file "$env_file" config -q || return
  set_tag "$new_tag" || return
  docker compose --env-file "$env_file" pull web worker || return
  docker compose --env-file "$env_file" build gateway backup || return
  docker compose --env-file "$env_file" run --rm --entrypoint /usr/local/bin/backup.sh backup || return
  docker compose --env-file "$env_file" run --rm --no-deps worker ./node_modules/.bin/prisma migrate deploy || return
  docker compose --env-file "$env_file" run --rm --no-deps worker ./node_modules/.bin/tsx prisma/seed.ts || return
  docker compose --env-file "$env_file" up -d --wait web worker gateway || return
  docker compose --env-file "$env_file" exec -T web node -e "fetch('http://127.0.0.1:3000/api/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" || return
  printf '%s\n' "$new_tag" > "$state_file"
}

trap rollback INT TERM HUP
if ! deploy; then rollback; exit 1; fi
trap - INT TERM HUP
docker image prune -f --filter "until=168h"
