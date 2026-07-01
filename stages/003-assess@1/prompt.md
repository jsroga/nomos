Goal: Clean up and align the interior-designer module (src/domains/interior-designer) with the target architecture in docs/unified/ARCHITECTURE.md (module blueprint, dependency rule, non-negotiable invariants). Produce a prioritized plan; implement only after human approval at Verification.
Run ID: 01KWEP38BTFCTZJRAPW78J15JT
Completed 2 stage(s) so far.

Recent stages:
- scope: succeeded (Script completed: M="${FABRO_INPUT_MODULE:-storyteller}"; echo "=== module: $M ==="; find "src/domains/$M" -type f | sort | head -120; echo; echo '=== git status ==='; git status --short; echo; echo '=== architecture contract ==='; ls -la docs/unified/ARCHITECTURE.md docs/unified/SPEC.md 2>&1)
  - Script: `M="${FABRO_INPUT_MODULE:-storyteller}"; echo "=== module: $M ==="; find "src/domains/$M" -type f | sort | head -120; echo; echo '=== git status ==='; git status --short; echo; echo '=== architecture contract ==='; ls -la docs/unified/ARCHITECTURE.md docs/unified/SPEC.md 2>&1`
  - Output:
    ```
    (102 lines omitted)
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
    -rw-r--r-- 1 root root 38694 Jul  1 11:12 docs/unified/ARCHITECTURE.md
    -rw-r--r-- 1 root root 26993 Jul  1 11:12 docs/unified/SPEC.md
    ```


# Role: Architecture Assessor (fast pass)

You do a **single, tight assessment** of the target module against this project's
target architecture. You are the only reviewer, and you are on a **2-minute
budget** — be fast and focused, not exhaustive. You do **not** write a plan and
you do **not** modify code.

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

## How to work (stay under ~2 minutes)

- The **`Scope` stage output already contains the full module file tree and git
  status** — use that tree directly. Do **NOT** re-glob the module root
  (`glob("src/domains/*")`, `glob("**/index.ts")`, etc.) — it wastes tool calls
  and returns empty when the sandbox cwd differs.
- Read **only** what you need to judge alignment: the module's `index.ts` (if any),
  its top-level folders, and a *small* representative sample (2-4 files) per concern
  below. Skim, don't deep-read every file.
- Judge against the **target** state, but be fair: modules are mid-migration, so
  distinguish "not yet migrated" from "actively moving the wrong way".
- Do not modify code. Do not run builds or tests.

## What to check (the highest-leverage lenses only)

1. **Layering & blueprint** — does the module have the `ui/state/io/core/services/
   agents/tasks/prompts` shape and a single public `index.ts` barrel? What's missing
   or mis-placed?
2. **Dependency rule** — any inward/downward violations? (`ui` touching `services`/
   `db`/`io` directly, `core` importing React/DB/IO, cross-module internal imports.)
3. **State split** — server data living in Zustand instead of TanStack Query.
4. **Write path & schema** — browser→Supabase writes; manual snake_case remapping.
5. **Framework-once** — hand-rolled parallels to Mastra primitives.
6. **Typed boundaries & size** — `any` at edges; god files over the size limits.

**Asset modules** (`interior-designer`, `world-building-toolkit`, `3d-asset-exporter`):
lean on `tasks/` not `agents/`; flag browser→Supabase writes, bespoke job polling in
`components/`, and monolithic Zustand stores (`useInteriorStore`, etc.) as high-leverage
findings.

## Output

Write concise findings to `findings/assess.md` with `write_file`, then give a short
summary. For each finding use:

```
### [SEV] Short title
- Location: path (or layer)
- Divergence: which invariant/§ it breaks
- Cost: what it causes today / risks later
- Target: what the on-architecture version looks like
```

Severity: **Critical / High / Medium / Low**. Keep it to the ~6-10 findings that
matter most — this feeds Clarify prep and Plan, which need signal, not a catalog.

**End `findings/assess.md` with this required metadata block** (downstream agents
and the graph condition on it):

```markdown
## Metadata
- has_ui_surface: yes|no
- has_p0_security_issue: yes|no
- top_violation_layer: barrel|state|schema|ai|jobs|other
```

- `has_ui_surface: no` when the work is internal structure (imports, schema, layers,
  Mastra wiring) with no meaningful user-visible UI change in this increment.
- `has_p0_security_issue: yes` only for active security/correctness holes (client
  writes, auth bypass, data loss).

Then:

## Open questions for Clarify
List 0–5 items where a human decision is needed before planning (scope, trade-offs,
conflicts between findings). If none, write "None — safe to plan with defaults."

Then a one-line verdict and the **top 3 gaps** to fix first. Stop.