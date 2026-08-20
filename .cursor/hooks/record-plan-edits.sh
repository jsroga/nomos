#!/usr/bin/env bash
# Record plan-file edits so plan-critique-on-stop can fire once (afterFileEdit).
# Covers Cursor Plan mode (~/.cursor/plans/*.plan.md, .cursor/plans/) and PLAN.md.
set -euo pipefail

input=$(cat)
file_path=$(echo "$input" | jq -r '.file_path // empty' 2>/dev/null || true)
[ -n "$file_path" ] || exit 0

base=$(basename "$file_path")
is_plan=0
case "$base" in
  PLAN.md|*.plan.md) is_plan=1 ;;
esac
case "$file_path" in
  */.cursor/plans/*) is_plan=1 ;;
esac
[ "$is_plan" -eq 1 ] || exit 0

root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
hash=$(printf '%s' "$root" | shasum | cut -c1-12)
marker="${TMPDIR:-/tmp}/cursor-plan-written.${hash}"
mkdir -p "$(dirname "$marker")"
printf '%s\n' "$file_path" >> "$marker"
exit 0
