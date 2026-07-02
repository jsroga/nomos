Goal: Audit and clean up the **root `src/` layout** — not a single domain module.

**Problem:** `src/` has too many top-level folders (20+). Many predate the unified
architecture and overlap with the target `shared/` layer or belong inside
`domains/<module>/`.

**Target (from `docs/unified/ARCHITECTURE.md` §3):**

```
src/
├─ domains/<module>/     # vertical slices — unit of ownership
├─ shared/               # cross-module: agent-kernel, jobs, data, auth, observability, errors
├─ components/ui/        # Radix design system primitives
├─ db/                   # Drizzle schema + client
├─ trigger/              # thin re-export registry only
└─ app/                  # Next.js routes — thin glue only
```

**In scope for this plan:**

- Inventory every current top-level folder under `src/` (agent-core, app, components,
  config, constants, content, db, domains, evaluation, hooks, infrastructure, lib, mcp,
  pages, prompts, services, store, trigger, types, workflows).
- For each folder: keep at root, merge into `shared/`, move into a domain, or delete
  (with evidence: import graph, duplicate responsibility).
- Propose a **phased migration** — no big-bang; preserve builds between phases.
- Call out what must stay at root vs what is legacy parallel to `shared/`
  (`lib`, `agent-core`, `infrastructure`, `services`, `store`, `hooks`, `pages`,
  `workflows`, `evaluation`, `mcp`, `prompts`, `types`, `constants`, `config`,
  `content`).
- Dependency rule: `shared/*` never imports domains; domains import `shared/` + `db` +
  `components/ui` only.

**Out of scope:**

- Rewriting individual domain internals (separate module runs).
- Changing locked stack (Mastra, Radix, Supabase, TanStack Query, Trigger.dev).

**Deliverable:** A prioritized `PLAN.md` the human can approve at Verification.
First increment should be **planning + low-risk moves** (barrels, re-exports, lint
boundaries) before deep refactors. Implement only after human **[A] Approve & build**.

Run ID: 01KWGZNNB1GY50Q5CKFHBFEGH5
Pipeline progress: 4 of 23 stages completed

## Stage: scope
- Status: succeeded
- Handler: agent
- Model: claude-sonnet-4-5
- Tokens: 2.5k in / 443 out
- Response:
  > I'll run the scope commands to inventory the current `src/` layout.

## Stage: assess
- Status: succeeded
- Handler: agent
- Model: claude-sonnet-4-5
- Tokens: 30.3k in / 8.6k out
- Files touched: /workspace/kurvitza/findings/assess.md
- Response:
  > ## Assessment Complete
  > 
  > **Root `src/` layout is 60% pre-architecture.** 12 of 20 top-level folders predate the unified structure and belong in `shared/`, domains, or should be deleted. The critical gap: **no `shared/` folder exists**, blocking module convergence.
  > 
  > ### Key Findings
  > 
  > **Critical:** Functionality scattered across 8 parallel folders (`agent-core`, `lib`, `infrastructure`, `services`, `store`, `hooks`, `prompts`, `types`) with no single `shared/` layer — ~2,700 LOC in `agent-core/` duplicates Mastra primitives; cross-module auth/errors/data live in ad-hoc locations.
  > 
  > **High impact, low risk:** Domains already don't import from legacy folders (grep confirmed zero hits), so migration is move-and-re-export, not rewrite. Root `services/` has 3 files that duplicate domain services or belong in `shared/data/`.
  > 
  > **Top 3 gaps:**
  > 1. Create `shared/` structure (agent-kernel, jobs, data, auth, observability, errors, types)
  > 2. Move cross-domain primitives (`lib/auth`, `services/entities`, `hooks/useGameEntities`) to `shared/`
  > 3. Set up ESLint boundary rules blocking `domains/` from importing legacy root folders
  > 
  > Full phased migration plan in `findings/assess.md` — recommend **Phase 1 only** (foundation + low-risk moves) in first increment, then validate before proceeding.

