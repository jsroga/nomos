# Scope (deterministic — shell only)

Run the commands below **exactly** via the shell tool. Paste their **full stdout**
as your response. Do not analyze, summarize, or skip output.

Target: `{{ inputs.module }}` (use `domains-catalog` for full `src/domains/` sweep)

```bash
MOD="{{ inputs.module }}"
echo "=== target: $MOD ==="
if [ "$MOD" = "domains-catalog" ]; then
  echo "=== domains catalog (all modules) ==="
  ls -1 src/domains/
  echo
  echo "=== directory counts per module ==="
  for d in src/domains/*/; do
    name=$(basename "$d")
    dirs=$(find "$d" -type d | wc -l | tr -d ' ')
    files=$(find "$d" -type f | wc -l | tr -d ' ')
    echo "$name: $dirs dirs, $files files"
  done
  echo
  echo "=== storyteller top-level (sprawl sample) ==="
  ls -1 src/domains/storyteller/
  echo
  echo "=== index.ts barrels ==="
  find src/domains -maxdepth 2 -name 'index.ts' | sort
  echo
  echo "=== deep imports from app (sample) ==="
  grep -rh "from '@/domains/" src/app --include='*.ts' --include='*.tsx' 2>/dev/null | sed 's/.*from /@/domains/' | sort -u | head -40
else
  find "src/domains/$MOD" -type f | sort | head -120
  echo
  echo "=== top-level folders ==="
  ls -1 "src/domains/$MOD/"
fi
echo
echo "=== git status ==="
git status --short
echo
echo "=== architecture contract ==="
ls -la docs/unified/ARCHITECTURE.md docs/unified/SPEC.md 2>&1
```

If `find` returns nothing for a single-module run, still report that — do not
substitute another module.

For `domains-catalog`, read `.fabro/workflows/plan/goals/domains-catalog-cleanup.md`
if present — it is the operator briefing for this run.
