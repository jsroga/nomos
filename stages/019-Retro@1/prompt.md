Goal: # Domains catalog cleanup — ideal structure + full reference update

## Mission

Design the **ideal folder structure** for every module under `src/domains/`, then
**update every file in the repo that references old paths** (imports, re-exports,
tests, API routes, shared shims, docs, Fabro verify scopes). Behavior-preserving;
no new product features.

This is a **large, multi-sprint** effort — the plan may contain **50–100 todos**.
Do **not** under-scope the reference sweep: a move without updating all referrers
is a failed increment.

**Primary pain (operator):** `storyteller` has **~104 subdirectories** — far too
many top-level and nested folders. The operator wants Fabro to **propose** a
concrete target tree (fewer folders, §4-aligned), get human approval, then **execute
the moves and fix every import**.

**Scope:** all 9 domain modules:

| Module | ~dirs today | Notes |
|--------|-------------|--------|
| `storyteller` | 104 | **Worst sprawl** — design target tree first |
| `interior-designer` | 19 | Partial §4 skeleton |
| `loop-creator` | 12 | Agents + market-analyst subtree |
| `deduction-puzzle-designer` | 7 | Smaller |
| `world-building-toolkit` | 7 | Flat legacy → reshape per ARCHITECTURE worked example |
| `chat` | 6 | Cross-cutting UI |
| `game-design` | 3 | Thin |
| `3d-asset-exporter` | 3 | Asset module |
| `marketing` | 3 | Thin |

## Required deliverable: ideal structure (before code moves)

**Plan Author MUST write `STRUCTURE.md`** at repo root (overwrite stale copies).
This is the contract for implementation — not optional prose in `PLAN.md` alone.

For **each** module, `STRUCTURE.md` contains:

1. **Current tree** (top 2 levels + note on worst sprawl).
2. **Ideal target tree** (ASCII) — grounded in `docs/unified/ARCHITECTURE.md` §4.
   - Module root: only `index.ts`, `ui/`, `state/`, `io/`, `core/`, `services/`,
     `agents/`, `tasks/`, `prompts/`, `<module>.config.ts` (omit empty layers).
   - **Collapse rules** for storyteller: merge `core/*` one-folder-per-type into
     fewer `core/` units; fold `mentions/`, `hooks/`, `lib/`, `db/` into correct
     layers; keep `agents/` but reduce per-agent folder noise where sensible.
3. **Move map** — table `old_path → new_path` for every file that moves.
4. **Public barrel** — what `index.ts` exports after the reshape.
5. **Out of scope for this wave** — folders/files that stay put until a later wave.

**Storyteller gets the most detail** (full before/after). Other modules: at least
target tree + move map for files that move in the approved wave.

## Required deliverable: reference update (every referrer)

After the structure is approved, implementation MUST update **all referrers**, not
only files inside the module:

| Referrer class | Examples | Action |
|----------------|----------|--------|
| Intra-module imports | `../../core/Foo` | Rewrite to new paths |
| Cross-module deep imports | `@/domains/storyteller/agents/...` | Route through `index.ts` or new public path |
| App API routes | `src/app/api/storyteller/**` | Update imports to services/io/barrel |
| Shared shims | `src/shared/**`, `src/lib/**` | Update re-exports |
| DB layer | `src/db/**`, `src/domains/*/db/schema` | Align with unified schema plan |
| Hooks outside domain | `src/hooks/**` | Move or update imports per STRUCTURE |
| Tests | `**/__tests__/**`, `tests/**` | Fix paths + mocks |
| Config | `tsconfig.fabro-verify.json`, `knip`, `eslint` boundaries | Update include paths |
| Docs | `docs/internal/*.md`, `AGENTS.md` paths cited in code comments | Update when paths change |

**Plan Author** must include todos that run, per module/wave:

```bash
grep -rn "from '@/domains/<module>" src/ tests/
grep -rn "domains/<module>/" src/ tests/
```

…and assign **one todo per referrer batch** (or per directory of callers) so nothing
is missed. Expect **dozens of files** outside `src/domains/storyteller/` for
storyteller alone.

