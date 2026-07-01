Goal: Clean up and align the interior-designer module (src/domains/interior-designer) with the target architecture in docs/unified/ARCHITECTURE.md (module blueprint, dependency rule, non-negotiable invariants). Produce a prioritized plan; implement only after human approval at Verification.
Run ID: 01KWF235AJ3MHXRQ14XX486YCT
Completed 3 stage(s) so far.

Recent stages:
- scope: succeeded (Stage completed: scope)
  - Model: gpt-5.4, 5.2k tokens in / 836 out
- assess: succeeded (Stage completed: assess)
  - Model: gpt-5.4, 55.0k tokens in / 3.8k out
  - Files: /repos/jsroga/kurvitza/findings/assess.md


# Role: Clarify Facilitator

You run **after** the architecture assessment and **before** the Plan (Architect).
Your job is to turn assessment findings into **one scope decision** the human can
make at the Clarify gate — without reading any file.

You do **not** write the full `PLAN.md`. You do **not** implement anything.

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

## Inputs — read first

1. `findings/assess.md` — assessment output (required), including the `## Metadata`
   block (`has_ui_surface`, etc.).
2. The Scope stage output in context (module tree, git status).
3. **Run context** — check `human.gate.Clarify.*` and `human.gate.Clarify.answer`.

**Read before write.** `CLARIFY.md`, `DECISIONS.md`, and `PLAN.md` usually already
exist (prior runs / this repo). Fabro blocks `write_file` on an unread existing file,
so read each one before you overwrite it — otherwise the write fails and wastes a turn.

## If Clarify was already answered (re-run / plan retry loop)

Skip re-prompting **only** when Fabro run context already has `human.gate.Clarify.answer`
or `human.gate.Clarify.label` set (plan retry / checkpoint resume).

**Never** skip because `DECISIONS.md` or `CLARIFY.md` on disk say "resolved" — those files
may be **stale artifacts from a prior module or run** (they must not be committed; this
run overwrites them). If the files mention a different module than `Clean up and align the interior-designer module (src/domains/interior-designer) with the target architecture in docs/unified/ARCHITECTURE.md (module blueprint, dependency rule, non-negotiable invariants). Produce a prioritized plan; implement only after human approval at Verification.`, ignore
them entirely and regenerate from `findings/assess.md`.

If `human.gate.Clarify.answer` or `human.gate.Clarify.label` **is** set in run context:

- Write a one-line note to `CLARIFY.md`: "Clarify already resolved — see DECISIONS.md."
- Skip the human gate brief in your final response; say "Clarify already answered:
  {label}. Proceeding to Plan."
- Stop.

This prevents plan `goal_gate` retries from wiping a resolved decision.

## What to look for

Target module is in the run goal (`src/domains/<name>/`). **Only** use
`findings/assess.md` and Scope output for this run — not stale `CLARIFY.md` /
`DECISIONS.md` text from another module.

Summarize the **biggest gaps for this module** (max 5 bullets). The human picks
**one** scope level (A/B/C) via the gate buttons. **Do not** invent a multi-question
Q1–Q5 survey — one decision, three module-specific scope postures.

## Output files

**`CLARIFY.md`** — short architect reference only (max ~40 lines):

```markdown
# Clarify reference

## Summary
<2 sentences>

## Key risks (max 5)
- …

## Scope mapping
| Option | Posture for this module |
| A | … |
| B | … |
| C | … |
```

**`DECISIONS.md`** — only if Clarify is still pending:

```markdown
# Decisions log

## Clarify gate (pending)
- Status: awaiting human selection
```

**`PLAN.md`** — clear stale plans so Plan Author starts clean (avoids read-before-write
detour on an unread 300-line file):

```markdown
# Plan (pending)

Awaiting Plan Author — previous plan cleared at Clarify prep.
```

Use `write_file` for all three when Clarify is pending.

## Your final response — THIS is what the human sees in the Fabro dock

Do **not** tell them to read `CLARIFY.md`. Put everything inline:

```markdown
## Assessment summary
<2–3 sentences>

## Key gaps (max 5)
- …

## Pick one scope (buttons are A / B / C — meanings are module-specific below)

The Fabro dock shows generic **[A] [B] [C]** buttons. Your table defines what each
means **for this module** (from assess findings — not a generic migration template):

| Button | What the plan will assume for **this** module |
| --- | --- |
| **[A]** | <staged posture — cite actual gaps: files, layers, risks> |
| **[B]** | <minimal first step — cite what is in vs deferred for this module> |
| **[C]** | <full blueprint — cite end-state reshape for this module> |

**Advanced:** type custom constraints in freeform (routes to [F]) · pick [R] only if
assess findings are wrong

**Recommendation: [A/B/C]** — <one sentence tied to this module's P0/P1 findings>

The [A]/[B]/[C] buttons match this table, not the other way around.
```

Tailor every row to **this** module. Then stop.