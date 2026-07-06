#!/usr/bin/env bash
# verify-on-edit.sh — module-scoped typecheck+lint gate, mirrors the Fabro `verify` stage.
# Wired to both `afterFileEdit` (records edited paths) and `stop` (runs fabro-verify once
# when src/domains/** was touched this turn). Fail-open: never blocks the agent.
set -euo pipefail

input=$(cat)

# Determine git/root for the pending-edits marker.
root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
marker_dir="${TMPDIR:-/tmp}"
marker="$marker_dir/cursor-verify-pending.$(echo "$root" | shasum | cut -c1-12)"

# afterFileEdit input shape: { "file_path": "...", "edits": [...] }
file_path=$(echo "$input" | jq -r '.file_path // empty' 2>/dev/null || true)

if [ -n "$file_path" ]; then
  # Record only edits under src/domains/ (the module-scoped verify target).
  case "$file_path" in
    */src/domains/*|src/domains/*)
      mkdir -p "$(dirname "$marker")"
      echo "$file_path" >> "$marker"
      ;;
  esac
  exit 0
fi

# stop hook (no file_path) — run verify if any src/domains file was edited this turn.
if [ ! -f "$marker" ]; then
  exit 0
fi

count=$(wc -l < "$marker" | tr -d ' ')
if [ "$count" -eq 0 ]; then
  rm -f "$marker"
  exit 0
fi

rm -f "$marker"

# Require PLAN.md (fabro-verify reads the module from it). Without it, skip — the
# developer subagent writes PLAN.md during the execute loop.
if [ ! -f "$root/PLAN.md" ]; then
  cat <<'JSON'
{ "user_message": "verify-on-edit: skipped (no PLAN.md — fabro-verify needs a module target)" }
JSON
  exit 0
fi

cd "$root"
if ! out=$(node scripts/fabro-verify.mjs 2>&1); then
  # Fail-open for the agent loop, but surface the failures loudly.
  printf '{"user_message":"verify-on-edit: fabro-verify reported failures:\\n%s"}\n' \
    "$(echo "$out" | jq -Rs .)" 2>/dev/null || echo "$out"
  exit 0
fi

cat <<'JSON'
{ "user_message": "verify-on-edit: fabro-verify passed (module-scoped typecheck + lint)" }
JSON
exit 0
