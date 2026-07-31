#!/usr/bin/env bash
# stop hook — run simple qualitygate on files touched this turn (or git-changed
# src/** as fallback). On failure, emit followup_message so the agent fixes
# before handover. Fail-open on infra errors; only loop on real gate failures.
set -euo pipefail

input=$(cat)
# afterFileEdit payloads have file_path — ignore those (record-src-edits handles them).
file_path=$(echo "$input" | jq -r '.file_path // empty' 2>/dev/null || true)
[ -z "$file_path" ] || exit 0

status=$(echo "$input" | jq -r '.status // "completed"' 2>/dev/null || echo completed)
loop_count=$(echo "$input" | jq -r '.loop_count // 0' 2>/dev/null || echo 0)

# Skip aborted/errored turns and already-retried follow-ups beyond loop_limit.
if [ "$status" != "completed" ]; then
  echo '{}'
  exit 0
fi
if [ "${loop_count:-0}" -ge 2 ]; then
  echo '{}'
  exit 0
fi

root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$root"

hash=$(printf '%s' "$root" | shasum | cut -c1-12)
marker="${TMPDIR:-/tmp}/cursor-edited-src.${hash}"

had_marker=0
if [ -f "$marker" ] && [ "$(wc -l < "$marker" | tr -d ' ')" -gt 0 ]; then
  had_marker=1
fi

# Prefer files edited this turn (marker). Fall back to git-changed src/**.
if [ "$had_marker" -eq 1 ]; then
  # Do NOT delete marker before the gate — qualitygate --from-marker reads it.
  gate_args=(changed --from-marker --hook)
else
  gate_args=(changed --hook)
fi

set +e
out=$(node scripts/qualitygate.mjs "${gate_args[@]}" 2>&1)
gate_status=$?
set -e

# Clear marker after the run (success or fail) so the next turn starts clean.
rm -f "$marker"

# qualitygate --hook always exits 0 today and prints { user_message }. Parse it
# and upgrade failures to followup_message for the stop loop.
payload=$(printf '%s\n' "$out" | jq -c 'select(type=="object")' 2>/dev/null | tail -1 || true)

if [ -z "$payload" ]; then
  echo '{}'
  exit 0
fi

ok=$(printf '%s' "$payload" | jq -r '.ok // empty' 2>/dev/null || true)
msg=$(printf '%s' "$payload" | jq -r '.user_message // empty' 2>/dev/null || true)

if [ "$ok" = "true" ]; then
  echo '{}'
  exit 0
fi

if [ -z "$msg" ]; then
  echo '{}'
  exit 0
fi

# Fallback when older qualitygate builds omit `ok`
if [ "$ok" = "" ]; then
  summary_ok=0
  case "$msg" in
    *' — clean'|*'skip'*|*'no src TS files'*) summary_ok=1 ;;
  esac
  if printf '%s' "$msg" | grep -Eq 'TSC 0 · ESLint 0 · metrics 0e'; then
    summary_ok=1
  fi
  if [ "$summary_ok" -eq 1 ]; then
    echo '{}'
    exit 0
  fi
fi

followup=$(printf '%s' "$msg" | head -c 6000)
jq -n --arg m "$followup" '{
  followup_message: (
    "Quality gate failed on changed files before handover. Fix these issues (do not disable lint rules), then stop again:\n\n" + $m
  )
}'
exit 0
