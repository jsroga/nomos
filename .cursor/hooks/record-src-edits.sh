#!/usr/bin/env bash
# Record src/**/*.ts(x) edits for fast-verify-on-stop (afterFileEdit).
set -euo pipefail

input=$(cat)
file_path=$(echo "$input" | jq -r '.file_path // empty' 2>/dev/null || true)
[ -n "$file_path" ] || exit 0

case "$file_path" in
  */src/*.ts|*/src/*.tsx|src/*.ts|src/*.tsx) ;;
  *) exit 0 ;;
esac

root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
hash=$(printf '%s' "$root" | shasum | cut -c1-12)
marker="${TMPDIR:-/tmp}/cursor-edited-src.${hash}"
mkdir -p "$(dirname "$marker")"
echo "$file_path" >> "$marker"
exit 0
