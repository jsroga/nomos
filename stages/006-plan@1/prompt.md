Goal: Clean up and align the storyteller module (src/domains/storyteller) with the target architecture in docs/unified/ARCHITECTURE.md (module blueprint, dependency rule, non-negotiable invariants). Produce a prioritized plan; implement only after human approval at Verification.
Run ID: 01KWEKXTNN02DJ5H0RA9W7X74R
Pipeline progress: 4 of 18 stages completed

## Stage: scope
- Status: succeeded
- Handler: command
- Script: `M="${FABRO_INPUT_MODULE:-storyteller}"; echo "=== module: $M ==="; find "src/domains/$M" -type f | sort | head -120; echo; echo '=== git status ==='; git status --short; echo; echo '=== architecture contract ==='; ls -la docs/unified/ARCHITECTURE.md docs/unified/SPEC.md 2>&1`
- Output:
  ```
  (77 lines omitted)
  src/domains/storyteller/components/ReferenceText/ReferenceText.tsx
  src/domains/storyteller/components/ReferenceText/index.ts
  src/domains/storyteller/components/RichText/RichText.tsx
  src/domains/storyteller/components/RichText/index.ts
  src/domains/storyteller/components/ScriptEditor/ScriptEditor.tsx
  src/domains/storyteller/components/ScriptEditor/index.ts
  src/domains/storyteller/components/SeasonOverviewCard/SeasonOverviewCard.tsx
  src/domains/storyteller/components/SeasonOverviewCard/index.ts
  src/domains/storyteller/components/StoryPlanBoard/StoryPlanBoard.tsx
  src/domains/storyteller/components/StoryPlanBoard/index.ts
  src/domains/storyteller/components/StorytellerEmptyState/StorytellerEmptyState.tsx
  src/domains/storyteller/components/StorytellerEmptyState/index.ts
  src/domains/storyteller/components/StorytellerImage/StorytellerImage.tsx
  src/domains/storyteller/components/StorytellerImage/index.ts
  src/domains/storyteller/components/Timeline/Timeline.tsx
  src/domains/storyteller/components/Timeline/index.ts
  src/domains/storyteller/components/WorldBible/BibleContext.tsx
  src/domains/storyteller/components/WorldBible/BibleEvents.tsx
  src/domains/storyteller/components/WorldBible/BibleFactions.tsx
  src/domains/storyteller/components/WorldBible/BibleInspirations.tsx
  src/domains/storyteller/components/WorldBible/BibleItems.tsx
  src/domains/storyteller/components/WorldBible/BibleOverview.tsx
  src/domains/storyteller/components/WorldBible/BibleRoadmap.tsx
  src/domains/storyteller/components/WorldBible/BibleSoundtracks.tsx
  src/domains/storyteller/components/WorldBible/BibleWorldLogic.tsx
  src/domains/storyteller/components/WorldBible/SectionPendingOverlay.tsx
  src/domains/storyteller/components/WorldBiblePanel/WorldBiblePanel.tsx
  src/domains/storyteller/components/WorldBiblePanel/index.ts
  src/domains/storyteller/components/WorldRuleCard/WorldRuleCard.tsx
  src/domains/storyteller/components/WorldRuleCard/index.ts
  src/domains/storyteller/components/YouTubePlayer/YouTubePlayer.tsx
  src/domains/storyteller/components/YouTubePlayer/index.ts
  src/domains/storyteller/components/__tests__/agent-log-features.e2e.test.tsx
  src/domains/storyteller/components/__tests__/chat-persistence.e2e.test.tsx
  src/domains/storyteller/components/__tests__/youtube-player.e2e.test.tsx
  src/domains/storyteller/config/__tests__/action-config.test.ts
  src/domains/storyteller/config/__tests__/tool-result-mapper.test.ts
  src/domains/storyteller/config/action-config.ts
  src/domains/storyteller/config/storyteller-agents.tsx
  src/domains/storyteller/config/storyteller-config.ts
  src/domains/storyteller/config/tool-result-mapper.ts
  src/domains/storyteller/core/ActionFormatters/ActionFormatters.ts
  src/domains/storyteller/core/ActionFormatters/index.ts
  src/domains/storyteller/core/ActionTypes/ActionTypes.ts
  
  === git status ===
  
  === architecture contract ===
  -rw-r--r-- 1 root root 38694 Jul  1 10:35 docs/unified/ARCHITECTURE.md
  -rw-r--r-- 1 root root 26993 Jul  1 10:35 docs/unified/SPEC.md
  ```