## Stage: clarify_prep
- Status: succeeded
- Handler: agent
- Model: claude-sonnet-4-5
- Tokens: 12.1k in / 2.1k out
- Files touched: /workspace/kurvitza/CLARIFY.md, /workspace/kurvitza/DECISIONS.md, /workspace/kurvitza/PLAN.md
- Response:
  > ---
  > 
  > ## Assessment summary
  > The root `src/` has 20+ top-level folders; 12 predate the unified architecture and belong in `shared/`, domains, or should be deleted. **No `shared/` folder exists** — ~2,700 LOC of cross-module concerns are scattered across `agent-core/`, `lib/`, `infrastructure/`, `services/`, `store/`, `hooks/`, `prompts/`, `types/`. Domains don't import from these legacy folders, so migration is primarily move-and-re-export work, not rewrites.
  > 
  > ## Key gaps (max 5)
  > - **No `shared/` layer** — blocking foundation; need 7 sub-folders (agent-kernel, jobs, data, auth, observability, errors, types)
  > - **8 parallel root folders** replace `shared/` (`agent-core/` has 2,700 LOC; `lib/`, `infrastructure/`, `services/`, `store/`, `hooks/`, `prompts/`, `types/`)
  > - **Root `services/` duplication** — `storyteller.service.ts` (277 LOC) exists both at root and in `domains/storyteller/`; need reconciliation
  > - **Dev-time tools in runtime `src/`** — `evaluation/` (16 subfolders), `mcp/` (protocol server), `workflows/` should move or stay for imports
  > - **16 app components at root** — GameHubDashboard, GlobalHeader, GlobalSidebar belong in `app/components/`, not root `components/`
  > 
  > ## Pick one scope (buttons are A / B / C — meanings are module-specific below)
  > 
  > | Button | What the plan will assume for **this** module |
  > | --- | --- |
  > | **[A]** | **Phased (3 increments):** First, create `shared/` structure + move tiny files (`lib/auth`, `lib/error-utils`, 2 stores) + ESLint rules; validate build. Second, move cross-domain services (`services/entities`, `hooks/useGameEntities`). Third, consolidate `agent-core/` + `prompts/`. Defers `infrastructure/`, `mcp/`, `evaluation/`, `components/` cleanup to follow-up. ~15 file moves total. |
  > | **[B]** | **Foundation only (1 increment):** Create `shared/` structure (7 folders + barrels), move 4 tiny files (`lib/auth`, `lib/error-utils`, `store/useAuthStore`, `store/useErrorStore`), add ESLint boundary rules. **Stop and validate** before touching services, agent-core, or prompts. ~4 file moves; safe first step. |
  > | **[C]** | **Full convergence (1 big increment):** Execute all 5 phases — create `shared/`, move all 12 legacy folders (`agent-core`, `lib`, `infrastructure`, `services`, `store`, `hooks`, `prompts`, `types`, `constants`, `config`, `content`, `pages`), delete roots, move `mcp/` + `evaluation/`, redistribute `components/`. ~50 file moves; reconcile `services/storyteller` duplication; handle `infrastructure/ai/gateway` delete-vs-port decision. High-risk, high-reward. |
  > 
  > **Advanced:** type custom constraints in freeform (routes to [F]) · pick [R] only if assess findings are wrong
  > 
  > **Recommendation: [B]** — Start with foundation only: the current build works (no imports from legacy folders), so establish `shared/` + ESLint rules first, validate builds + tests pass, then commit to larger moves after proving the structure.

## Stage: Clarify
- Status: succeeded
- Handler: human

## Current context
| Key | Value |
|-----|-------|
| human.gate.Clarify.answer | C |
| human.gate.Clarify.label | [C] Full blueprint |
| human.gate.Clarify.question | Choose scope A, B, or C for this module (see Clarify Prep summary — table defines what each means here) |
| human.gate.label | [C] Full blueprint |
| human.gate.selected | C |


# Role: Plan Author

You turn the assessment into a **prioritized, reviewable improvement plan** — the
deliverable of this workflow. You do **not** implement anything. A developer must
be able to execute your plan without rediscovering the codebase.

## The goal / target

Audit and clean up the **root `src/` layout** — not a single domain module.

**Problem:** `src/` has too many top-level folders (20+). Many predate the unified
architecture and overlap with the target `shared/` layer or belong inside
`domains/<module>/`.

**Target (from `docs/unified/ARCHITECTURE.md` §3):**

