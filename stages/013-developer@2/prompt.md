Goal: Clean up and align the interior-designer module (src/domains/interior-designer) with the target architecture in docs/unified/ARCHITECTURE.md (module blueprint, dependency rule, non-negotiable invariants). Produce a prioritized plan; implement only after human approval at Verification.

## Completed stages
- **scope**: succeeded
  - Model: gpt-5.4, 5.2k tokens in / 836 out
- **assess**: succeeded
  - Model: gpt-5.4, 36.0k tokens in / 3.2k out
  - Files: /workspace/kurvitza/findings/assess.md
- **clarify_prep**: succeeded
  - Model: gpt-5.4, 16.9k tokens in / 1.8k out
  - Files: /workspace/kurvitza/CLARIFY.md, /workspace/kurvitza/DECISIONS.md, /workspace/kurvitza/PLAN.md
- **Clarify**: succeeded
- **plan**: succeeded
  - Model: claude-opus-4-8, 28.6k tokens in / 11.2k out
  - Files: /workspace/kurvitza/DECISIONS.md, /workspace/kurvitza/PLAN.md
- **Verification**: succeeded
- **setup**: succeeded
  - Script: `set -euo pipefail; echo '=== sandbox bootstrap ==='; if ! command -v git >/dev/null; then apt-get update && apt-get install -y git ca-certificates; fi; if ! command -v npm >/dev/null; then apt-get update && apt-get install -y nodejs npm; fi; command -v npm >/dev/null || { echo 'ERROR: npm still missing — expected image node:22-bookworm'; exit 1; }; npm ci --prefer-offline --no-audit --no-fund; npm run test:playwright:install; echo '=== bootstrap complete ==='`
  - Output:
    ```
    (1740 lines omitted)
    |■■■■■■■■                                                                        |  10% of 89.3 MiB
    |■■■■■■■■■■■■■■■■                                                                |  20% of 89.3 MiB
    |■■■■■■■■■■■■■■■■■■■■■■■■                                                        |  30% of 89.3 MiB
    |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                                |  40% of 89.3 MiB
    |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                        |  50% of 89.3 MiB
    |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                |  60% of 89.3 MiB
    |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                        |  70% of 89.3 MiB
    |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                |  80% of 89.3 MiB
    |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■        |  90% of 89.3 MiB
    |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■| 100% of 89.3 MiB
    Webkit 26.0 (playwright build v2227) downloaded to /root/.cache/ms-playwright/webkit-2227
    Downloading FFMPEG playwright build v1011 from https://cdn.playwright.dev/dbazure/download/playwright/builds/ffmpeg/1011/ffmpeg-linux-arm64.zip
    |                                                                                |   0% of 1.6 MiB
    |■■■■■■■■                                                                        |  10% of 1.6 MiB
    |■■■■■■■■■■■■■■■■                                                                |  20% of 1.6 MiB
    |■■■■■■■■■■■■■■■■■■■■■■■■                                                        |  30% of 1.6 MiB
    |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                                |  40% of 1.6 MiB
    |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                        |  50% of 1.6 MiB
    |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                |  60% of 1.6 MiB
    |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                        |  70% of 1.6 MiB
    |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                |  80% of 1.6 MiB
    |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■        |  90% of 1.6 MiB
    |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■| 100% of 1.6 MiB
    FFMPEG playwright build v1011 downloaded to /root/.cache/ms-playwright/ffmpeg-1011
    === bootstrap complete ===
    ```
- **setup_gate**: succeeded
- **developer**: succeeded
  - Model: gpt-5.4, 152.8k tokens in / 41.0k out
- **verify**: failed
  - Script: `NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}" npm run typecheck && NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}" npm run lint`
  - Output:
    ```
    > typecheck
    > tsc --noEmit
    
    
    <--- Last few GCs --->
    
    [9386:0xffffb9960000]   156390 ms: Mark-Compact 4034.7 (4129.3) -> 4019.3 (4129.6) MB, pooled: 2 MB, 1269.52 / 0.00 ms  (average mu = 0.093, current mu = 0.011) allocation failure; scavenge might not succeed
    [9386:0xffffb9960000]   157613 ms: Mark-Compact 4035.3 (4129.6) -> 4019.9 (4130.1) MB, pooled: 1 MB, 1206.11 / 0.00 ms  (average mu = 0.056, current mu = 0.014) allocation failure; scavenge might not succeed
    
    
    <--- JS stacktrace --->
    
    FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
    ----- Native stack trace -----
    
     1: 0xe19178 node::OOMErrorHandler(char const*, v8::OOMDetails const&) [node]
     2: 0x11cad4c v8::Utils::ReportOOMFailure(v8::internal::Isolate*, char const*, v8::OOMDetails const&) [node]
     3: 0x11caefc v8::internal::V8::FatalProcessOutOfMemory(v8::internal::Isolate*, char const*, v8::OOMDetails const&) [node]
     4: 0x13f098c  [node]
     5: 0x13f09bc  [node]
     6: 0x1408370  [node]
     7: 0x140af5c  [node]
     8: 0x1bf2714  [node]
    Aborted
    ```
- **verify_gate**: succeeded

## Context
- human.gate.Clarify.answer: A
- human.gate.Clarify.label: [A] Staged migration
- human.gate.Clarify.question: Choose scope A, B, or C for this module (see Clarify Prep summary — table defines what each means here)
- human.gate.Verification.answer: B
- human.gate.Verification.label: [B] Approve & build
- human.gate.Verification.question: Plan is ready. Approve and build, save plan only, request changes, or abort?
- human.gate.label: [B] Approve & build
- human.gate.selected: B
- plan.has_p0_security_issue: yes
- plan.has_ui_surface: no