## Stage: assess
- Status: succeeded
- Handler: agent
- Model: gpt-5.4
- Tokens: 102.4k in / 6.3k out
- Files touched: /workspace/kurvitza/findings/assess.md
- Response:
  > Assessment written to `findings/assess.md`.
  > 
  > Short summary:
  > - Storyteller has an `index.ts`, but it currently exposes too much: DB schema, services, and agent internals leak through the public barrel.
  > - The module shape is still legacy (`components/hooks/tools/lib/db`) rather than the target `ui/state/io/core/services/agents/tasks/prompts` blueprint.
  > - Highest-risk divergences are in client/server boundaries: raw client `fetch`, ad-hoc caching, localStorage/window-event job recovery, and parallel hand-rolled AI orchestration beside Mastra.
  > 
  > Top 3 gaps first:
  > 1. Reshape the module toward the target blueprint.
  > 2. Narrow `src/domains/storyteller/index.ts` to a real public API.
  > 3. Move client-side server state into `io/` + TanStack Query `state/queries/` and retire bespoke fetch/caching patterns.
  > 
  > No code was modified beyond the findings file.

## Stage: clarify_prep
- Status: succeeded
- Handler: agent
- Model: gpt-5.4
- Tokens: 37.7k in / 6.1k out
- Response:
  > ## Assessment summary
  > `src/domains/storyteller` is still materially off the target module blueprint: its folder layout is legacy, its public barrel leaks internals, and client/server responsibilities are blurred. Planning can start now, but the architect needs one scope decision first because the biggest gaps affect import safety, TanStack/typed-io migration, job orchestration, and Mastra cleanup.
  > 
  > ## Key gaps (max 5)
  > - The module shape is still legacy (`components/`, `hooks/`, `db/`, `tools/`, `mentions/`) instead of `ui/state/io/core/services/agents/tasks/prompts`.
  > - `src/domains/storyteller/index.ts` exposes private DB/server-only internals, breaking the “one barrel” rule.
  > - Client hooks/components fetch directly, hold server data locally, and bypass TanStack Query + typed `io/`.
  > - Long-running storyteller flows still use bespoke recovery patterns (`localStorage`, `window` events) instead of Trigger.dev tasks + shared job primitives.
  > - The AI layer mixes Mastra-native primitives with parallel hand-rolled orchestration/tracing and still has porous typed boundaries (`any`, `z.any`).
  > 
  > ## Pick one scope for the architect
  > 
  > | Option | What the plan will assume |
  > | --- | --- |
  > | **[A] Staged migration** | Boundary-first roadmap: tighten `storyteller/index.ts`, map legacy roots to `ui/state/io/core/services/agents/tasks/prompts`, migrate the highest-value server-state flows to TanStack + typed `io/` first, then stage Trigger job migration, schema convergence, and Mastra cleanup after the boundaries are safe. |
  > | **[B] Minimal first step** | Smallest safe slice only: lock down exports, add missing server-only guards, type the worst boundaries, and define seams for future `state/io/tasks` work; explicitly defer most folder moves, most TanStack migration, Trigger job replacement, and deeper Mastra consolidation. |
  > | **[C] Full blueprint** | Comprehensive end-state reshape: fully reorganize storyteller into the blueprint, clean all cross-module/internal imports, migrate major client/server flows to TanStack + `io/`, move long-running work to `tasks/`, and make Mastra the only orchestration path planned for this effort. |
  > | **[F] Custom** | Type your own constraints in freeform |
  > | **[R] Re-assess** | Only if findings are wrong or code changed since assessment |
  > 
  > **Recommendation: [A]** — storyteller’s biggest risks are boundary and data-flow problems, so a staged migration gives the architect enough scope to fix the real issues without forcing a brittle big-bang rewrite.
  > 
  > The buttons below match this table. Pick the option that fits.

## Stage: Clarify
- Status: succeeded
- Handler: human

## Current context
| Key | Value |
|-----|-------|
| human.gate.Clarify.answer | A |
| human.gate.Clarify.label | [A] Staged migration — boundaries first, bigger moves sequenced |
| human.gate.Clarify.question | How much should the cleanup plan take on? |
| human.gate.label | [A] Staged migration — boundaries first, bigger moves sequenced |
| human.gate.selected | A |


# Role: Plan Author

You turn the assessment into a **prioritized, reviewable improvement plan** — the
deliverable of this workflow. You do **not** implement anything. A developer must
be able to execute your plan without rediscovering the codebase.

