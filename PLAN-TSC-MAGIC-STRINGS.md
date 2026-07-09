# Plan: TSC errors (~1k) + magic strings (~14k) → zero

**Goal:** Every `src/**/*.{ts,tsx}` file is `clean` or `exempt` in [`SRC-QUALITY-TRACKER.md`](SRC-QUALITY-TRACKER.md).  
**Ledger:** one row per file — regenerate with `node scripts/refresh-src-quality-tracker.mjs`.

| Baseline (2026-07-09) | Count |
|-----------------------|------:|
| Magic-string ESLint violations | ~14,000 |
| TSC errors (slice estimate) | ~1,000 |
| `src/` TS/TSX files | 736 |

**Done when:** `refresh-src-quality-tracker` summary shows **0 err / 0 viol** (exempt rows only).

---

## Step 0 — Cursor fast hooks (ship first)

- [x] `scripts/typecheck-scoped.mjs` — `--files` MVP (+ full slices)
- [x] `scripts/qualitygate/fast.mjs` — TSC + ESLint on touched files
- [x] `.cursor/hooks/record-src-edits.sh` — track all `src/` edits
- [x] `.cursor/hooks/fast-verify-on-stop.sh` — run fast gate on `stop`
- [x] [`.cursor/hooks.json`](.cursor/hooks.json) — wire hooks; remove `fabro-verify` from `stop`
- [ ] [`.cursor/rules/quality-gates.mdc`](.cursor/rules/quality-gates.mdc) — fast vs full tiers (partially done)

---

## Step 1 — Tooling + npm scripts

- [x] `npm run typecheck:scoped` / `typecheck:fast` / `typecheck:file` / `verify:fast` / `qualitygate:tracker -- --skip-tsc`
- [x] Wire [`fabro-verify.mjs`](scripts/fabro-verify.mjs) + [`pre-commit-typecheck.mjs`](scripts/pre-commit-typecheck.mjs) to scoped runner
- [x] `.agents/skills/typecheck-scoped/SKILL.md`

---

## Step 2 — Tracker bootstrap

- [x] [`scripts/refresh-src-quality-tracker.mjs`](scripts/refresh-src-quality-tracker.mjs)
- [x] Initial [`SRC-QUALITY-TRACKER.md`](SRC-QUALITY-TRACKER.md) — all 725 files listed
- [ ] Refresh with full TSC scan (`npm run qualitygate:tracker -- --skip-tsc` without `--skip-tsc`)

---

## Step 3 — Fix ALL TSC errors (~1k → 0)

### TS-0 — Central Mastra model typing (~50–100 errors, many files)

- [x] `toMastraModelId` / `StorytellerMastraModel` in [`ModelConfig.ts`](src/domains/storyteller/config/ModelConfig.ts)
- [x] `BeatPlannerAgent` scoped TSC clean

### TS-1 — TS6133 unused locals/params (~200–300)

Per slice; align with ESLint `unused-imports/no-unused-vars`:

| Slice | Est. errors | Status |
|-------|------------:|--------|
| `components` | ~145 | [ ] |
| `shared` | ~220 | [ ] |
| `interior-designer` | ~188 | [ ] |
| `storyteller` domain | ~106 | [ ] |
| `chat` | ~90 | [ ] |
| `app-workspace` | ~426 | [ ] |
| remaining domains | TBD | [ ] |

**Rule:** remove dead bindings · prefix `_` when intentional · drop unused destructure fields.

### TS-2 — DOM `Event` vs `React.MouseEvent` (~30–50)

- [ ] [`storyteller/page.tsx`](src/app/(workspace)/[projectId]/storyteller/page.tsx)
- [ ] [`WorldBiblePanel.tsx`](src/domains/storyteller/ui/WorldBiblePanel/WorldBiblePanel.tsx)
- [ ] [`Sidebar.tsx`](src/domains/world-building-toolkit/ui/Sidebar/Sidebar.tsx)
- [ ] Use `customEventDetailRecord` / correct handler types

