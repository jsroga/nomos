# Scope (deterministic — shell only)

Run the commands below **exactly** via the shell tool. Paste their **full stdout**
as your response. Do not analyze, summarize, or skip output.

Target: `{{ inputs.module }}` (`domains-catalog` = all `src/domains/` · `src-root` = top-level `src/`)

```bash
MOD="{{ inputs.module }}"
echo "=== target: $MOD ==="
if [ "$MOD" = "src-root" ]; then
  echo "=== src/ top-level (target topology audit) ==="
  ls -1 src/
  echo
  echo "=== directory counts (top-level folders) ==="
  for d in src/*/; do
    name=$(basename "$d")
    dirs=$(find "$d" -type d 2>/dev/null | wc -l | tr -d ' ')
    files=$(find "$d" -type f 2>/dev/null | wc -l | tr -d ' ')
    echo "$name: $dirs dirs, $files files"
  done
  echo
  echo "=== root files (middleware, instrumentation) ==="
  ls -1 src/*.{ts,tsx,js} 2>/dev/null || true
  echo
  echo "=== shared/ skeleton ==="
  ls -1 src/shared/ 2>/dev/null || echo "(missing)"
  echo
  echo "=== legacy import heat (sample counts) ==="
  for pat in "@/lib" "@/agent-core" "@/hooks" "@/infrastructure" "@/store" "@/services"; do
    c=$(grep -r "$pat" src/ tests/ --include='*.ts' --include='*.tsx' 2>/dev/null | wc -l | tr -d ' ')
    echo "$pat: $c lines"
  done
  echo
  echo "=== domains/ (out of scope for moves — referrer context only) ==="
  ls -1 src/domains/
elif [ "$MOD" = "domains-catalog" ]; then
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

For `src-root`, read `.fabro/workflows/plan/goals/src-root-cleanup.md` if present.
