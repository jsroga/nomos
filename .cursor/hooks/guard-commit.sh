#!/usr/bin/env bash
# guard-commit.sh — beforeShellExecution, matcher: git commit
# Blocks --no-verify / -n so husky pre-commit (unit tests + production build) always runs.
# Agents must run `npm run precommit` before committing when the user asks to commit.
set -euo pipefail

input=$(cat)
command=$(echo "$input" | jq -r '.command // empty' 2>/dev/null || true)

[ -n "$command" ] || {
  echo '{"permission":"allow"}'
  exit 0
}

# Only gate real git-commit invocations (matcher may still fire loosely).
scan="$command"
while [[ "$scan" =~ \'([^\']|\\.)*\' ]]; do
  scan="${scan//${BASH_REMATCH[0]}/}"
done
while [[ "$scan" =~ \"([^\"\\]|\\.)*\" ]]; do
  scan="${scan//${BASH_REMATCH[0]}/}"
done
if [[ "$scan" == *"<<"* ]]; then
  scan="${scan%%<<*}"
fi

if ! echo "$scan" | grep -qE '(^|[[:space:];|&])git[[:space:]]+commit([[:space:]]|$)'; then
  echo '{"permission":"allow"}'
  exit 0
fi

# Block hook skips — husky runs architecture, docs, typecheck, eslint, test:unit, build.
if echo "$scan" | grep -qE '(^|[[:space:]])--no-verify([[:space:]]|$)|(^|[[:space:]])-n([[:space:]]|$)'; then
  cat <<'JSON'
{
  "permission": "deny",
  "user_message": "Blocked git commit --no-verify. Commits must run husky pre-commit (unit tests + production build).",
  "agent_message": "Do not skip git hooks. When the user asks to commit: (1) run `npm run precommit` (or `npm run test:unit` + `npm run build`), fix failures, (2) then `git commit` without --no-verify. Husky `.husky/pre-commit` → `scripts/pre-commit.mjs` re-checks the same gates. See .cursor/rules/commit-gates.mdc."
}
JSON
  exit 2
fi

cat <<'JSON'
{
  "permission": "allow",
  "agent_message": "Commit allowed. Husky will run pre-commit gates (incl. test:unit + production build). If you have not already run `npm run precommit` this turn, prefer running it first so failures are fixed before the commit hook."
}
JSON
exit 0
