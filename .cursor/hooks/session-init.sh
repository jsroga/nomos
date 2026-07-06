#!/usr/bin/env bash
# session-init.sh — sessionStart hook. Prints a short dark-factory cheat sheet.
set -euo pipefail

cat <<'JSON'
{
  "user_message": "Dark factory ready. /execute <module> runs the Fabro execute loop interactively (scope → assess → clarify → plan → verify gate → build → retro). Sandboxed: fabro run .fabro/workflows/execute/workflow.toml -I module=<x>. Gates: typecheck/lint via node scripts/fabro-verify.mjs; unit tests npm run test:unit; evals npm run eval. Destructive commands (rm -rf, force-push, hard-reset) are blocked by .cursor/hooks/guard-destructive.sh."
}
JSON
exit 0
