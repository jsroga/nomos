Goal: # src-root cleanup — ideal top-level `src/` layout + full reference update

## Mission

Design the **ideal top-level `src/` folder structure** per
`docs/unified/ARCHITECTURE.md` §3 (Repository topology), then **update every file
that references old paths** (imports, re-exports, tests, API routes, Next.js config,
Fabro verify scopes). Behavior-preserving; no new product features.

This is a **large, multi-sprint** effort — the plan may contain **40–80 todos**.
Do **not** under-scope the reference sweep: a move without updating all referrers
is a failed increment.

**Primary pain (operator):** `src/` has **~20+ top-level folders** outside the
target topology. Legacy homes (`agent-core`, `lib`, `infrastructure`, `hooks`,
`store`, `services`, `prompts`, `evaluation`, `mcp`, `workflows`, `types`,
`config`, `constants`, `content`, `pages`) duplicate or prefigure what must live
in `shared/`, `domains/<module>/`, `db/`, `trigger/`, `components/ui/`, or `app/`.
The operator wants Fabro to **propose** a concrete target tree, get human approval,
then **execute moves and fix every import**.

**Out of scope for this run's default posture:** reshaping `src/domains/*` internals
(that is `module=domains-catalog`). This run focuses on **top-level `src/`** only,
but must still **grep and fix referrers** in `domains/`, `app/`, and `tests/` when
paths change.

## Target topology (contract)

From `docs/unified/ARCHITECTURE.md` §3 — the **only** legal top-level `src/` layout
after migration:

```
src/
├─ domains/<module>/     # vertical slices (see domains-catalog for module internals)
├─ shared/               # cross-module: agent-kernel, jobs, data, auth, observability, errors
├─ components/ui/        # Radix + CVA design system primitives
├─ db/                   # Drizzle schema + client (single source of truth)
├─ trigger/              # thin re-export registry for Trigger.dev tasks
├─ app/                  # Next.js App Router — routes + API glue only
├─ middleware.ts         # Next.js middleware (if present — stays at src root)
└─ instrumentation*.ts   # Next.js instrumentation (if present — stays at src root)
```

**Rule:** anything imported by 2+ modules lives in `shared/`, never in a domain or
legacy top-level folder. `shared/` supersedes `lib/`, `agent-core/`, `infrastructure/`,
`store/`, and ad-hoc `services/` at `src/` root.

## Current inventory (operator snapshot — Scope re-validates)

| Top-level path | Role today | Target disposition |
|----------------|------------|-------------------|
| `agent-core/` | Mastra kernel, models, observability dupes | → `shared/agent-kernel/` (+ `shared/observability/`) |
| `lib/` | auth, utils, API helpers | → `shared/auth/`, `shared/data/`, delete dupes |
| `infrastructure/` | legacy wiring | → `shared/*` or delete |
| `hooks/` | cross-cutting React hooks | → `shared/` or owning `domains/*/state/` |
| `store/` | global Zustand | → `shared/` or module `state/` |
| `services/` | orphan server helpers | → `domains/*/services/` or `shared/` |
| `prompts/` | prompt builders | → `domains/*/prompts/` or `shared/agent-kernel/` |
| `evaluation/` | offline eval harness | → keep slim or `shared/agent-kernel/scorers/` |
| `mcp/` | MCP servers | → `src/mcp` ok if single entry; or `shared/` |
| `workflows/` | hand-rolled orchestration | → Mastra workflows in `domains/*/agents/` |
| `types/` | global TS types | → `shared/data/` or colocate |
| `config/`, `constants/`, `content/` | misc | → colocate or `shared/` |
| `pages/` | legacy Pages router? | → migrate to `app/` or delete |
| `components/` | UI | → `components/ui/` only at top level |
| `domains/` | product modules | **keep** — do not reshape internals this run |
| `db/`, `trigger/`, `app/`, `shared/` | already target-aligned | **keep** — extend, don't replace |

Scope stage prints live counts; Plan Author updates this table if reality differs.

## Required deliverable: ideal structure (before code moves)

