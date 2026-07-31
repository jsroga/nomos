---
name: sse-wire-contract
description: Preserve and verify the storyteller chat SSE wire contract when changing stream routes, workflow adapters, or tool-result mappers — frame types, order, and e2e smoke. Use before merging any chat/orchestration PR.
---

# SSE Wire Contract

The storyteller **SSE chat stream is a published contract**. Adapter-only changes allowed; **frame types and order must not drift** without explicit human approval.

Extra context:

> {{user_input}}

**Governing docs:** `docs/STORYTELLER.md`, `docs/ARCHITECTURE.md`, `src/domains/chat/` consumer (`useChatStream.ts`).

## Step 1 — Know the surface

Primary route:

```
src/app/api/storyteller/chat/stream/route.ts
```

Related:

- `src/domains/storyteller/config/tool-result-mapper.ts` — tool results → UI actions
- `src/domains/chat/state/useChatStream.ts` — client reducer (published event types)
- `e2e/scenarios/storyteller-smoke.script.ts` — smoke assertions

```bash
wc -l src/app/api/storyteller/chat/stream/route.ts
rg -n "type:\s*['\"]|StreamChunk|event:" src/app/api/storyteller/chat/stream/route.ts | head -40
rg -n "type:" src/domains/chat/state/useChatStream.ts | head -30
```

Read `docs/STORYTELLER.md` for suspend/resume + AgentController expectations if HITL changes.

## Step 2 — Inventory event types (before/after)

Build two lists:

**Server emits** — every distinct SSE `type` (or JSON line shape) the route writes today.

**Client handles** — every `type` in `useChatStream` reducer / handlers.

Flag:

- **New types** — require client + docs update (high risk)
- **Renamed types** — breaking change
- **Order assumptions** — e.g. actions after final message, phase transitions, tool-call frames

## Step 3 — Change rules (enforce)

| Allowed | Forbidden |
| --- | --- |
| Call workflow/Mastra inside route; map workflow events → **existing** SSE types | Reorder frames clients depend on |
| Add fields **inside** existing payload objects if clients ignore unknown keys | Remove or rename `type` strings |
| Move business logic to workflow/tools/services | Import client UI through storyteller barrel in route |
| Use server-side submodule imports (see route header comment) | Change auth/access checks without security review |

Route must **not** import `@/domains/storyteller` barrel (pulls client UI) — use `agents/`, `services/`, `config/` subpaths.

## Step 4 — Diff check (when code changed)

```bash
git diff -- src/app/api/storyteller/chat/stream/route.ts \
  src/domains/storyteller/config/tool-result-mapper.ts \
  src/domains/chat/state/useChatStream.ts
```

For each hunk affecting `type`, `write`, or frame emission order, write one sentence: **breaking / non-breaking / needs client sync**.

If orchestration-rfc **characterization fixtures** exist under `tests/` or `src/`, run them; if not, note gap.

## Step 5 — Run smoke verification

Requires app + auth (see e2e config):

```bash
# Unit: chat stream reducer if touched
npm run test:unit -- src/domains/chat

# E2E smoke (needs dev server + env — see docs/DEVELOPMENT.md)
npm run test:e2e smoke
```

If smoke cannot run locally, list **exact** manual steps: login, project id, message that triggers tool/action frames.

## Step 6 — Report

Deliver:

| Check | Pass/Fail | Evidence |
| --- | --- | --- |
| Event type set unchanged | | diff / rg |
| Order invariants documented | | cite orchestration-rfc clauses |
| Client reducer handles all emitted types | | cross-reference table |
| Smoke / unit tests | | command output |
| Barrel import avoided in route | | rg `@/domains/storyteller'` in route |

**Verdict:** `SAFE TO MERGE` | `NEEDS CLIENT UPDATE` | `BREAKING — STOP`

Do not mark storyteller orchestration work complete without this check when the stream route or workflow→SSE adapter changed.
