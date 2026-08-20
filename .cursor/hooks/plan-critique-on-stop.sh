#!/usr/bin/env bash
# stop hook — when a plan file landed this turn, auto-submit one follow-up that
# expands todos and critiques weak spots. Fail-open; never loop past loop_limit.
set -euo pipefail

input=$(cat)
file_path=$(echo "$input" | jq -r '.file_path // empty' 2>/dev/null || true)
[ -z "$file_path" ] || exit 0

status=$(echo "$input" | jq -r '.status // "completed"' 2>/dev/null || echo completed)
loop_count=$(echo "$input" | jq -r '.loop_count // 0' 2>/dev/null || echo 0)
conversation_id=$(echo "$input" | jq -r '.conversation_id // .session_id // "none"' 2>/dev/null || echo none)

if [ "$status" != "completed" ]; then
  echo '{}'
  exit 0
fi
if [ "${loop_count:-0}" -ge 1 ]; then
  echo '{}'
  exit 0
fi

root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
hash=$(printf '%s' "$root" | shasum | cut -c1-12)
marker="${TMPDIR:-/tmp}/cursor-plan-written.${hash}"
stamp="${TMPDIR:-/tmp}/cursor-plan-critique.${hash}.${conversation_id}"

if [ -f "$stamp" ]; then
  rm -f "$marker"
  echo '{}'
  exit 0
fi

has_marker=0
if [ -f "$marker" ] && [ "$(wc -l < "$marker" | tr -d ' ')" -gt 0 ]; then
  has_marker=1
fi

recent_plan=0
if [ "$has_marker" -eq 0 ]; then
  for dir in "$root/.cursor/plans" "${HOME}/.cursor/plans"; do
    [ -d "$dir" ] || continue
    if find "$dir" -type f \( -name 'PLAN.md' -o -name '*.plan.md' \) -mmin -2 2>/dev/null | grep -q .; then
      recent_plan=1
      break
    fi
  done
  if [ -f "$root/PLAN.md" ]; then
    if find "$root/PLAN.md" -type f -mmin -2 2>/dev/null | grep -q .; then
      recent_plan=1
    fi
  fi
fi

if [ "$has_marker" -eq 0 ] && [ "$recent_plan" -eq 0 ]; then
  echo '{}'
  exit 0
fi

rm -f "$marker"
: > "$stamp"

jq -n --arg m "$(cat <<'EOF'
The plan for this turn just landed. Do not implement, do not switch to Agent/Build, and do not start coding.

1. Expand the todo list so each item is concrete and checkable: path/file, what done looks like, and the gate (qualitygate:file, unit test). Split vague steps.
2. Hunt for weak spots in the plan: overbuild, deleting existing behavior, missing edge cases, wrong layer (app vs domain), cross-domain imports, unverified UI via browser, skipped gates, magic strings, eslint-disable. Fix those in the plan.
3. Update the plan file and todos in place, then stop.
EOF
)" '{ followup_message: $m }'
exit 0
