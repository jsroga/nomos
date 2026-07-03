## Assessment Complete

I've analyzed the src-root structure against the target topology and written findings to `findings/assess.md`.

**Key discoveries:**

1. **Good progress:** F-1 (staged migration) already 85% done from Increment 1 — `shared/` stubs exist, `lib/auth` and `lib/api-utils` are now 3-line re-export shims

2. **Scope:** 23 top-level folders, only 7 aligned with target → 16 legacy folders to migrate/delete

3. **Import chaos quantified:**
   - 168+ `@/lib` imports (140 via shims, 28 real files unmigrated)
   - 25 `@/agent-core` imports (duplication with `shared/agent-kernel`)
   - 20 `@/store` imports (global state sprawl)
   - 18 `@/infrastructure` imports (AI clients scattered)
   - 9 `@/hooks` imports (already moved to `shared/data/`, shims missing)

4. **Critical duplication:** `agent-core/observability.ts` (459 LOC manual Langfuse spans) duplicates Mastra AI Tracing — ARCHITECTURE §1.1 violation

5. **Staged execution:** Wave 1 = codemod shims (~170 imports), Wave 2 = merge sources (~60 imports + folder moves)

**Top 3 priorities:**
1. Codemod `@/lib` shim users (140 sites) → `@/shared/*`
2. Add + codemod `@/hooks` shims (9 sites) → `@/shared/data/*`
3. Add `@/store` shims (20 sites) → `shared/errors|jobs|auth`

The findings include a full disposition table, heat map, and SPEC F-1 readiness check. Ready for Clarify stage to choose Wave 1 (recommended) vs. full execution.