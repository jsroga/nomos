#!/usr/bin/env bash
# Fast TSC + ESLint on files edited this turn (~5–15s). Fail-open.
set -euo pipefail

input=$(cat)
file_path=$(echo "$input" | jq -r '.file_path // empty' 2>/dev/null || true)
[ -z "$file_path" ] || exit 0

root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$root"

hash=$(printf '%s' "$root" | shasum | cut -c1-12)
marker="${TMPDIR:-/tmp}/cursor-edited-src.${hash}"

if [ ! -f "$marker" ]; then
  exit 0
fi

count=$(wc -l < "$marker" | tr -d ' ')
[ "$count" -gt 0 ] || { rm -f "$marker"; exit 0; }

rm -f "$marker"

if ! out=$(node scripts/qualitygate.mjs changed --from-marker --hook 2>&1); then
  printf '%s\n' "$out"
  exit 0
fi

printf '%s\n' "$out"
exit 0
