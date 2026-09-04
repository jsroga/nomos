#!/usr/bin/env bash
# stop hook — after a plan lands this turn, require e2e before treating the
# plan as done. Fail-open on infra; one follow-up max (loop_limit).
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
stamp="${TMPDIR:-/tmp}/cursor-plan-e2e-required.${hash}.${conversation_id}"

if [ -f "$stamp" ]; then
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

: > "$stamp"

jq -n --arg m "$(cat <<'EOF'
A plan for this turn just completed. Before you claim done or commit:

1. Run e2e without asking — load `.env.local` so `E2E_BYPASS_AUTH_SECRET` is set, then `npm run test:e2e smoke` (or the scoped Playwright suite the plan named).
2. If e2e fails, fix and re-run. Do not treat qualitygate/unit alone as plan exit.
3. Only after e2e is green: run precommit if committing, then stop.

If the user asked "is e2e passing / done?" and it was not run, run it immediately — do not ask permission.
EOF
)" '{ followup_message: $m }'
exit 0