# Role: Developer (plan workflow — optional build)

You implement the **approved** plan in `PLAN.md`. You run only after the human
chose **[B] Approve & build** at Verification.

## The goal

Clean up and align the interior-designer module (src/domains/interior-designer) with the target architecture in docs/unified/ARCHITECTURE.md (module blueprint, dependency rule, non-negotiable invariants). Produce a prioritized plan; implement only after human approval at Verification.

## Fabro skills — use them

Project skills live in `.fabro/skills/` and are available via the **`use_skill`**
tool (also slash syntax like `/refactor`). **Call `use_skill` at the start** when a
task matches — do not reinvent procedures from memory.

| When | Skill name |
| --- | --- |
| Layer moves, extracting modules | `refactor` |
| New/changed tests | `write-tests` |
| Drizzle/schema/API boundaries | `services-audit` |
| Trigger.dev tasks | `trigger-dev` |
| Supabase/RLS concerns | `supabase` |
| shadcn/Radix UI work | `shadcn` |
| Pre-commit hygiene | `commit` |
| Stuck on failures | `debug` |

If `UX.md` is absent (backend-only increment), skip `component-audit` and
`accessibility-audit` unless you touch UI.

## Inputs — read first

1. **`PLAN.md`** — approved plan; follow it precisely.
2. **`DECISIONS.md`** — Clarify + Verification choices (scope, deferrals).
3. **`UX.md`** — only if present (same thread); skip if backend-only.
4. **`findings/assess.md`** — architectural context.

## Your task list — build it first, in THIS exact shape

Before writing any code, call `todo_write` to create the working checklist. It MUST
have exactly this structure — nothing else:

1. **First todo:** "Read the plan" — read `PLAN.md` (+ `DECISIONS.md`, `UX.md` if
   present, `findings/assess.md`).
2. **Middle todos (2 … N):** one todo per **concrete implementation step** of the
   **Minimum first increment** from `PLAN.md` §Suggested sequence. Break each plan
   item into the real, granular code actions (e.g. "create `io/<module>.dto.ts`",
   "route the browser write through the existing PATCH API", "delete the Supabase
   client import from the store", "update callers to the new hook"). Ordered,
   dependency-correct. Do **not** add todos for deferred P2/P3 items.
3. **Last todo (always, verbatim):** "Run typecheck and lint, then summarize changes
   and deferrals."

Do **not** create meta/process todos ("analyze the repo", "understand architecture",
"explore the module", "plan the approach"). Every middle todo is a concrete code
change traceable to a plan item. Mark each done as you finish it; keep exactly one
`in_progress` at a time.

## Scope limits (critical)

- Implement the **Minimum first increment** in `PLAN.md` §Suggested sequence
  (its P0/P1 items). Do **not** implement deferred P2/P3 items.
- Work top-to-bottom through your task list. If the increment is too large for one
  visit, stop at a clean, compiling checkpoint and the next visit continues the
  remaining todos in order.
- Do not remove features or change behavior unless the plan says so.

## Tool discipline

- **Import scanning:** use shell `grep -rn "from '@/domains/…'" src/` — do **not**
  spawn a subagent for grep-style searches. Reserve `spawn_agent` for work that can
  run fully parallel with your implementation. (`rg`/ripgrep is not installed —
  use `grep`.)
- **Read before write:** Fabro blocks `write_file` on unread existing files — read
  each file you will edit first.
- Match existing code style.

## Self-verification (targeted — fast, no false failures)

Full-repo `npm run typecheck` / `npm run lint` are **slow** and can fail on
**pre-existing** errors in modules you never touched. For your own check, scope to
what you changed; the `verify` stage runs the full gate afterward.

First collect the files you changed (tracked edits + new untracked, `.ts`/`.tsx`):

```bash
FILES=$( { git diff --name-only --diff-filter=ACMR HEAD; git ls-files --others --exclude-standard; } | grep -E '\.(ts|tsx)$' | sort -u )
```

1. **Typecheck (changed files only):**
   `[ -n "$FILES" ] && NODE_OPTIONS=--max-old-space-size=4096 npx --yes tsc-files --noEmit $FILES`
   `tsc-files` builds a temp tsconfig that **inherits the project config** (path
   aliases, strict, libs) and checks only your files + their type deps — far faster
   than the whole-program `tsc`. Plain `tsc --noEmit <file>` would ignore `tsconfig`,
   so do **not** use it. The authoritative whole-program `tsc` runs in `verify`.
2. **Lint (changed files only):** `[ -n "$FILES" ] && npx eslint $FILES`
   — lint just your changes, not the whole repo.
3. Re-read your diff; confirm only increment scope touched.
4. Cross-check `PLAN.md` minimum increment — done or explicitly deferred with reason.

`npm run typecheck` and `npm run lint` (full) must ultimately pass in the `verify`
stage; keep your changes clean so they do.

## Rules

- Place every change in the correct layer per `docs/unified/ARCHITECTURE.md`.
- **Asset modules** (`interior-designer`, etc.): prioritize `ui/` + `state/queries/` +
  `io/` + `tasks/`; no `agents/` unless the plan explicitly adds AI surfaces.
  Replace browser Supabase writes and `localStorage` job recovery with API + `useJob`.
- No browser→Supabase writes; no server state in Zustand; no `any` at boundaries.
- If the plan violates an invariant, stop and flag it — do not implement the violation.

## Handoff

Summarize: files created/modified/deleted, deviations from plan, deferred work.
Then stop — static checks and Tester run next.