## Plan shape (`PLAN.md`)

1. **Executive summary**
2. **Pointer to `STRUCTURE.md`** — "implementation follows move map"
3. **Global prerequisites** (F-1…F-3 from SPEC)
4. **Per-module sections** with prioritized items
5. **Master todo list** (numbered 1…N, N may be 80–100):
   - Structure design todos (write/iterate `STRUCTURE.md`)
   - Move todos (git mv / codemod batches)
   - **Reference-update todos** (grep-driven, list affected files)
   - Barrel + boundary lint todos
   - Verification per wave
6. **Suggested waves**
7. **Deferred**

## Clarify gate (catalog-wide)

| Option | Posture |
|--------|---------|
| **A — Staged** | Finalize `STRUCTURE.md` for **all** modules; **implement Wave 1** only (storyteller ideal tree + full referrer update) after Verification. |
| **B — Plan-only** | `STRUCTURE.md` + `PLAN.md` + referrer inventory; **no moves** this run. |
| **C — Full catalog** | Structure for all; implement all waves + all referrers (many verify loops). |

Recommend **A**.

## Non-negotiables

- Ground ideal trees in `docs/unified/ARCHITECTURE.md` §4 + worked examples (§4 WBT).
- **No move without referrer audit** — every `PLAN.md` move item has a paired
  "update referrers" item listing grep patterns.
- Behavior-preserving; `npm run typecheck`, `npm run test:unit`, `node scripts/fabro-verify.mjs`.
- Use `refactor` skill for layer moves; codemod import paths in batches.
- Orchestration/agent logic: **move files first**; do not rewrite Mastra behavior in
  the same increment as folder collapse unless the plan explicitly says so.

## Assess focus

- Catalog table (9 modules vs §4)
- **Storyteller**: current vs ideal folder count estimate; top 10 folders to eliminate
- **Referrer heat map**: which modules have the most external deep imports
- `## Metadata` (`has_ui_surface: no` for structure-only Wave 1)

Run ID: 01KWKQ7AJDXMRYVKT8GKDGF7WA
Completed 18 stage(s) so far.

(13 earlier stage(s) omitted)

Recent stages:
- run_tests: succeeded (Script completed: npm run test:unit)
  - Script: `npm run test:unit`
  - Output:
    ```
    (193 lines omitted)
     [32m✓[39m src/evaluation/judges/__tests__/haute-game-judge.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 6[2mms[22m[39m
     [32m✓[39m src/domains/storyteller/config/__tests__/action-config.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 5[2mms[22m[39m
     [32m✓[39m src/domains/storyteller/agents/__tests__/schema-validation.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 10[2mms[22m[39m
     [32m✓[39m src/domains/storyteller/config/__tests__/tool-result-mapper.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 5[2mms[22m[39m
     [32m✓[39m src/domains/interior-designer/__tests__/terrain-cdt.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 4[2mms[22m[39m
     [32m✓[39m src/domains/chat/hooks/useChatStream.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 4[2mms[22m[39m
     [32m✓[39m src/trigger/providers/__tests__/legnext-upload-paint.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 3[2mms[22m[39m
     [32m✓[39m src/domains/loop-creator/agents/market-analyst/__tests__/api.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 5[2mms[22m[39m
     [32m✓[39m src/agent-core/agents/__tests__/agent-response.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 3[2mms[22m[39m
    [90mstderr[2m | tests/evaluation/judges.test.ts
    [22m[39m⚠️ Langfuse not configured - tracing disabled
    
     [32m✓[39m tests/evaluation/judges.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 3[2mms[22m[39m
    [90mstderr[2m | src/evaluation/judges/__tests__/judges.test.ts
    [22m[39m⚠️ Langfuse not configured - tracing disabled
    
     [32m✓[39m src/evaluation/judges/__tests__/judges.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 3[2mms[22m[39m
     [32m✓[39m src/domains/interior-designer/__tests__/terrain-quality.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 3[2mms[22m[39m
     [32m✓[39m src/domains/storyteller/services/context/__tests__/series-bible.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 2[2mms[22m[39m
     [32m✓[39m src/domains/storyteller/agents/tools/__tests__/storytelling.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 4[2mms[22m[39m
    
    [2m Test Files [22m [1m[32m35 passed[39m[22m[90m (35)[39m
    [2m      Tests [22m [1m[32m366 passed[39m[22m[90m (366)[39m
    [2m   Start at [22m 10:58:21
    [2m   Duration [22m 5.35s[2m (transform 1.38s, setup 326ms, import 6.13s, tests 4.95s, environment 688ms)[22m
    ```
