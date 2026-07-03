# Scope (deterministic — shell only)

Run the commands below **exactly** via the shell tool. Paste their **full stdout**
as your response. Do not analyze, summarize, or skip output.

Target module: `{{ inputs.module }}`

```bash
echo "=== module: {{ inputs.module }} ==="
find "src/domains/{{ inputs.module }}" -type f | sort | head -120
echo
echo "=== git status ==="
git status --short
echo
echo "=== architecture contract ==="
ls -la docs/unified/ARCHITECTURE.md docs/unified/SPEC.md 2>&1
```

If `find` returns nothing, still report that — do not substitute another module.
