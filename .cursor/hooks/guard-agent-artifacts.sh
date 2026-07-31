#!/usr/bin/env bash
# guard-agent-artifacts.sh — preToolUse, matcher: Write
# Denies new scratch markdown (plans, audits, trackers) outside .local/.
# Fails open: an unparseable payload or missing node allows the write.
set -euo pipefail

input=$(cat)

target=$(echo "$input" | jq -r '
  .tool_input.path // .tool_input.file_path // .tool_input.target_file //
  .path // .file_path // empty
' 2>/dev/null || true)

if [ -z "$target" ] || [ "${target##*.}" != "md" ]; then
  echo '{"permission":"allow"}'
  exit 0
fi

root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
rel=${target#"$root"/}

# Absolute path outside the repo — not our business.
case "$rel" in /*) echo '{"permission":"allow"}'; exit 0 ;; esac

command -v node >/dev/null 2>&1 || { echo '{"permission":"allow"}'; exit 0; }

if reason=$(node "$root/scripts/check-agent-artifacts.mjs" --path "$rel" 2>/dev/null); then
  echo '{"permission":"allow"}'
  exit 0
fi

jq -n --arg file "$rel" --arg reason "$reason" '{
  permission: "deny",
  user_message: ("Blocked agent markdown at " + $file + " — " + $reason),
  agent_message: ("Do not create " + $file + " (" + $reason + "). Agent plans, audits, trackers, and findings go in .local/: .local/sessions/<date>_<id>_<slug>/ for multi-request work, .local/findings/ for audits, .local/tmp/<id>/ for scratch. Only durable human-facing docs belong in docs/ (with a docs/README.md entry). See .cursor/rules/agent-artifacts.mdc.")
}'
exit 2
