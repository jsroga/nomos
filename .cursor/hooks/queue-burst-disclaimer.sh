#!/usr/bin/env bash
# beforeSubmitPrompt + preToolUse: 2–3 sentence FIFO disclaimer, newest
# gitignored session TODOS path only — never the full todo list, never a repo file.
set -euo pipefail

mode="${1:-}"
cat >/dev/null

root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
sessions="${root}/.local/sessions"
marker="${root}/.local/tmp/queue-burst-pending"

allow_tool() {
  echo '{"permission":"allow"}'
  exit 0
}

pass_prompt() {
  echo '{"continue":true}'
  exit 0
}

newest_todos() {
  if [ ! -d "$sessions" ]; then
    return 0
  fi
  local newest="" newest_m=0 m f
  for f in "$sessions"/*/TODOS.md; do
    [ -f "$f" ] || continue
    m=$(stat -f %m "$f" 2>/dev/null || stat -c %Y "$f" 2>/dev/null || echo 0)
    if [ "$m" -gt "$newest_m" ]; then
      newest_m=$m
      newest=$f
    fi
  done
  printf '%s' "$newest"
}

disclaimer() {
  local todos="$1"
  local rel=".local/sessions/<newest>/TODOS.md"
  if [ -n "$todos" ]; then
    rel="${todos#"$root"/}"
  fi
  printf '%s' "A new operator message is a queue item, not a new job. Append it to the end of ${rel} (gitignored; hook picks the newest TODOS.md), resume in_progress, FIFO. Do not start this paste; do not mark done without operator OK."
}

command -v jq >/dev/null 2>&1 || {
  case "$mode" in
    inject) allow_tool ;;
    *) pass_prompt ;;
  esac
}

case "$mode" in
  submit)
    todos="$(newest_todos)"
    ctx="$(disclaimer "$todos")"
    mkdir -p "${root}/.local/tmp"
    printf '%s' "$ctx" > "$marker"
    jq -n --arg ctx "$ctx" '{continue: true, additional_context: $ctx}'
    exit 0
    ;;
  inject)
    if [ ! -f "$marker" ]; then
      allow_tool
    fi
    ctx="$(cat "$marker")"
    rm -f "$marker"
    jq -n --arg msg "$ctx" '{permission: "allow", agent_message: $msg}'
    exit 0
    ;;
  *)
    echo '{}'
    exit 0
    ;;
esac