## The goal / target

Clean up and align the storyteller module (src/domains/storyteller) with the target architecture in docs/unified/ARCHITECTURE.md (module blueprint, dependency rule, non-negotiable invariants). Produce a prioritized plan; implement only after human approval at Verification.

## Target architecture — folder structure & layering (MUST follow)

This project has a canonical target architecture that every module converges on.
The authoritative source is **`docs/unified/ARCHITECTURE.md`** (companion:
`docs/unified/SPEC.md`, `docs/orchestration-rfc.md`,
`docs/quality-improvement-spec.md`). **Read `docs/unified/ARCHITECTURE.md` before
proposing or placing any new code.** The summary below is the contract; the doc
is the detail.

> Note: this is the *target state*. Existing modules (e.g. `storyteller`) are
> mid-migration, so current code may not fully match. New code you add MUST follow
> the target; when editing legacy code, move it toward the target, never further away.

**Locked stack (non-negotiable):** Mastra · Radix · Supabase · TanStack Query ·
Trigger.dev · Vercel. You change *how* they're used, never *whether*.

### Repository topology

```
src/
├─ domains/<module>/     # vertical slices — the unit of ownership
├─ shared/               # cross-module building blocks (imported by 2+ modules)
│   ├─ agent-kernel/  jobs/  data/  auth/  observability/  errors/
├─ components/ui/        # Radix + CVA + tailwind-merge design system (shared primitives)
├─ db/                   # Drizzle: single schema source of truth + client
├─ trigger/              # thin re-export registry only
└─ app/                  # Next.js App Router: routes + API; thin glue only
```

Anything imported by 2+ modules lives in `shared/`, never inside a module.

### Module blueprint (every domain looks like this)

```
src/domains/<module>/
├─ index.ts        # PUBLIC API — the ONLY legal import target from outside
├─ ui/             # React client components. PascalCase folder-per-component (+ colocated .test.tsx + local index.ts)
├─ state/          # CLIENT state only (Zustand: use<Module>UiStore) + queries/ (TanStack: use<Entity>, use<Entity>Mutation)
├─ io/             # client→server edge: <module>.api.ts, <module>.keys.ts, <module>.dto.ts (Zod, shared with routes)
├─ core/           # PURE domain logic. No React, no DB, no I/O, no Date.now(). Unit-tested offline.
├─ services/       # SERVER-ONLY. DB (Drizzle) + external APIs. `import 'server-only'`. Returns Result<T>.
├─ agents/         # SERVER-ONLY. Mastra agents/tools/workflows (AI modules only) + tools/<tool>.ts
├─ tasks/          # Trigger.dev schemaTasks OWNED by this module: <verb>.task.ts
├─ prompts/        # prompt builders + skills (AI modules only)
└─ <module>.config.ts
```

- **AI modules** (storyteller, chat, loop-creator…) use `agents/` + `prompts/`.
  **Asset modules** (world-building-toolkit, 3d-asset-exporter, interior-designer)
  skip them and lean on `tasks/`.

### Dependency rule (points inward and downward — enforced by lint)

`ui → state → io → core ← (server) services/agents/tasks`

| Layer | May import | May NOT import |
| --- | --- | --- |
| `ui/` | `state/`, `core/` types, `components/ui`, `shared/jobs` | `services/`, `db`, `io/` directly, another module |
| `state/` | `io/`, `core/`, `shared/data`, `shared/jobs` | `services/`, `db`, `react-dom` |
| `io/` | `core/` DTOs, `shared/data` | `services/`, `db`, `react` |
| `core/` | `core/`, `zod` | everything else (stays pure) |
| `services/` | `db`, `shared/*`, external SDKs | `state/`, `ui/`, `io/`, React |
| `agents/` | `shared/agent-kernel`, `services/`, `prompts/`, `core/` | `ui/`, `state/` |
| `tasks/` | `services/`, `agents/`, `core/`, `shared/jobs` | `ui/`, `state/`, `io/` |

- A module may **not** import another module's internals — go through its
  `index.ts` or the shared layer. `app/` holds **no business logic**.

### Naming (kill the flat-vs-folder split — folder-per-unit everywhere)

- Folders & components `PascalCase`; hooks `useX.ts`; tasks `<verb>.task.ts`;
  services `<Noun>Service.ts`; Zod DTOs `*.dto.ts`; each unit gets a local barrel.

### Non-negotiable invariants (the highest-leverage rules)

