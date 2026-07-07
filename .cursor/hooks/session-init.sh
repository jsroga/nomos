#!/usr/bin/env bash
# session-init.sh — sessionStart hook. Prints a short dark-factory cheat sheet.
set -euo pipefail

cat <<'JSON'
{
  "user_message": "Dark factory ready. /execute <module> runs the Fabro execute loop (scope → clarify → plan → verify gate → developer (codex) → retro). Sandboxed: fabro run .fabro/workflows/execute/workflow.toml -I module=<x>. Verify: node scripts/fabro-verify.mjs (typecheck + lint + module UT). Destructive commands blocked by guard-destructive.sh."
}
JSON
exit 0
