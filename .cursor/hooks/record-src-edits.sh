#!/usr/bin/env bash
# Record src/**/*.ts(x) edits for qualitygate-on-stop (afterFileEdit).
# Normalizes to repo-relative paths so the stop gate can resolve them.
set -euo pipefail

input=$(cat)
file_path=$(echo "$input" | jq -r '.file_path // empty' 2>/dev/null || true)
[ -n "$file_path" ] || exit 0

case "$file_path" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
# Strip absolute prefix → repo-relative
rel=${file_path#"$root"/}
case "$rel" in
  src/*) ;;
  *) exit 0 ;;
esac

hash=$(printf '%s' "$root" | shasum | cut -c1-12)
marker="${TMPDIR:-/tmp}/cursor-edited-src.${hash}"
mkdir -p "$(dirname "$marker")"
echo "$rel" >> "$marker"
exit 0
