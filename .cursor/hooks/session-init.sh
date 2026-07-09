#!/usr/bin/env bash
set -euo pipefail
cat <<'JSON'
{
  "user_message": "Gates: verify every 5 todos · many failures → npm run qualitygate:capture + .local/quality-backlog.md (fix 1, mark done, rescan every 5). Limits: 400/800 lines, complexity 15/25. See .cursor/rules/quality-backlog.mdc"
}
JSON
