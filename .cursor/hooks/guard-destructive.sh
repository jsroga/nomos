#!/usr/bin/env bash
# guard-destructive.sh — beforeShellExecution gate. Blocks commands that could wipe work
# or rewrite history. Dark-factory safety. Returns permission:deny + exit 2 to block.
set -euo pipefail

input=$(cat)
command=$(echo "$input" | jq -r '.command // empty' 2>/dev/null || true)

[ -n "$command" ] || exit 0

# Strip quoted strings and heredoc bodies before scanning — PR bodies / commit messages
# may mention "git push --force" without intending to run it.
scan="$command"
# Remove single-quoted strings
while [[ "$scan" =~ \'([^\']|\\.)*\' ]]; do
  scan="${scan//${BASH_REMATCH[0]}/}"
done
# Remove double-quoted strings
while [[ "$scan" =~ \"([^\"\\]|\\.)*\" ]]; do
  scan="${scan//${BASH_REMATCH[0]}/}"
done
# Remove heredoc bodies — only scan the command prefix before <<
if [[ "$scan" == *"<<"* ]]; then
  scan="${scan%%<<*}"
fi

# Token-boundary patterns — must not match inside quoted/heredoc text (already stripped).
destructive_re='(^|[[:space:];|&])(rm[[:space:]]+(-[a-zA-Z]*r[a-zA-Z]*f|--force)[[:space:]]+(/|~|\$HOME|\*|[.][.]))|(^|[[:space:];|&])git[[:space:]]+push[[:space:]]+(-f|--force)|(^|[[:space:];|&])git[[:space:]]+push[[:space:]]+[^[:space:]]+[[:space:]]+(-f|--force)|(^|[[:space:];|&])git[[:space:]]+reset[[:space:]]+--hard|(^|[[:space:];|&])git[[:space:]]+clean[[:space:]]+(-[a-zA-Z]*d[a-zA-Z]*|-[a-zA-Z]*f[a-zA-Z]*)|(^|[[:space:];|&])mkfs|(^|[[:space:];|&])dd[[:space:]]+.*of=/dev/|(^|[[:space:];|&])chmod[[:space:]]+-R[[:space:]]+000'

if echo "$scan" | grep -qE "$destructive_re"; then
  cat <<JSON
{
  "permission": "deny",
  "user_message": "Blocked destructive command: $command",
  "agent_message": "The command was blocked by the .cursor/hooks/guard-destructive.sh hook (dark-factory safety). Destructive operations (rm -rf root/home, git push --force, git reset --hard, git clean -fd, mkfs, dd to a device, chmod -R 000) are not allowed unattended. Use a targeted path, a non-destructive alternative, or ask the operator to run it manually."
}
JSON
  exit 2
fi

cat <<'JSON'
{ "permission": "allow" }
JSON
exit 0
