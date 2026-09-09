#!/bin/sh
set -eu

[ "${CONFIRM_RESTORE:-}" = "RESTORE_HEFENGQI" ] || { echo "set CONFIRM_RESTORE=RESTORE_HEFENGQI" >&2; exit 2; }
[ "$#" -ge 1 ] || { echo "usage: restore.sh <snapshot-id|latest> [database|all]" >&2; exit 2; }
snapshot="$1"
mode="${2:-database}"
case "$mode" in database|all) ;; *) echo "mode must be database or all" >&2; exit 2;; esac

restore_root="$(mktemp -d /var/lib/hefengqi-backup/restore.XXXXXX)"
trap 'rm -rf "$restore_root"' EXIT INT TERM
restic restore "$snapshot" --target "$restore_root"
dump_file="$restore_root/var/lib/hefengqi-backup/hefengqi.dump"
[ -f "$dump_file" ] || { echo "database dump missing from snapshot" >&2; exit 1; }

pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$PGDATABASE" "$dump_file"

if [ "$mode" = "all" ]; then
  [ "${CONFIRM_MEDIA_RESTORE:-}" = "RESTORE_MEDIA" ] || { echo "set CONFIRM_MEDIA_RESTORE=RESTORE_MEDIA for all mode" >&2; exit 2; }
  [ -d "$restore_root/data/media" ] && cp -a "$restore_root/data/media/." /data/media/
  [ -d "$restore_root/data/private" ] && cp -a "$restore_root/data/private/." /data/private/
fi

echo "restore completed from snapshot $snapshot ($mode)"