```
src/
├─ domains/<module>/     # vertical slices — unit of ownership
├─ shared/               # cross-module: agent-kernel, jobs, data, auth, observability, errors
├─ components/ui/        # Radix design system primitives
├─ db/                   # Drizzle schema + client
├─ trigger/              # thin re-export registry only
└─ app/                  # Next.js routes — thin glue only
```

**In scope for this plan:**

- Inventory every current top-level folder under `src/` (agent-core, app, components,
  config, constants, content, db, domains, evaluation, hooks, infrastructure, lib, mcp,
  pages, prompts, services, store, trigger, types, workflows).
- For each folder: keep at root, merge into `shared/`, move into a domain, or delete
  (with evidence: import graph, duplicate responsibility).
- Propose a **phased migration** — no big-bang; preserve builds between phases.
- Call out what must stay at root vs what is legacy parallel to `shared/`
  (`lib`, `agent-core`, `infrastructure`, `services`, `store`, `hooks`, `pages`,
  `workflows`, `evaluation`, `mcp`, `prompts`, `types`, `constants`, `config`,
  `content`).
- Dependency rule: `shared/*` never imports domains; domains import `shared/` + `db` +
  `components/ui` only.

**Out of scope:**

- Rewriting individual domain internals (separate module runs).
- Changing locked stack (Mastra, Radix, Supabase, TanStack Query, Trigger.dev).

**Deliverable:** A prioritized `PLAN.md` the human can approve at Verification.
First increment should be **planning + low-risk moves** (barrels, re-exports, lint
boundaries) before deep refactors. Implement only after human **[A] Approve & build**.


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
4. If re-invoked after Verification **[I] Iterate**, human notes are in
   `human.gate.Verification.*` / `human.gate.text`. Update both files only when the
   note is **substantive** (concrete changes requested). If the note is empty, a lone
   letter (`A`, `B`, `P`), or generic approval ("looks good", "approve", "LGTM"), do
   **not** rewrite the plan — respond: "No iteration notes. At Verification pick
   **[A] Approve & build** to implement (Clarify is already done)." Then stop.

## Mandatory spot-checks (before writing PLAN.md)

Run these **once** — do not exploratory re-discover what assess already found.
**Use `grep`, not `rg`** (ripgrep isn't installed on this stage); for literal
strings with regex chars use `grep -rnF`. Keep patterns simple to avoid failed
tool calls.

For **`inputs.module=src-root`**: spot-check the **root `src/` layout** instead of
one domain — top-level folder purposes, import fan-in (`grep -rn "from ['\"]@/src/` or
`from ['\"]@/` patterns), overlap with target `shared/`, and largest god files per
legacy folder. Skip domain-only checks below.

For a **domain module**:

1. `index.ts` — does `src/domains/src-root/index.ts` exist? Read it; note
   what it exports (barrel leak vs missing).
2. **Largest files** — `wc -l` on the 3 largest `.ts`/`.tsx` files in the module.
3. **`z.any()`** — `grep -n 'z\.any()' src/domains/src-root/` (especially
   workflow/agent files).
4. **`localStorage`** — `grep -rn localStorage src/domains/src-root/services/`
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
4. **Minimum first increment — developer substeps** — numbered checklist of **15–25**
   concrete, file-level actions for that increment only (one line each: exact path +
   what changes). The Developer maps these **1:1** to `todo_write` middle todos — do
   **not** roll up to one line per plan item. Example granularity:
   - "Add PATCH rename handler in `app/api/interior-designer/designs/route.ts`"
   - "Replace `renameDesign` Supabase call in `store/useInteriorStore.ts` with io API"
   - "Remove `getSupabaseClient` import from `store/useInteriorStore.ts`"
   - "grep: confirm zero `getSupabaseClient` in `src/domains/interior-designer`"
5. **Deferred / out of scope** — explicit list.

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

6. **Verification reminder:** pick **[A] Approve & build** to implement, **[B]** for
   plan-only, **[I]** only if you want plan changes (type notes), **[X]** to abort.
   (Clarify's A/B/C are already decided — do not type `A` expecting build unless you
   choose option **[A]** on this gate.)

Then stop for **Verification**. Do not implement.

## Handoff

When `PLAN.md` and `DECISIONS.md` are updated, stop. Human reviews at Verification.
On **[I] iterate**, update both files and note what changed.