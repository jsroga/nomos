`PLAN.md`, `STRUCTURE.md`, and `DECISIONS.md` are all written. Stopping for Verification.

---

1. **P0 declaration:** **P0 exists** — WBT browser→Supabase writes + 864-LOC god `useWorldStore` (`store/useWorldStore.ts`, assess `:332`); fixed in Wave 3 (todos 43–50).

2. **Your Clarify decision: [C] Full catalog.**
   In scope: `STRUCTURE.md` ideal trees + move maps for all 9 modules; implement all waves (storyteller 102→~60 dirs, WBT security reshape, interior-designer dual-skeleton merge, loop-creator/chat/4 small modules, task co-location) + ~104 external referrer files + config/docs referrers.
   Explicitly deferred: schema content merge (D-1), Mastra A-stream rewrites, god-component splits, `useInteriorStore` split, `api/world/*` URL consolidation, chat→shared decision.

3. **First shippable increment: todos 1–25 — baseline + storyteller reshape (rows S1–S30) with the full 50-file referrer sweep** (API routes ×30, services shim, MCP, evaluation, tests, chat, eslint/fabro-verify config).

4. **Item count:** 90 numbered todos across 8 waves; 7 prioritized items (1×P0, 3×P1, 2×P2, 1×P3). Increment 1 ≈ 2–3 dev days; full catalog ≈ 2–3 weeks with per-wave verify gates.

5. Plan summary:
- `STRUCTURE.md` rewritten (stale pre-migration copy superseded) — full before/after + move maps: S1–S37, W1–W23, I1–I30, L1–L12, C1–C12, G1–G5, D1–D5, A1–A6, M1–M9.
- Corrections to assess recorded: storyteller **already has** `index.ts` + eslint guard; no schema inversion; `useInteriorStore.ts` = **1,651 LOC** (bigger than WBT's store); `src/shared/` already exists as S15's landing zone.
- Waves: 0 baseline → 1 storyteller → 2 barrels + referrer lockdown (8 modules) → 3 WBT P0 → 4 interior-designer → 5 loop-creator/chat/small → 6 task co-location (`src/trigger/` → `domains/*/tasks/*.task.ts` + registry) → 7 lint-to-error + docs/knip closing.
- Every move todo is paired with grep-driven referrer todos with expected counts; config referrers (`tsconfig.fabro-verify.json`, `knip.json`, `eslint.config.js:172-240`, `trigger.config.*`) updated in-wave.

6. **Verification reminder:** pick **[A] Approve & build** to implement, **[B]** for plan-only, **[I]** only if you want plan changes (type notes), **[X]** to abort. (Clarify's A/B/C are already decided — do not type `A` expecting build unless you choose **[A]** on this gate.)

```json
{
  "context_updates": {
    "plan.has_ui_surface": "no",
    "plan.has_p0_security_issue": "yes"
  }
}
```