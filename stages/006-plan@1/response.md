All three deliverables are written. Here is the Verification summary.

**1. P0 declaration:** `P0 exists` — browser Supabase writes in world-building-toolkit: `store/useWorldStore.ts:356` (`projects.delete()`) and `components/AssetsPanel.tsx:61` (`assets.delete()`) bypass auth/RLS. Fixed in Wave 2 (items 27–29, 40).

**2. Your Clarify decision: [C] Full catalog.** In scope: `STRUCTURE.md` for all 9 modules **and** `PLAN.md` implementing **all 7 waves + every referrer update** — storyteller collapse, WBT P0 + god-store split, interior 1651-LOC store split, loop/chat/thin reshapes, 8 barrels, F-1 shared+lint, D-1 schema fold. Explicitly deferred: new features, Mastra behavior rewrites, skills flattening, wider `src/lib` migration.

**3. First shippable increment: Items 1–26 (Wave 0 foundations + full storyteller reshape with its complete 50-file referrer sweep).**

**4. Item count / effort:** 76 numbered todos across 8 waves. Increment 1 ≈ 3–4 dev days; full catalog ≈ 3–5 weeks with 8 verification loops.

**Plan summary (concrete refs):**
- `STRUCTURE.md` §1: storyteller 104→~55 dirs; `core/` 15→8 units; delete `hooks/`/`lib/`/`mentions/`/`tools/`/`config/` at root; `components/→ui/`; curated `index.ts` (~30 exports, drop the `db/schema` + `agents` firehose).
- §2: WBT §4 worked-example reshape + write-path fix + 864-LOC store split.
- §3: interior `store/useInteriorStore.ts` (**1651 LOC**, corrected from assess's ~500) → TanStack + `useInteriorUiStore`.
- §10: `src/shared/*` + boundary lint (F-1), `src/db/schema.ts` fold (D-1); update `tsconfig.fabro-verify.json` (3 scoped paths), `knip.json`, eslint bans.
- Corrections logged in `DECISIONS.md` (referrer files 50 not 250; WBT writes are `.delete()` not `insert:332`; interior 1651 LOC; marketing has 8 referrers).

**6. Verification reminder:** pick **[A] Approve & build** to implement, **[B]** for plan-only, **[I]** to request plan changes (type notes), **[X]** to abort. (Clarify's C is already decided — this gate's A/B/I/X is separate.)

```json
{
  "context_updates": {
    "plan.has_ui_surface": "no",
    "plan.has_p0_security_issue": "yes"
  }
}
```