#!/bin/sh
set -eu

: "${EDGEONE_IP_URL:?Set EDGEONE_IP_URL to Tencent EdgeOne official origin IP endpoint}"
state_dir="${EDGEONE_STATE_DIR:-/var/lib/hefengqi-edgeone}"
mkdir -p "$state_dir"
download="$(mktemp)"
candidate="$(mktemp)"
rules="$(mktemp)"
trap 'rm -f "$download" "$candidate" "$rules"' EXIT

curl --fail --silent --show-error --location --max-time 20 "$EDGEONE_IP_URL" > "$download"
if command -v jq >/dev/null 2>&1 && jq -e . "$download" >/dev/null 2>&1; then
  jq -r '.. | strings | select(test("^[0-9a-fA-F:.]+/[0-9]+$"))' "$download" | sort -u > "$candidate"
else
  sed -nE 's/^[[:space:]]*([0-9a-fA-F:.]+\/[0-9]+)[[:space:]]*$/\1/p' "$download" | sort -u > "$candidate"
fi

python3 - "$candidate" <<'PY'
import ipaddress, pathlib, sys
lines = [line.strip() for line in pathlib.Path(sys.argv[1]).read_text().splitlines() if line.strip()]
if len(lines) < 5:
    raise SystemExit("refusing update: fewer than five valid-looking ranges")
for line in lines:
    ipaddress.ip_network(line, strict=False)
PY

ipv4="$(awk '!/:/' "$candidate" | paste -sd, -)"
ipv6="$(awk '/:/' "$candidate" | paste -sd, -)"
[ -n "$ipv4" ] || { echo "refusing update: no IPv4 ranges" >&2; exit 1; }

{
  echo 'table inet hefengqi_origin {'
  echo "  set edgeone4 { type ipv4_addr; flags interval; elements = { $ipv4 } }"
  if [ -n "$ipv6" ]; then echo "  set edgeone6 { type ipv6_addr; flags interval; elements = { $ipv6 } }"; fi
  echo '  chain input { type filter hook input priority -5; policy accept;'
  echo '    tcp dport 8443 ip saddr @edgeone4 accept'
  if [ -n "$ipv6" ]; then echo '    tcp dport 8443 ip6 saddr @edgeone6 accept'; fi
  echo '    tcp dport 8443 drop'
  echo '  }'
  echo '}'
} > "$rules"

nft -c -f "$rules"
if nft list table inet hefengqi_origin >/dev/null 2>&1; then nft delete table inet hefengqi_origin; fi
nft -f "$rules"
install -m 0644 "$candidate" "$state_dir/edgeone-ranges.txt"
install -m 0644 "$rules" "$state_dir/nftables.conf"