**Plan Author MUST write `STRUCTURE.md`** at repo root (overwrite stale domain-catalog
copies). For **src-root** runs the file has a dedicated section:

### `STRUCTURE.md` — src-root section (mandatory)

1. **Current top-level tree** — `ls -1 src/` + one-line role per folder.
2. **Ideal target tree** (ASCII) — §3 topology above; note what stays at root
   (`middleware.ts`, `instrumentation.ts`).
3. **Disposition table** — every legacy top-level folder: `keep` | `merge → shared/X` |
   `move → domains/<m>/Y` | `delete` (with evidence: importers = 0).
4. **Move map** — `old_path → new_path` for every file that moves in the approved wave.
5. **Re-export shim plan** — which old paths get temporary `index.ts` re-exports
   (SPEC F-1 staged migration).
6. **Out of scope for this wave** — explicit list (usually: full `domains/` reshape,
   full `evaluation/` rewrite).

## Required deliverable: reference update (every referrer)

Implementation MUST update **all referrers**, not only files inside the moved folder:

| Referrer class | Examples | Action |
|----------------|----------|--------|
| `@/lib/*`, `@/agent-core/*` | app routes, domains, tests | Rewrite to `@/shared/*` |
| Deep imports | `@/hooks/useX`, `@/services/Foo` | Route through new public path |
| `tsconfig` paths | `paths` in `tsconfig.json` | Update aliases |
| Next config | `next.config.js` transpile/includes | Update if paths change |
| Tests | `tests/**`, `**/__tests__/**` | Fix mocks + imports |
| Docs | `AGENTS.md`, `docs/**` | Update cited paths |
| Knip / ESLint boundaries | boundary rules | Update globs |

**Plan Author** must include grep-driven todos:

```bash
grep -rn "from '@/lib" src/ tests/
grep -rn "from '@/agent-core" src/ tests/
grep -rn "from '@/hooks" src/ tests/
grep -rn "from '@/infrastructure" src/ tests/
grep -rn "from '@/store" src/ tests/
```

…one todo per batch with expected file counts.

## Plan shape (`PLAN.md`)

First lines must include: **`Fabro module: src-root`** (for `fabro-verify.mjs`).

1. **Executive summary**
2. **Pointer to `STRUCTURE.md`** — src-root section is the move contract
3. **Global prerequisites** — SPEC F-1 (shared stubs + re-exports), F-2, F-3
4. **Per-folder sections** (agent-core, lib, hooks, …) with prioritized items
5. **Master todo list** (numbered 1…N, N may be 40–80):
   - Structure design todos
   - Stub + re-export todos (no big-bang)
   - Move todos (`git mv` batches)
   - **Reference-update todos** (grep-driven)
   - Boundary lint / knip todos
   - Verification per wave
6. **Suggested waves**
7. **Deferred** (domains-catalog, evaluation overhaul, etc.)

## Clarify gate (src-root)

| Option | Posture |
|--------|---------|
| **A — Staged** | Finalize `STRUCTURE.md` for **all** top-level folders; **implement Wave 1** only (`shared/` stubs + highest-traffic `lib/`/`agent-core` re-exports + referrer sweep) after Verification. |
| **B — Plan-only** | `STRUCTURE.md` + `PLAN.md` + referrer inventory; **no moves** this run. |
| **C — Full src-root** | Structure for all; implement all waves + all referrers (many verify loops). |

Recommend **A**.

## Non-negotiables

- Ground ideal tree in `docs/unified/ARCHITECTURE.md` §3 + `docs/unified/SPEC.md` F-1…F-3.
- **No move without referrer audit** — paired move + grep todos.
- Behavior-preserving; `npm run typecheck`, `npm run test:unit`, `node scripts/fabro-verify.mjs`.
- Use `refactor` skill for moves; staged re-exports before deleting old paths.
- Do **not** reshape `src/domains/*` internals in Wave 1 unless a top-level move
  forces a one-line import fix in a domain barrel.

## Assess focus