1. **Server state in TanStack Query, never in Zustand.** Zustand holds *only*
   ephemeral UI state (selection, modes, panels). They never mix in one store.
2. **No browser→Supabase writes.** All writes + privileged reads go through an API
   route → `requireAuth()` → Service → Drizzle. RLS is defense-in-depth, not the gate.
3. **One schema, camelCase end-to-end.** Drizzle (`src/db/schema.ts`) is the source
   of truth; the snake_case↔camelCase boundary is the Drizzle column map only.
4. **Long work is a Job.** Anything > ~1s of server/GPU/LLM time is a Trigger.dev
   `schemaTask`, observed via Trigger Realtime through the shared `useJob` hook —
   no bespoke polling, no `localStorage` recovery, no `window` CustomEvents.
5. **Typed boundaries.** Zod at every edge (API body, tool input, task payload, and
   every workflow step `inputSchema`/`outputSchema`). Ban `any` at boundaries.
6. **One barrel.** Reaching into a module's internals from outside is a lint error.
7. **Use the framework once.** If Mastra ships a primitive (Workflows, Memory, AI
   Tracing, Workspace skills, Scorers, Processors, RequestContext), use it — no
   hand-rolled parallel. Wrapping is allowed; re-implementing is not.
8. **Size limits.** Components < ~400 LOC, routes < ~300 LOC; split god components.

When deciding *where* a change goes, map it to the layer above and place it there.
If unsure, consult `docs/unified/ARCHITECTURE.md` §3–§5 and §12 rather than guessing.

Every step in your plan MUST place changes in the correct layer/folder above,
name the module's `index.ts` contract where relevant, and flag any step that would
touch a dependency-rule boundary or an invariant as a risk.

## Inputs — read them first

1. `findings/assess.md` — the assessment output. This is your primary input.
2. **`CLARIFY.md`** — open questions and how each gate option was framed.
3. **`DECISIONS.md`** — you MUST update this file with the human's Clarify gate
   choice before drafting the plan. Read run context for `human.gate.Clarify.*` and
   `human.gate.text` (freeform). Record:
   - Selected option ([A]/[B]/[C]/[F]/[R] and label)
   - Freeform text if any
   - How that constrains scope and prioritization
4. If re-invoked after **Verification** iterate ([I]), the human's notes are in
   context (`human.gate.Verification.*`, `human.gate.text`). Update `DECISIONS.md`
   and `PLAN.md`; their judgment overrides raw severities.
5. Spot-check referenced code — verify specific files each step names; do not
   deep-read the whole module.

## Build the plan

Group findings into concrete **improvement items**. For each item:

```
### [Priority] Title
- Problem: what's wrong today (cite the finding + location)
- Impact: why it matters (risk / cost / who it affects)
- Change: the concrete work — files/layers to create/modify/delete, the shape of the fix
- Effort: rough size (S / M / L)
- Verification: how we'll know it's fixed (test, typecheck, lint, manual check)
- Depends on: other items that must land first (if any)
```

**Prioritization** (order by risk-adjusted value):

- **P0 — do first:** security/correctness issues that can bite now (data loss,
  auth gaps, client writes, broken types on a hot path).
- **P1 — high value:** structural fixes that unblock others or kill a class of
  bugs (e.g. move server state to TanStack, establish the `index.ts` barrel).
- **P2 — worthwhile:** maintainability, dead code, test gaps.
- **P3 — nits:** style/polish; batch them.

## Output

Write the plan to `PLAN.md` at the repository root with `write_file`, and summarize
it in your final response. Structure:

1. **Summary** — 2-4 sentences: the module's state and the thrust of the plan.
2. **Prioritized items** — the P0…P3 list above.
3. **Suggested sequence** — the recommended execution order / first shippable increment.
4. **Deferred / out of scope** — what the assessment surfaced but the plan leaves
   for later, with reasons.

## Quality bar

- Every item traces to a real finding — do not invent new issues here.
- Steps are concrete (files, layers, the fix shape), not vague ("improve X").
- Grounded: every file/type/API you name exists (or is a step that creates it).
- Honest effort/impact; don't inflate. Prefer a first increment that is
  independently shippable and low-risk.

This node is a **goal gate**: the run only succeeds if a real, grounded plan is
written. If the module is already clean, say so and produce a minimal plan rather
than fabricating work.

## Handoff

When `PLAN.md` and `DECISIONS.md` are updated and summarized, stop. The human
reviews at **Verification** next. If re-invoked to iterate ([I]), update both files
and note what changed.