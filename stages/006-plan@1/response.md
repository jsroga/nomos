`PLAN.md` and `DECISIONS.md` are updated. Stopping for Verification.

---

1. **P0 declaration:** **No P0** — no security/correctness defect found; worst finding is structural (dual Drizzle connection pools, `src/lib/db.ts` vs `src/db/index.ts`), filed as P1 Item 2.

2. **Your Clarify decision: [C] Full blueprint.** In scope: complete convergence plan for all 20 root folders — `shared/` creation, migration/deletion of 12 legacy roots, `mcp`/`evaluation`/`workflows` relocation, components redistribution, services reconciliation. Explicitly deferred: schema inversion fix (`src/db/schema.ts:21`), gateway delete-vs-Mastra decision, `pages/api/mcp.ts` App Router migration, trigger task body rewrites, domain internals.

3. **First shippable increment: Items 1–4** — `shared/` skeleton + ESLint boundary rules, Drizzle client consolidation into `src/db/client.ts`, seeding `shared/auth|errors|data` from `lib/`/`store/`/`hooks/` via move+shim, and dissolving root `services/` (24 developer substeps, build stays green throughout).

4. **14 items total; increment 1 ≈ 1–2 dev days; full blueprint ≈ 2 weeks across 4 increments.**

5. Plan summary:
   - **Corrections to assess** (spot-checked): domains import legacy roots **170 times** (not zero) → strategy is *move + re-export shim → codemod → delete shims*; `services/storyteller.service.ts` (418 LOC) is an MCP adapter to **move**, not a duplicate to delete; `pages/api/mcp.ts` (MCP SSE) makes `pages/` non-deletable; `src/trigger/` holds 4,877 LOC of task bodies (not a thin registry).
   - **P1:** `shared/` skeleton + `no-restricted-imports` in `eslint.config.js` (Items 1); db client → `src/db/client.ts` (Item 2); `lib/auth|security|error-utils|utils|api-utils`, stores, hooks → `shared/*` (Item 3); root `services/` → `domains/storyteller/services/StorytellerCrudService.ts` + `shared/data/` (Item 4).
   - **P2:** `agent-core/` → `shared/agent-kernel` + `shared/observability` (Item 5); `prompts/` split (Item 6); `infrastructure/` dissolution incl. gateway kept as `shared/agent-kernel/gateway/` (Item 7); misc roots (Item 8); `workflows/` (Item 9); components redistribution (Item 10); codemod + shim deletion + lint→error (Item 11).
   - **P3:** `evaluation/` → `scripts/` (Item 12); trigger thinning via pure moves + re-exports (Item 13); `pages/` documented-minimal (Item 14).

6. **Verification reminder:** pick **[A] Approve & build** to implement, **[B]** for plan-only, **[I]** only if you want plan changes (type notes), **[X]** to abort. Clarify's A/B/C are already decided — don't type `A` expecting build unless choosing option **[A]** on this gate.

```json
{
  "context_updates": {
    "plan.has_ui_surface": "no",
    "plan.has_p0_security_issue": "no"
  }
}
```