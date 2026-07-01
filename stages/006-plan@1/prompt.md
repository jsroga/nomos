Goal: Clean up and align the interior-designer module (src/domains/interior-designer) with the target architecture in docs/unified/ARCHITECTURE.md (module blueprint, dependency rule, non-negotiable invariants). Produce a prioritized plan; implement only after human approval at Verification.
Run ID: 01KWEQMG546XCJ1TPHT2K7YJXT
Pipeline progress: 4 of 20 stages completed

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
  -rw-r--r-- 1 root root 38694 Jul  1 11:39 docs/unified/ARCHITECTURE.md
  -rw-r--r-- 1 root root 26993 Jul  1 11:39 docs/unified/SPEC.md
  ```

## Stage: assess
- Status: succeeded
- Handler: agent
- Model: gpt-5.4
- Tokens: 98.7k in / 6.5k out
- Files touched: /workspace/kurvitza/findings/assess.md
- Response:
  > Assessment written to `findings/assess.md`.
  > 
  > Verdict: `interior-designer` is significantly off the target architecture. The top 3 gaps to fix first are:
  > 1. Split the 1661-line Zustand god store and move server state/writes out of it.
  > 2. Remove client-side Supabase writes and bespoke polling/localStorage job flows.
  > 3. Add a proper module `index.ts` and migrate toward the canonical `ui/state/io/core/services/tasks` structure.

## Stage: clarify_prep
- Status: succeeded
- Handler: agent
- Model: gpt-5.4
- Tokens: 16.3k in / 1.9k out
- Files touched: /workspace/kurvitza/CLARIFY.md, /workspace/kurvitza/DECISIONS.md, /workspace/kurvitza/PLAN.md
- Response:
  > ## Assessment summary
  > `src/domains/interior-designer` is materially off the target module blueprint. The biggest issues are at the architecture boundaries: browser-side writes, a monolithic Zustand store holding server state and persistence logic, and long-running flows managed in UI code instead of the required API/service/task layers.
  > 
  > The module should be cleaned up in dependency order. The safest plan starts by fixing the write path and public API boundary, then splitting state and orchestration, and only then doing the broader folder/module reshape.
  > 
  > ## Key gaps (max 5)
  > - Browser-side Supabase writes in `useInteriorStore` violate the required server write path.
  > - A 1661-line Zustand store mixes UI state, server state, persistence, and domain logic.
  > - Texture/retexture/text-to-3d flows use bespoke polling, localStorage secrets, and UI-managed jobs instead of Trigger.dev + shared job primitives.
  > - The module lacks the target `index.ts` public barrel and canonical `ui/state/io/core/services/tasks` shape.
  > - App code and sibling modules import module internals directly, including cross-module internals that likely belong in `shared/`.
  > 
  > ## Pick one scope (most teams pick A, B, or C)
  > 
  > | Option | What the plan will assume |
  > | --- | --- |
  > | **[A] Staged migration** | Fix the unsafe boundaries first: move browser writes behind API → auth → service, introduce a public `index.ts`, add typed DTO seams, and then phase the module toward `ui/state/io/core/services/tasks` while preserving current editor behavior. |
  > | **[B] Minimal first step** | Limit the plan to the highest-risk leaks only: eliminate browser-side writes, define DTOs/API seams, add the module barrel, and clean up direct route/internal imports; defer the big store split and major UI/task migration. |
  > | **[C] Full blueprint** | Plan a coordinated end-state migration now: split the god store, move long-running generation flows to Trigger tasks, reorganize the module to the canonical blueprint, and remove cross-module internal imports in one larger pass. |
  > 
  > **Advanced:** [F] type custom constraints in freeform · [R] re-assess only if findings are wrong
  > 
  > **Recommendation: [A]** — it addresses the security and boundary violations first without forcing a risky one-pass rewrite of the whole editor.

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

Clean up and align the interior-designer module (src/domains/interior-designer) with the target architecture in docs/unified/ARCHITECTURE.md (module blueprint, dependency rule, non-negotiable invariants). Produce a prioritized plan; implement only after human approval at Verification.

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

1. `findings/assess.md` — primary input, including `## Metadata`.
2. `CLARIFY.md` — short scope framing (if present).
3. **`DECISIONS.md`** — update with the human's Clarify choice **before** drafting.
   Read `human.gate.Clarify.*` and `human.gate.text`. Record option, freeform text,
   in-scope vs deferred.
4. If re-invoked after Verification **[I]**, human notes are in
   `human.gate.Verification.*` / `human.gate.text`. Update both files; human
   judgment overrides severities.

## Mandatory spot-checks (before writing PLAN.md)

Run these **once** — do not exploratory re-discover what assess already found:

1. `index.ts` — does `src/domains/interior-designer/index.ts` exist? Read it; note
   what it exports (barrel leak vs missing).
2. **Largest files** — `wc -l` on the 3 largest `.ts`/`.tsx` files in the module.
3. **`z.any()`** — `grep -n 'z\.any()' src/domains/interior-designer/` (especially
   workflow/agent files).
4. **`localStorage`** — `grep -rn localStorage src/domains/interior-designer/services/`
   or job-related paths.
5. **Schema inversion** — does `src/db/schema.ts` import from the module's local
   `db/schema.ts`? Read both if assess flagged it.

Correct any stale assess claim you find; note corrections in the plan.

## Build the plan

Group findings into concrete **improvement items**:

```
### [Priority] Title
- Problem: what's wrong today (cite finding + location)
- Impact: why it matters
- Change: files/layers to create/modify/delete
- Effort: S / M / L
- Verification: typecheck, lint, test, manual
- Depends on: other items first (if any)
```

Prioritization: **P0** security/correctness · **P1** structural unblockers · **P2**
maintainability · **P3** nits.

## Output files

**`PLAN.md`** — if it exists, you may overwrite after your spot-checks (you will have
read the paths above). Structure:

1. **Summary** — 2-4 sentences.
2. **Prioritized items** — P0…P3.
3. **Suggested sequence** — order + **Minimum first increment** (bold the item numbers,
   e.g. Items 1–3 only for first developer visit).
4. **Deferred / out of scope** — explicit list.

**`DECISIONS.md`** — Clarify + any Verification notes.

## Context for downstream build routing

At the end of your work, emit this JSON block in your final response (required for
the workflow graph to skip UX Designer on backend-only plans):

```json
{
  "context_updates": {
    "plan.has_ui_surface": "yes|no",
    "plan.has_p0_security_issue": "yes|no"
  }
}
```

Set `plan.has_ui_surface` from `findings/assess.md` metadata and the planned increment:
- `"no"` when the minimum first increment is imports/schema/layers/Mastra only.
- `"yes"` when the increment changes user-visible UI flows or needs `UX.md`.

## Final response format (Verification gate — keep under 400 words)

Your final response **must** include:

1. **P0 declaration** — `No P0` or `P0 exists` with one-line evidence.
2. **Your Clarify decision recap** — e.g. "**Your Clarify decision: [A] Staged
   migration.** In scope: … Explicitly deferred: …" (3 lines from DECISIONS.md).
3. **First shippable increment** in bold.
4. **Item count** and rough effort (e.g. "8 items, ~2–3 dev days for increment 1").
5. Bulleted plan summary with concrete file references.

Then stop for **Verification**. Do not implement.

## Handoff

When `PLAN.md` and `DECISIONS.md` are updated, stop. Human reviews at Verification.
On **[I] iterate**, update both files and note what changed.