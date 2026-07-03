All three deliverables are written. Summary for the Verification gate:

**1. P0 declaration:** `No P0` — no security/correctness defects; one near-miss caught: assess marked `src/workflows/` dead, but it's live via `src/app/api/workflows/game-design/route.ts:6` (disposition changed delete → move).

**2. Your Clarify decision: [C] Full src-root.**
- In scope: all 5 waves this run — ~460 import rewrites, all 16 legacy folders merged/moved/deleted, `pages/` migration, lint flips, docs/knip sweep.
- Explicitly deferred: `domains/*` internals, `evaluation/` overhaul, Mastra-tracing rewrite of `observability.ts`, `useAuthStore`→TanStack refactor.

**3. First shippable increment:** **Items 1–20 (Waves 0–1)** — fabro-verify src-root patch + codemod of the 6 existing `lib/` shims (252 sites) + retire `hooks/`, `store/`, `services/` (~35 more sites) + first lint flip to `error`.

**4. Item count / effort:** **58 items** across 5 waves; increment 1 ≈ 1–2 dev days; full run ≈ 5–7 dev days with 6 verify gates.

**5. Plan highlights:**
- `STRUCTURE.md` (rewritten for src-root): current 23-entry tree, ideal 8-entry tree, disposition for every folder, full move map (§4a codemod-only vs §4b git-mv), shim plan, out-of-scope list.
- Corrected counts vs assess: `@/lib` = 304 (not 168), `@/agent-core` = 30, `@/infrastructure` = 23; `components/ui/` already exists (170 imports) — no rename needed, just relocate 18 loose shell components.
- New homes: `shared/ai/` (ex-`infrastructure/ai`), `shared/tours/` (tour system scattered across 3 folders, ~32 imports — documented taxonomy extension), `app/_shell/` (chrome), `db/types.ts` (ex-`database.types.ts`).
- Infra fix: `scripts/fabro-verify.mjs` needs a small `src-root` mode (Item 1) — its module regex only handles `src/domains/<m>` scopes.
- Risk-flagged: `pages/api/mcp.ts` → app route (Item 53 has documented-exception fallback), agent-core move touches storyteller import lines only.
- Every move todo pairs with a grep-driven codemod + `[G]` zero-hit guard; lint groups flip `warn→error` per wave, never before.

**6. Verification reminder:** pick **[A] Approve & build** to implement, **[B]** for plan-only, **[I]** only if you want plan changes (type notes), **[X]** to abort.

```json
{
  "context_updates": {
    "plan.has_ui_surface": "no",
    "plan.has_p0_security_issue": "no"
  }
}
```