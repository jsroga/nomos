#!/usr/bin/env bash
# Record Mastra-related edits for smoke-on-stop (afterFileEdit).
set -euo pipefail

input=$(cat)
file_path=$(echo "$input" | jq -r '.file_path // empty' 2>/dev/null || true)
[ -n "$file_path" ] || exit 0

root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
rel=${file_path#"$root"/}

case "$rel" in
  src/mastra.ts|src/mastra/*|src/shared/agent-kernel/mastra/*|src/shared/agent-kernel/MastraInstance.ts|AGENTS.md)
    ;;
  *)
    exit 0
    ;;
esac

hash=$(printf '%s' "$root" | shasum | cut -c1-12)
marker="${TMPDIR:-/tmp}/cursor-edited-mastra.${hash}"
mkdir -p "$(dirname "$marker")"
echo "$rel" >> "$marker"
exit 0
