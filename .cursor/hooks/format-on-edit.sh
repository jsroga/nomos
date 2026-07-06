#!/usr/bin/env bash
# format-on-edit.sh — afterFileEdit formatter. Best-effort, fail-open, never blocks.
# Runs prettier on the edited file if it is available; otherwise no-ops.
set -euo pipefail

input=$(cat)
file_path=$(echo "$input" | jq -r '.file_path // empty' 2>/dev/null || true)

[ -n "$file_path" ] || exit 0
[ -f "$file_path" ] || exit 0

case "$file_path" in
  *.ts|*.tsx|*.js|*.mjs|*.jsx|*.json|*.css|*.scss|*.md|*.html) ;;
  *) exit 0 ;;
esac

root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
prettier="$root/node_modules/.bin/prettier"

if [ -x "$prettier" ]; then
  "$prettier" --write "$file_path" >/dev/null 2>&1 || true
fi

exit 0
