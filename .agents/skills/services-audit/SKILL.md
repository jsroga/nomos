---
name: services-audit
description: Reconnaissance pass over the services/data/API layer — run BEFORE adding backend logic so you reuse existing services, schemas, and boundaries
---

# Services Audit

**Run this before you add or change backend/data logic.** Its purpose is to
locate the existing service, schema, and boundary you should extend rather than
duplicating business logic across API routes, the MCP server, and Trigger tasks.
Extra context from the user:

> {{user_input}}

This is a read-only pre-work audit. Do **not** implement the change here.

## Step 1 — Map the services layer

Shared business logic lives in `src/services/*` and is consumed by **both** the
REST API and the MCP server (see the header comment in `src/services/index.ts`).

- List the services and their exports: `entities.service.ts`,
  `storyteller.service.ts`, `tiles.service.ts` (tiles/3D/portrait), and the
  barrel `index.ts`.
- Note each service's **Zod input schemas** and exported types — these are the
  contract. New behavior should extend an existing schema, not invent a parallel one.
- Note the `ServiceContext` pattern and `ServiceError` / `ServiceErrorCode` used
  for typed errors.

## Step 2 — Map the boundaries the service touches

- **Database:** Drizzle ORM; schema in `src/db/schema.ts`. Identify the tables
  involved and whether a schema change/migration would be required.
- **Auth:** check `src/lib/auth.ts` and how routes derive the user/context.
- **Storage / external:** `src/infrastructure/storage/*` (Supabase),
  `src/lib/supabase-admin.ts` (service-role client).
- **Background work:** Trigger.dev tasks under `src/trigger/*` — note which
  services enqueue tasks and how run status is polled.
- **AI/agents:** `src/agent-core/*` and per-domain `agents/` if the work touches
  generation.

## Step 3 — Trace the call paths

For the capability you're about to add/modify, trace where it would live:

- Which **API route** (`src/app/api/**/route.ts`) would call it?
- Is the same logic also exposed via the **MCP server** (`src/mcp/*`)? If so, the
  logic belongs in the shared service so both stay in sync.
- Does a **Trigger.dev task** need to run it async?

Record the full path: route/MCP → service → DB/storage/trigger.

## Step 4 — Reuse vs. build decision

| Need | Existing service/schema? | Action |
| --- | --- | --- |
| list/create/update an entity | `entities.service` + its schemas | extend |
| character/episode/beat op | `storyteller.service` | extend |
| tile / 3D / portrait gen | `tiles.service` (Trigger-backed) | reuse |
| genuinely new domain op | none | add a method to the right service |

Prefer adding a method to an existing service over creating a new service or
putting logic directly in a route handler.

## Step 5 — Flag risks & gaps

- **Logic duplication** between a route and the MCP server (a smell — consolidate
  into the service).
- **Schema drift:** input validated one way in the route, another in the service.
- **Missing validation** at a boundary (untrusted input reaching the DB).
- **Migration risk:** schema changes, backfills, or data-loss potential.
- **Secrets/auth:** anything that would widen access or log sensitive data.
- **Trigger coupling:** tasks importing modules that need env at build time
  (note the lazy `supabaseAdmin` proxy pattern that exists for this reason).

## Step 6 — Report

Deliverable:

- **Relevant services & schemas** (with paths) and their contracts.
- **Boundaries touched** (DB tables, auth, storage, trigger, agents).
- **Build recommendation:** which service/method/schema to extend, and whether a
  migration is needed.
- **Risks & open questions** for a human where a decision is ambiguous.

## Example audit output (shape)

```markdown
### Services Audit — "add favorite flag to projects"

Relevant services & schemas
- storyteller.service.ts — owns project/character/episode ops; extend its schemas.
- src/db/schema.ts — `projects` table; needs a `favorite: boolean` column (migration).

Boundaries touched
- DB: projects (schema change → migration required).
- Auth: src/lib/auth.ts — must check the project belongs to the user.
- MCP: exposed via src/mcp — keep logic in the service so both stay in sync.

Build plan
- Add `favorite` to the project update schema + a service method.
- Call it from PATCH route and MCP; gate on ownership.

Risks
- Migration on projects table.
- Don't duplicate the update logic in the route — put it in the service.
```

## Fast commands for the audit

- List services: glob `src/services/**/*.ts`; read `index.ts` for the contracts.
- Find where a capability is used: grep the service/method name across
  `src/app/api` and `src/mcp`.
- Check the schema: read the relevant table in `src/db/schema.ts`.

Keep it tight and actionable so the implementing step can start with a clear map
of where its code belongs.