- test_gate: succeeded (Conditional node evaluated: test_gate)
- run_e2e: failed [reason: Script failed with exit code: 1

## output
[39mnow()
[WebServer]  [90m 17 |[39m   [36mconst[39m {
[WebServer]  [90m 18 |[39m     data[33m:[39m { session }[33m,[39m[0m {
[WebServer]   digest: [32m'3295321978'[39m
[WebServer] }
[WebServer]  [31m[1m⨯[22m[39m Error: either NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY env variables or supabaseUrl and supabaseKey are required!
[WebServer]     at RootLayout (src/app/layout.tsx:37:47)
[WebServer] [0m [90m 35 |[39m   [36mconst[39m cookieStore [33m=[39m [36mawait[39m cookies()
[WebServer]  [90m 36 |[39m   [90m// @ts-expect-error - Next 15 cookies are async but auth-helpers expects a specific type that conflicts in this version[39m
[WebServer] [31m[1m>[22m[39m[90m 37 |[39m   [36mconst[39m supabase [33m=[39m createServerComponentClient({ cookies[33m:[39m () [33m=>[39m cookieStore })
[WebServer]  [90m    |[39m                                               [31m[1m^[22m[39m
[WebServer]  [90m 38 |[39m
[WebServer]  [90m 39 |[39m   [36mconst[39m {
[WebServer]  [90m 40 |[39m     data[33m:[39m { session }[33m,[39m[0m {
[WebServer]   digest: [32m'2783063273'[39m
[WebServer] }
[WebServer]  [31m[1m⨯[22m[39m Error: either NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY env variables or supabaseUrl and supabaseKey are required!
[WebServer]     at Page (src/app/page.tsx:15:47)
[WebServer] [0m [90m 13 |[39m   [36mconst[39m cookieStore [33m=[39m [36mawait[39m cookies()
[WebServer]  [90m 14 |[39m   [90m// @ts-expect-error - Next 15 cookies are async[39m
[WebServer] [31m[1m>[22m[39m[90m 15 |[39m   [36mconst[39m supabase [33m=[39m createServerComponentClient({ cookies[33m:[39m () [33m=>[39m cookieStore })
[WebServer]  [90m    |[39m                                               [31m[1m^[22m[39m
[WebServer]  [90m 16 |[39m   [36mconst[39m sessionStart [33m=[39m performance[33m.[39mnow()
[WebServer]  [90m 17 |[39m   [36mconst[39m {
[WebServer]  [90m 18 |[39m     data[33m:[39m { session }[33m,[39m[0m {
[WebServer]   digest: [32m'3295321978'[39m
[WebServer] }
[WebServer]  [31m[1m⨯[22m[39m Error: either NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY env variables or supabaseUrl and supabaseKey are required!
[WebServer]     at RootLayout (src/app/layout.tsx:37:47)
[WebServer] [0m [90m 35 |[39m   [36mconst[39m cookieStore [33m=[39m [36mawait[39m cookies()
[WebServer]  [90m 36 |[39m   [90m// @ts-expect-error - Next 15 cookies are async but auth-helpers expects a specific type that conflicts in this version[39m
[WebServer] [31m[1m>[22m[39m[90m 37 |[39m   [36mconst[39m supabase [33m=[39m createServerComponentClient({ cookies[33m:[39m () [33m=>[39m cookieStore })
[WebServer]  [90m    |[39m                                               [31m[1m^[22m[39m
[WebServer]  [90m 38 |[39m
[WebServer]  [90m 39 |[39m   [36mconst[39m {
[WebServer]  [90m 40 |[39m     data[33m:[39m { session }[33m,[39m[0m {
[WebServer]   digest: [32m'2783063273'[39m
[WebServer] }
[WebServer]  [31m[1m⨯[22m[39m Error: either NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY env variables or supabaseUrl and supabaseKey are required!
[WebServer]     at Page (src/app/page.tsx:15:47)
[WebServer] [0m [90m 13 |[39m   [36mconst[39m cookieStore [33m=[39m [36mawait[39m cookies()
[WebServer]  [90m 14 |[39m   [90m// @ts-expect-error - Next 15 cookies are async[39m
[WebServer] [31m[1m>[22m[39m[90m 15 |[39m   [36mconst[39m supabase [33m=[39m createServerComponentClient({ cookies[33m:[39m () [33m=>[39m cookieStore })
[WebServer]  [90m    |[39m                                               [31m[1m^[22m[39m
[WebServer]  [90m 16 |[39m   [36mconst[39m sessionStart [33m=[39m performance[33m.[39mnow()
[WebServer]  [90m 17 |[39m   [36mconst[39m {
[WebServer]  [90m 18 |[39m     data[33m:[39m { session }[33m,[39m[0m {
[WebServer]   digest: [32m'3295321978'[39m
[WebServer] }
Error: Timed out waiting 120000ms from config.webServer.

]
  - Script: `npm run test:e2e full-loop`
  - Output:
    ```
    (1966 lines omitted)
    [WebServer]   digest: [32m'3295321978'[39m
    [WebServer] }
    [WebServer]  [31m[1m⨯[22m[39m Error: either NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY env variables or supabaseUrl and supabaseKey are required!
    [WebServer]     at RootLayout (src/app/layout.tsx:37:47)
    [WebServer] [0m [90m 35 |[39m   [36mconst[39m cookieStore [33m=[39m [36mawait[39m cookies()
    [WebServer]  [90m 36 |[39m   [90m// @ts-expect-error - Next 15 cookies are async but auth-helpers expects a specific type that conflicts in this version[39m
    [WebServer] [31m[1m>[22m[39m[90m 37 |[39m   [36mconst[39m supabase [33m=[39m createServerComponentClient({ cookies[33m:[39m () [33m=>[39m cookieStore })
    [WebServer]  [90m    |[39m                                               [31m[1m^[22m[39m
    [WebServer]  [90m 38 |[39m
    [WebServer]  [90m 39 |[39m   [36mconst[39m {
    [WebServer]  [90m 40 |[39m     data[33m:[39m { session }[33m,[39m[0m {
    [WebServer]   digest: [32m'2783063273'[39m
    [WebServer] }
    [WebServer]  [31m[1m⨯[22m[39m Error: either NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY env variables or supabaseUrl and supabaseKey are required!
    [WebServer]     at Page (src/app/page.tsx:15:47)
    [WebServer] [0m [90m 13 |[39m   [36mconst[39m cookieStore [33m=[39m [36mawait[39m cookies()
    [WebServer]  [90m 14 |[39m   [90m// @ts-expect-error - Next 15 cookies are async[39m
    [WebServer] [31m[1m>[22m[39m[90m 15 |[39m   [36mconst[39m supabase [33m=[39m createServerComponentClient({ cookies[33m:[39m () [33m=>[39m cookieStore })
    [WebServer]  [90m    |[39m                                               [31m[1m^[22m[39m
    [WebServer]  [90m 16 |[39m   [36mconst[39m sessionStart [33m=[39m performance[33m.[39mnow()
    [WebServer]  [90m 17 |[39m   [36mconst[39m {
    [WebServer]  [90m 18 |[39m     data[33m:[39m { session }[33m,[39m[0m {
    [WebServer]   digest: [32m'3295321978'[39m
    [WebServer] }
    Error: Timed out waiting 120000ms from config.webServer.
    ```
- e2e_gate: succeeded (Conditional node evaluated: e2e_gate)
- screenshot: succeeded (Stage completed: screenshot)
  - Model: claude-sonnet-4-5, 5.7k tokens in / 1.7k out

## Context
- human.gate.Clarify.answer: C
- human.gate.Clarify.label: [C] Full blueprint
- human.gate.Clarify.question: Choose scope A, B, or C for this module (see Clarify Prep summary — table defines what each means here)
- human.gate.Verification.answer: A
- human.gate.Verification.label: [A] Approve & build
- human.gate.Verification.question: Plan is ready. [A] build · [B] plan only · [I] iterate (notes) · [X] abort — do not reuse Clarify's A/B/C here
- human.gate.label: [A] Approve & build
- human.gate.selected: A
- plan.has_p0_security_issue: yes
- plan.has_ui_surface: no


# Role: Retro (run retrospective)

Fabro's automatic retrospectives were removed in recent versions, so this stage
recreates that capability as a durable artifact. You run after Verification
(plan-only path) or after the optional build + tests + e2e path.

## The goal / target

# Domains catalog cleanup — ideal structure + full reference update

## Mission

Design the **ideal folder structure** for every module under `src/domains/`, then
**update every file in the repo that references old paths** (imports, re-exports,
tests, API routes, shared shims, docs, Fabro verify scopes). Behavior-preserving;
no new product features.

This is a **large, multi-sprint** effort — the plan may contain **50–100 todos**.
Do **not** under-scope the reference sweep: a move without updating all referrers
is a failed increment.

**Primary pain (operator):** `storyteller` has **~104 subdirectories** — far too
many top-level and nested folders. The operator wants Fabro to **propose** a
concrete target tree (fewer folders, §4-aligned), get human approval, then **execute
the moves and fix every import**.

**Scope:** all 9 domain modules:

| Module | ~dirs today | Notes |
|--------|-------------|--------|
| `storyteller` | 104 | **Worst sprawl** — design target tree first |
| `interior-designer` | 19 | Partial §4 skeleton |
| `loop-creator` | 12 | Agents + market-analyst subtree |
| `deduction-puzzle-designer` | 7 | Smaller |
| `world-building-toolkit` | 7 | Flat legacy → reshape per ARCHITECTURE worked example |
| `chat` | 6 | Cross-cutting UI |
| `game-design` | 3 | Thin |
| `3d-asset-exporter` | 3 | Asset module |
| `marketing` | 3 | Thin |

## Required deliverable: ideal structure (before code moves)

**Plan Author MUST write `STRUCTURE.md`** at repo root (overwrite stale copies).
This is the contract for implementation — not optional prose in `PLAN.md` alone.

For **each** module, `STRUCTURE.md` contains:

1. **Current tree** (top 2 levels + note on worst sprawl).
2. **Ideal target tree** (ASCII) — grounded in `docs/unified/ARCHITECTURE.md` §4.
   - Module root: only `index.ts`, `ui/`, `state/`, `io/`, `core/`, `services/`,
     `agents/`, `tasks/`, `prompts/`, `<module>.config.ts` (omit empty layers).
   - **Collapse rules** for storyteller: merge `core/*` one-folder-per-type into
     fewer `core/` units; fold `mentions/`, `hooks/`, `lib/`, `db/` into correct
     layers; keep `agents/` but reduce per-agent folder noise where sensible.
3. **Move map** — table `old_path → new_path` for every file that moves.
4. **Public barrel** — what `index.ts` exports after the reshape.
5. **Out of scope for this wave** — folders/files that stay put until a later wave.

**Storyteller gets the most detail** (full before/after). Other modules: at least
target tree + move map for files that move in the approved wave.

## Required deliverable: reference update (every referrer)

After the structure is approved, implementation MUST update **all referrers**, not
only files inside the module:

| Referrer class | Examples | Action |
|----------------|----------|--------|
| Intra-module imports | `../../core/Foo` | Rewrite to new paths |
| Cross-module deep imports | `@/domains/storyteller/agents/...` | Route through `index.ts` or new public path |
| App API routes | `src/app/api/storyteller/**` | Update imports to services/io/barrel |
| Shared shims | `src/shared/**`, `src/lib/**` | Update re-exports |
| DB layer | `src/db/**`, `src/domains/*/db/schema` | Align with unified schema plan |
| Hooks outside domain | `src/hooks/**` | Move or update imports per STRUCTURE |
| Tests | `**/__tests__/**`, `tests/**` | Fix paths + mocks |
| Config | `tsconfig.fabro-verify.json`, `knip`, `eslint` boundaries | Update include paths |
| Docs | `docs/internal/*.md`, `AGENTS.md` paths cited in code comments | Update when paths change |

**Plan Author** must include todos that run, per module/wave:

```bash
grep -rn "from '@/domains/<module>" src/ tests/
grep -rn "domains/<module>/" src/ tests/
```

…and assign **one todo per referrer batch** (or per directory of callers) so nothing
is missed. Expect **dozens of files** outside `src/domains/storyteller/` for
storyteller alone.

## Plan shape (`PLAN.md`)

1. **Executive summary**
2. **Pointer to `STRUCTURE.md`** — "implementation follows move map"
3. **Global prerequisites** (F-1…F-3 from SPEC)
4. **Per-module sections** with prioritized items
5. **Master todo list** (numbered 1…N, N may be 80–100):
   - Structure design todos (write/iterate `STRUCTURE.md`)
   - Move todos (git mv / codemod batches)
   - **Reference-update todos** (grep-driven, list affected files)
   - Barrel + boundary lint todos
   - Verification per wave
6. **Suggested waves**
7. **Deferred**

## Clarify gate (catalog-wide)

| Option | Posture |
|--------|---------|
| **A — Staged** | Finalize `STRUCTURE.md` for **all** modules; **implement Wave 1** only (storyteller ideal tree + full referrer update) after Verification. |
| **B — Plan-only** | `STRUCTURE.md` + `PLAN.md` + referrer inventory; **no moves** this run. |
| **C — Full catalog** | Structure for all; implement all waves + all referrers (many verify loops). |

Recommend **A**.

## Non-negotiables

- Ground ideal trees in `docs/unified/ARCHITECTURE.md` §4 + worked examples (§4 WBT).
- **No move without referrer audit** — every `PLAN.md` move item has a paired
  "update referrers" item listing grep patterns.
- Behavior-preserving; `npm run typecheck`, `npm run test:unit`, `node scripts/fabro-verify.mjs`.
- Use `refactor` skill for layer moves; codemod import paths in batches.
- Orchestration/agent logic: **move files first**; do not rewrite Mastra behavior in
  the same increment as folder collapse unless the plan explicitly says so.

## Assess focus

- Catalog table (9 modules vs §4)
- **Storyteller**: current vs ideal folder count estimate; top 10 folders to eliminate
- **Referrer heat map**: which modules have the most external deep imports
- `## Metadata` (`has_ui_surface: no` for structure-only Wave 1)


## Inputs

1. `PLAN.md` — the plan (approved or iterated).
2. `DECISIONS.md` — human choices from Clarify and Verification gates.
3. `findings/assess.md` — assessment.
4. `CLARIFY.md` — if present.
5. Run context: which stages ran, iterate loops, build path or plan-only.

## Output

Write **`RETRO.md`** at the repository root with `write_file`, and print the same
summary in your final response. One screen:

```
# Run Retro — <goal in a few words>

## Outcome
What was produced; plan-only vs built; approved or aborted.

## Stages
Scope → Assess → Clarify Prep → Clarify [human] → Plan → Verification [human]
→ (optional: UX → Implement → Lint → Tester → Unit → E2E) → Retro

## Human decisions
Summarize Clarify + Verification choices from DECISIONS.md.

## Top gaps & plan thrust
3 bullets from assessment + how the plan addressed them.

## Timing & cost
Per-stage wall-clock if known. Point to Billing tab / `fabro inspect <run>` for tokens.

## What worked / improve
2–3 process bullets.

## Follow-ups
Concrete next actions.
```

When `RETRO.md` is written, stop.