- Top-level folder inventory vs §3 target (table)
- **Duplication map**: `agent-core` vs `shared/agent-kernel` vs `domains/*/agents`
- **Import heat map**: grep counts for `@/lib`, `@/agent-core`, `@/hooks` from `app/` and `domains/`
- **SPEC F-1 readiness**: does `shared/` exist with stubs?
- `## Metadata` (`has_ui_surface: no` for structure-only Wave 1)

Run ID: 01KWKYBW7C2H8WQ8FH7YMTGG6N
Completed 18 stage(s) so far.

(13 earlier stage(s) omitted)

Recent stages:
- run_tests: failed [reason: Script failed with exit code: 1

## output
   [90m533| [39m
    [90m534| [39m[90m// Projects relations[39m
    [90m535| [39mexport const projectsRelations = relations(projects, ({ one, many }) =…
    [90m   | [39m                                 [31m^[39m
    [90m536| [39m  characters[33m:[39m [34mmany[39m(characters)[33m,[39m
    [90m537| [39m  episodes[33m:[39m [34mmany[39m(episodes)[33m,[39m
[90m [2m❯[22m src/db/client.ts:[2m3:1[22m[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[23/30]⎯[22m[39m

[41m[1m FAIL [22m[49m src/domains/storyteller/agents/tools/__tests__/tool-execution.test.ts[2m > [22mTool Execution (Mastra 1.x API)[2m > [22mupdateWorldBibleTool[2m > [22mshould execute with args passed directly (Mastra 1.x format)
[31m[1mAssertionError[22m: expected false to be true // Object.is equality[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- true[39m
[31m+ false[39m

[36m [2m❯[22m src/domains/storyteller/agents/tools/__tests__/tool-execution.test.ts:[2m53:30[22m[39m
    [90m 51| [39m      [34mexpect[39m(result)[33m.[39m[34mtoBeDefined[39m()
    [90m 52| [39m      const parsed = typeof result === 'string' ? JSON.parse(result) :…
    [90m 53| [39m      [34mexpect[39m(parsed[33m.[39msuccess)[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m   | [39m                             [31m^[39m
    [90m 54| [39m    })
    [90m 55| [39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[24/30]⎯[22m[39m

[41m[1m FAIL [22m[49m src/domains/storyteller/agents/tools/__tests__/tool-execution.test.ts[2m > [22mTool Execution (Mastra 1.x API)[2m > [22mupdateWorldBibleTool[2m > [22mshould handle passthrough fields correctly
[31m[1mAssertionError[22m: expected false to be true // Object.is equality[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- true[39m
[31m+ false[39m

[36m [2m❯[22m src/domains/storyteller/agents/tools/__tests__/tool-execution.test.ts:[2m85:30[22m[39m
    [90m 83| [39m
    [90m 84| [39m      const parsed = typeof result === 'string' ? JSON.parse(result) :…
    [90m 85| [39m      [34mexpect[39m(parsed[33m.[39msuccess)[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m   | [39m                             [31m^[39m
    [90m 86| [39m      [34mexpect[39m(parsed[33m.[39mkeys)[33m.[39m[34mtoContain[39m([32m'worldRules'[39m)
    [90m 87| [39m      [34mexpect[39m(parsed[33m.[39mkeys)[33m.[39m[34mtoContain[39m([32m'plotTwists'[39m)

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[25/30]⎯[22m[39m

[41m[1m FAIL [22m[49m src/domains/storyteller/agents/tools/__tests__/tool-execution.test.ts[2m > [22mTool Execution (Mastra 1.x API)[2m > [22mupdateStoryPhaseTool[2m > [22mshould execute with args passed directly
[31m[1mAssertionError[22m: expected false to be true // Object.is equality[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- true[39m
[31m+ false[39m

[36m [2m❯[22m src/domains/storyteller/agents/tools/__tests__/tool-execution.test.ts:[2m102:30[22m[39m
    [90m100| [39m      [34mexpect[39m(result)[33m.[39m[34mtoBeDefined[39m()
    [90m101| [39m      const parsed = typeof result === 'string' ? JSON.parse(result) :…
    [90m102| [39m      [34mexpect[39m(parsed[33m.[39msuccess)[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m   | [39m                             [31m^[39m
    [90m103| [39m      [34mexpect[39m(parsed[33m.[39mphase)[33m.[39m[34mtoBe[39m([32m'breaking'[39m)
    [90m104| [39m    })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[26/30]⎯[22m[39m


[2m Test Files [22m [1m[31m5 failed[39m[22m[2m | [22m[1m[32m31 passed[39m[22m[90m (36)[39m
[2m      Tests [22m [1m[31m30 failed[39m[22m[2m | [22m[1m[32m366 passed[39m[22m[90m (396)[39m
[2m   Start at [22m 14:08:55
[2m   Duration [22m 7.40s[2m (transform 1.58s, setup 377ms, import 6.82s, tests 9.71s, environment 754ms)[22m

]
  - Script: `npm run test:unit`
  - Output:
    ```
    (814 lines omitted)
    
    [41m[1m FAIL [22m[49m src/domains/storyteller/agents/tools/__tests__/tool-execution.test.ts[2m > [22mTool Execution (Mastra 1.x API)[2m > [22mupdateStoryPhaseTool[2m > [22mshould execute with args passed directly
    [31m[1mAssertionError[22m: expected false to be true // Object.is equality[39m
    
    [32m- Expected[39m
    [31m+ Received[39m
    
    [32m- true[39m
    [31m+ false[39m
    
    [36m [2m❯[22m src/domains/storyteller/agents/tools/__tests__/tool-execution.test.ts:[2m102:30[22m[39m
        [90m100| [39m      [34mexpect[39m(result)[33m.[39m[34mtoBeDefined[39m()
        [90m101| [39m      const parsed = typeof result === 'string' ? JSON.parse(result) :…
        [90m102| [39m      [34mexpect[39m(parsed[33m.[39msuccess)[33m.[39m[34mtoBe[39m([35mtrue[39m)
        [90m   | [39m                             [31m^[39m
        [90m103| [39m      [34mexpect[39m(parsed[33m.[39mphase)[33m.[39m[34mtoBe[39m([32m'breaking'[39m)
        [90m104| [39m    })
    
    [31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[26/30]⎯[22m[39m
    
    
    [2m Test Files [22m [1m[31m5 failed[39m[22m[2m | [22m[1m[32m31 passed[39m[22m[90m (36)[39m
    [2m      Tests [22m [1m[31m30 failed[39m[22m[2m | [22m[1m[32m366 passed[39m[22m[90m (396)[39m
    [2m   Start at [22m 14:08:55
    [2m   Duration [22m 7.40s[2m (transform 1.58s, setup 377ms, import 6.82s, tests 9.71s, environment 754ms)[22m
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
    (1944 lines omitted)
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
- screenshot: failed [reason: LLM error: Invalid request to anthropic: Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.]

## Context
- failure_class: deterministic
- failure_signature: screenshot|deterministic|api_deterministic|anthropic|invalid_request
- human.gate.Clarify.answer: C
- human.gate.Clarify.label: [C] Full blueprint
- human.gate.Clarify.question: Choose scope A, B, or C for this module (see Clarify Prep summary — table defines what each means here)
- human.gate.Verification.answer: A
- human.gate.Verification.label: [A] Approve & build
- human.gate.Verification.question: Plan is ready. [A] build · [B] plan only · [I] iterate (notes) · [X] abort — do not reuse Clarify's A/B/C here
- human.gate.label: [A] Approve & build
- human.gate.selected: A
- plan.has_p0_security_issue: no
- plan.has_ui_surface: no


# Role: Retro (run retrospective)

Fabro's automatic retrospectives were removed in recent versions, so this stage
recreates that capability as a durable artifact. You run after Verification
(plan-only path) or after the optional build + tests + e2e path.

## The goal / target

# src-root cleanup — ideal top-level `src/` layout + full reference update

## Mission

Design the **ideal top-level `src/` folder structure** per
`docs/unified/ARCHITECTURE.md` §3 (Repository topology), then **update every file
that references old paths** (imports, re-exports, tests, API routes, Next.js config,
Fabro verify scopes). Behavior-preserving; no new product features.

This is a **large, multi-sprint** effort — the plan may contain **40–80 todos**.
Do **not** under-scope the reference sweep: a move without updating all referrers
is a failed increment.

**Primary pain (operator):** `src/` has **~20+ top-level folders** outside the
target topology. Legacy homes (`agent-core`, `lib`, `infrastructure`, `hooks`,
`store`, `services`, `prompts`, `evaluation`, `mcp`, `workflows`, `types`,
`config`, `constants`, `content`, `pages`) duplicate or prefigure what must live
in `shared/`, `domains/<module>/`, `db/`, `trigger/`, `components/ui/`, or `app/`.
The operator wants Fabro to **propose** a concrete target tree, get human approval,
then **execute moves and fix every import**.

**Out of scope for this run's default posture:** reshaping `src/domains/*` internals
(that is `module=domains-catalog`). This run focuses on **top-level `src/`** only,
but must still **grep and fix referrers** in `domains/`, `app/`, and `tests/` when
paths change.

## Target topology (contract)

From `docs/unified/ARCHITECTURE.md` §3 — the **only** legal top-level `src/` layout
after migration:

```
src/
├─ domains/<module>/     # vertical slices (see domains-catalog for module internals)
├─ shared/               # cross-module: agent-kernel, jobs, data, auth, observability, errors
├─ components/ui/        # Radix + CVA design system primitives
├─ db/                   # Drizzle schema + client (single source of truth)
├─ trigger/              # thin re-export registry for Trigger.dev tasks
├─ app/                  # Next.js App Router — routes + API glue only
├─ middleware.ts         # Next.js middleware (if present — stays at src root)
└─ instrumentation*.ts   # Next.js instrumentation (if present — stays at src root)
```

**Rule:** anything imported by 2+ modules lives in `shared/`, never in a domain or
legacy top-level folder. `shared/` supersedes `lib/`, `agent-core/`, `infrastructure/`,
`store/`, and ad-hoc `services/` at `src/` root.

## Current inventory (operator snapshot — Scope re-validates)

| Top-level path | Role today | Target disposition |
|----------------|------------|-------------------|
| `agent-core/` | Mastra kernel, models, observability dupes | → `shared/agent-kernel/` (+ `shared/observability/`) |
| `lib/` | auth, utils, API helpers | → `shared/auth/`, `shared/data/`, delete dupes |
| `infrastructure/` | legacy wiring | → `shared/*` or delete |
| `hooks/` | cross-cutting React hooks | → `shared/` or owning `domains/*/state/` |
| `store/` | global Zustand | → `shared/` or module `state/` |
| `services/` | orphan server helpers | → `domains/*/services/` or `shared/` |
| `prompts/` | prompt builders | → `domains/*/prompts/` or `shared/agent-kernel/` |
| `evaluation/` | offline eval harness | → keep slim or `shared/agent-kernel/scorers/` |
| `mcp/` | MCP servers | → `src/mcp` ok if single entry; or `shared/` |
| `workflows/` | hand-rolled orchestration | → Mastra workflows in `domains/*/agents/` |
| `types/` | global TS types | → `shared/data/` or colocate |
| `config/`, `constants/`, `content/` | misc | → colocate or `shared/` |
| `pages/` | legacy Pages router? | → migrate to `app/` or delete |
| `components/` | UI | → `components/ui/` only at top level |
| `domains/` | product modules | **keep** — do not reshape internals this run |
| `db/`, `trigger/`, `app/`, `shared/` | already target-aligned | **keep** — extend, don't replace |

Scope stage prints live counts; Plan Author updates this table if reality differs.

## Required deliverable: ideal structure (before code moves)

**Plan Author MUST write `STRUCTURE.md`** at repo root (overwrite stale domain-catalog
copies). For **src-root** runs the file has a dedicated section:

### `STRUCTURE.md` — src-root section (mandatory)

1. **Current top-level tree** — `ls -1 src/` + one-line role per folder.
2. **Ideal target tree** (ASCII) — §3 topology above; note what stays at root
   (`middleware.ts`, `instrumentation.ts`).
3. **Disposition table** — every legacy top-level folder: `keep` | `merge → shared/X` |
   `move → domains/<m>/Y` | `delete` (with evidence: importers = 0).
4. **Move map** — `old_path → new_path` for every file that moves in the approved wave.
5. **Re-export shim plan** — which old paths get temporary `index.ts` re-exports
   (SPEC F-1 staged migration).
6. **Out of scope for this wave** — explicit list (usually: full `domains/` reshape,
   full `evaluation/` rewrite).

## Required deliverable: reference update (every referrer)

Implementation MUST update **all referrers**, not only files inside the moved folder:

| Referrer class | Examples | Action |
|----------------|----------|--------|
| `@/lib/*`, `@/agent-core/*` | app routes, domains, tests | Rewrite to `@/shared/*` |
| Deep imports | `@/hooks/useX`, `@/services/Foo` | Route through new public path |
| `tsconfig` paths | `paths` in `tsconfig.json` | Update aliases |
| Next config | `next.config.js` transpile/includes | Update if paths change |
| Tests | `tests/**`, `**/__tests__/**` | Fix mocks + imports |
| Docs | `AGENTS.md`, `docs/**` | Update cited paths |
| Knip / ESLint boundaries | boundary rules | Update globs |

**Plan Author** must include grep-driven todos:

```bash
grep -rn "from '@/lib" src/ tests/
grep -rn "from '@/agent-core" src/ tests/
grep -rn "from '@/hooks" src/ tests/
grep -rn "from '@/infrastructure" src/ tests/
grep -rn "from '@/store" src/ tests/
```

…one todo per batch with expected file counts.

## Plan shape (`PLAN.md`)

First lines must include: **`Fabro module: src-root`** (for `fabro-verify.mjs`).

1. **Executive summary**
2. **Pointer to `STRUCTURE.md`** — src-root section is the move contract
3. **Global prerequisites** — SPEC F-1 (shared stubs + re-exports), F-2, F-3
4. **Per-folder sections** (agent-core, lib, hooks, …) with prioritized items
5. **Master todo list** (numbered 1…N, N may be 40–80):
   - Structure design todos
   - Stub + re-export todos (no big-bang)
   - Move todos (`git mv` batches)
   - **Reference-update todos** (grep-driven)
   - Boundary lint / knip todos
   - Verification per wave
6. **Suggested waves**
7. **Deferred** (domains-catalog, evaluation overhaul, etc.)

## Clarify gate (src-root)

| Option | Posture |
|--------|---------|
| **A — Staged** | Finalize `STRUCTURE.md` for **all** top-level folders; **implement Wave 1** only (`shared/` stubs + highest-traffic `lib/`/`agent-core` re-exports + referrer sweep) after Verification. |
| **B — Plan-only** | `STRUCTURE.md` + `PLAN.md` + referrer inventory; **no moves** this run. |
| **C — Full src-root** | Structure for all; implement all waves + all referrers (many verify loops). |

Recommend **A**.

## Non-negotiables

- Ground ideal tree in `docs/unified/ARCHITECTURE.md` §3 + `docs/unified/SPEC.md` F-1…F-3.
- **No move without referrer audit** — paired move + grep todos.
- Behavior-preserving; `npm run typecheck`, `npm run test:unit`, `node scripts/fabro-verify.mjs`.
- Use `refactor` skill for moves; staged re-exports before deleting old paths.
- Do **not** reshape `src/domains/*` internals in Wave 1 unless a top-level move
  forces a one-line import fix in a domain barrel.

## Assess focus

- Top-level folder inventory vs §3 target (table)
- **Duplication map**: `agent-core` vs `shared/agent-kernel` vs `domains/*/agents`
- **Import heat map**: grep counts for `@/lib`, `@/agent-core`, `@/hooks` from `app/` and `domains/`
- **SPEC F-1 readiness**: does `shared/` exist with stubs?
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