### TS-3 — Remaining slice errors → 0

Run `npm run typecheck` (`--all-slices`) until **0 TSC errors** repo-wide.

- [ ] `app-api-*` sub-slices (split to avoid OOM)
- [ ] All `domain-*` slices green
- [ ] `ignoreBuildErrors: false` in [`next.config.js`](next.config.js)

---

## Step 4 — Fix ALL magic strings (~14k → 0)

Verify each wave: `npx eslint <scope> --quiet` + `npm run qualitygate:tracker -- --skip-tsc`.  
**Pattern:** `ActionType.FOO` not `'FOO'` · shared constants for HTTP/errors/headers.

### MS-0 — Shared protocol constants (~2k violations)

Create [`src/shared/data/constants/protocol.ts`](src/shared/data/constants/protocol.ts):

- [x] `ApiErrorMessage`, `HttpHeader`, `HttpStatus`, `ActionApiResultType`
- [ ] Migrate all `src/shared/**` + `src/app/api/**` top offenders

### MS-1 — Storyteller wire (~3k)

Enums exist in [`Enums.ts`](src/domains/storyteller/core/types/Enums.ts) — replace every literal call site:

| File (tracker rows) | Est. viol | Status |
|---------------------|----------:|--------|
| `storyteller/page.tsx` | 366 | [ ] |
| `app/api/storyteller/actions/route.ts` | high | [ ] |
| `WorldBiblePanel.tsx` | 19 | [ ] |
| `useChatStream.test.ts` | few | [ ] |
| all other storyteller + app/storyteller rows | TBD | [ ] |

### MS-2 — API routes `src/app/api/**` (~2k)

- [ ] `app-api-storyteller` slice
- [ ] `app-api-entities` slice
- [ ] `app-api-auth`, `app-api-world`, `app-api-rest`
- [ ] Every tracker row under `src/app/api/` → `clean` or `exempt`

### MS-3 — Domains (~4k)

| Module | Status |
|--------|--------|
| `interior-designer` | [ ] |
| `world-building-toolkit` | [ ] |
| `loop-creator` | [ ] |
| `marketing` | [ ] |
| `chat` | [ ] |
| `game-design` | [ ] |
| remaining | [ ] |

### MS-4 — `components/` + `shared/` remainder (~3k)

- [ ] Radix re-export unused + string literals
- [ ] Log tags, `stage`, `progress`, field-name strings → enums/constants

### MS-5 — Repo-wide zero

- [ ] `npx eslint src --quiet` → **0** `local/no-magic-string`
- [ ] Tracker: **0** `N viol` rows (only `exempt` + `clean`)
- [ ] Optional: `allowJsx: false` for UI copy (separate pass)

---

## Step 5 — File-by-file completion (tracker-driven)

**Process for every non-exempt row still not `clean`:**

1. Pick file from [`SRC-QUALITY-TRACKER.md`](SRC-QUALITY-TRACKER.md) (highest `N err` + `N viol` first)
2. `npm run typecheck:file -- <path>` + `npx eslint <path>`
3. Fix all TSC + magic-string issues in that file
4. `npm run qualitygate:tracker -- --skip-tsc` — row must flip to `clean`
5. Repeat until summary:

```
TSC:      0 err · 0 pending
MagicStr: 0 viol · 0 pending
```

**Exempt rows** (no fix required): `Enums.ts`, `*-wire.ts`, `constants/`, `agent-schemas.ts`, `*.d.ts`

---

## Verification gates (must all pass)

```bash
npm run verify:fast          # touched files
npm run typecheck            # all slices, 0 errors
npm run lint                 # 0 errors (incl. magic-string)
npm run qualitygate:tracker -- --skip-tsc      # ledger matches reality
npm run test:unit
node scripts/fabro-verify.mjs  # before commit / execute handoff
```

---

## Progress log

| Date | Done | Notes |
|------|------|-------|
| 2026-07-09 | Plan created | Baseline ~14k magic / ~1k TSC |
| | | |
