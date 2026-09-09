#!/bin/sh
set -eu
backup_dir=/var/lib/hefengqi-backup
dump_file="$backup_dir/hefengqi.dump"
mkdir -p "$backup_dir"
if ! restic snapshots >/dev/null 2>&1; then restic init; fi
pg_dump --format=custom --no-owner --file="$dump_file"
restic backup "$dump_file" /data/media /data/private --tag automated
restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune
restic check --read-data-subset=2.5%
