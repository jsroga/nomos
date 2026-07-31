#!/usr/bin/env bash
# Lightweight Mastra smoke before agent handover when Mastra paths were edited.
# Fail-open on infra; emit followup_message only on real smoke failures.
set -euo pipefail

root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$root"

hash=$(printf '%s' "$root" | shasum | cut -c1-12)
marker="${TMPDIR:-/tmp}/cursor-edited-mastra.${hash}"

if [ ! -f "$marker" ] || [ "$(wc -l < "$marker" | tr -d ' ')" -eq 0 ]; then
  echo '{}'
  exit 0
fi

set +e
out=$(node scripts/mastra-smoke.mjs --hook 2>&1)
smoke_status=$?
set -e

rm -f "$marker"

payload=$(printf '%s\n' "$out" | jq -c 'select(type=="object")' 2>/dev/null | tail -1 || true)

if [ -z "$payload" ]; then
  if [ "$smoke_status" -ne 0 ]; then
    jq -n --arg m "$out" '{
      followup_message: (
        "Mastra smoke failed before handover. Fix Mastra layout / Studio build, then stop again:\n\n" + ($m | .[0:4000])
      )
    }'
    exit 0
  fi
  echo '{}'
  exit 0
fi

ok=$(printf '%s' "$payload" | jq -r '.ok // empty' 2>/dev/null || true)
msg=$(printf '%s' "$payload" | jq -r '.user_message // empty' 2>/dev/null || true)

if [ "$ok" = "true" ]; then
  echo '{}'
  exit 0
fi

if [ -n "$msg" ]; then
  jq -n --arg m "$msg" '{
    followup_message: (
      "Mastra smoke failed before handover. Fix these issues, then stop again:\n\n" + $m
    )
  }'
  exit 0
fi

echo '{}'
exit 0
