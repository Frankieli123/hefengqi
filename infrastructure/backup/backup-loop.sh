#!/bin/sh
set -eu
interval="${BACKUP_INTERVAL_SECONDS:-86400}"
while true; do
  if /usr/local/bin/backup.sh; then date -u +%FT%TZ > /var/lib/hefengqi-backup/last-success; else date -u +%FT%TZ > /var/lib/hefengqi-backup/last-failure; fi
  sleep "$interval"
done
