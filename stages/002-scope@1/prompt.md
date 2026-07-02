Goal: Clean up and align the interior-designer module (src/domains/interior-designer) with the target architecture in docs/unified/ARCHITECTURE.md (module blueprint, dependency rule, non-negotiable invariants). Produce a prioritized plan; implement only after human approval at Verification.
Run ID: 01KWGSZM6PEMNXFEF1Q3NQ3B3N
Completed 1 stage(s) so far.


# Scope (deterministic — shell only)

Run the commands below **exactly** via the shell tool. Paste their **full stdout**
as your response. Do not analyze, summarize, or skip output.

Target module: `interior-designer`

```bash
echo "=== module: interior-designer ==="
find "src/domains/interior-designer" -type f | sort | head -120
echo
echo "=== git status ==="
git status --short
echo
echo "=== architecture contract ==="
ls -la docs/unified/ARCHITECTURE.md docs/unified/SPEC.md 2>&1
```

If `find` returns nothing, still report that — do not substitute another module.