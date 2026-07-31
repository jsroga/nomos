#!/usr/bin/env bash
set -euo pipefail
cat <<'JSON'
{
  "user_message": "Gates: verify every 5 todos · many failures → npm run qualitygate:capture + .local/quality-backlog.md (fix 1, mark done, rescan every 5). Limits: 400/800 lines, complexity 15/25. Multi-request work → track under .local/sessions/YYYY-MM-DD_<id>_<slug>/ (templates: .agents/templates/session/). Mastra file edits → smoke on stop (scripts/mastra-smoke.mjs). User asks to commit → run npm run precommit first (unit tests + build); never --no-verify. See .cursor/rules/commit-gates.mdc + session-tracking.mdc + quality-backlog.mdc"
}
JSON
