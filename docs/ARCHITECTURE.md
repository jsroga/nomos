# System Architecture

> World Building Kit — multi-agent creative production platform.  
> **Companion:** [MODULES.md](./MODULES.md) · [STORYTELLER.md](./STORYTELLER.md) · [DEVELOPMENT.md](./DEVELOPMENT.md) · root [AGENTS.md](../AGENTS.md)

## Overview

1. **Presentation** — Next.js 16 (App Router, RSC)
2. **Application** — API routes, Server Actions, SSE streams
3. **Domain** — Mastra v1 agents / tools / workflows under `src/domains/*`
4. **Infrastructure** — Supabase Postgres, Trigger.dev, AI providers, Vercel Blob

### Locked stack

Next.js 16 · Mastra · Radix/CVA · Supabase · TanStack Query · Trigger.dev · Vercel · Drizzle (`src/db`).

## `src/` topology

| Folder | Role |
|--------|------|
| `app/` | Thin routes + API glue only |
| `domains/` | Feature vertical slices (blueprint below) |
| `shared/` | Cross-module — allowlist in `scripts/structure-gates/src-topology.ts` (`admin`, `agent-kernel`, `auth`, `canvas`, `chat`, `data`, `debug`, `errors`, `jobs`, `observability`, `openapi` + legacy `ai`/`three`/`tours`/`types`/`workspace`) |
| `components/` | Design system (PascalCase folders) |
| `db/` | Drizzle schema + `db` client (`DATABASE_URL`) |
| `trigger/` | Task registry |
| `mcp/` | MCP server (separate deployable) |

`src/mastra.ts` — Mastra Studio CLI entry; `src/mastra/agents/` holds file-based instructions. Production instance: `src/shared/agent-kernel/MastraInstance.ts`.  
Evals: top-level `evals/`. Structure tests: `src/__tests__/structure.test.ts`, `src/domains/__tests__/domain-structure.test.ts`.  
Storybook (shared primitives): top-level `stories/` + `.storybook/` — Vite catalog of `src/components/`, not App Router.

### Dependency rule

```
app  → domains/<m>/index.ts → module internals
domains/<m> → shared/*, components, db   (never another domain)
shared/* → shared/*, db                  (never domains)
core/ (pure) → no React, no db, no fetch
```

## Module blueprint

Every `src/domains/<module>/`:

```
index.ts          # ONLY public import target
ui/               # React (PascalCase components)
state/            # Zustand UI + TanStack queries/mutations
core/             # pure types/logic; core/io/ = typed fetchers + DTOs
contracts/        # Zod schemas + mappers; the ONLY place snake_case lives
services/         # server-only Drizzle / external APIs
ai/               # server-only Mastra (agents under ai/agents/)
tasks/            # Trigger.dev schemaTask
```

**Rules**

- Server state → **TanStack Query**; Zustand → ephemeral UI only.
- Browser never writes with privileged Supabase credentials — API → `requireAuth()` → Drizzle.
- Long work (>~1s) → Trigger.dev + Realtime / poll; no bespoke `window` events.
- Asset modules lean on `tasks/`; AI modules use `ai/` + prompts.
- AI layer naming: domain folder is `ai/` (not `agents/`); packages live in `ai/agents/`.

Conformance: domain-structure tests + ESLint (`.cursor/rules/eslint-boundaries.mdc`, `domain-structure.mdc`).

## Contracts: parse once, at the edge

A shape is established in exactly one place — a `contracts/` module per
aggregate — and everything downstream reads a typed value.

```
src/domains/<module>/contracts/
  <aggregate>.schema.ts    # Zod + the inferred row type + the domain type
  <aggregate>.mapper.ts    # row <-> domain; the ONLY place snake_case appears
  index.ts
```

**Why.** This repo bans `as`, so `recordFromJson` / `readString` were the honest
way to handle untyped data — and there are over a thousand such calls. The
problem is not the guards, it is *where they run*: guarding field by field at
every reader means the shape is never established anywhere, and a payload that
lost a field produces `undefined` at whichever reader touches it first, far from
the cause. Database spellings leak the same way in the other direction, all the
way into UI components.

```ts
// before — the shape is re-derived at every reader
const row = recordFromJson(asset.metadata)
const taskId = readString(row.meshy_task_id)

// after — parsed once; downstream code has a type
const metadata = parseGenerationMetadata(asset.metadata)
const taskId = metadata?.meshyTaskId          // string | undefined, guaranteed
```

**Which parse belongs where.** `safeParse` at a boundary you do not control — a
request body (answer 400), a provider response, a JSONB column written by older
code (degrade rather than break). `parse` where a bad shape is a bug in this
codebase and should throw loudly; a `safeParse` there invites a fallback that
hides corruption.

**Strip, strict, passthrough — they are three different things.**

| | Behaviour | Use for |
|---|---|---|
| `z.object()` (default) | drops unknown keys | a stored shape we own, read from data older code wrote |
| `.strict()` | rejects unknown keys | a shape whose every key is known now and forever |
| `.passthrough()` | forwards unknown keys | a **provider or model** boundary only, with a comment saying so |

Zod's default is *strip*, not strict. It is usually the right middle: it keeps
what is known and refuses to carry what is not, so a stray spelling cannot
spread the way `.passthrough()` lets one spread. `.strict()` on a legacy column
means one unrecognised key discards the whole record.

**A forgotten field is caught by a test, not by strictness** — assert that the
mapper writes back exactly the keys the schema declares.

**An alias is legitimate** only when a spelling exists in data you cannot
rewrite. Declare it in the schema with a comment naming where it comes from;
never let `.passthrough()` carry it implicitly.

Worked example: `src/domains/3d-asset-exporter/contracts/`.

Enforced by: `npx vitest run scripts/__tests__/untyped-json-inventory.test.ts`
(ratchets `untypedJsonReads`, `snakeCaseReadsOutsideMappers`,
`passthroughSchemas`, `zodAnyUses`; a converted module may not regress).

## TypeScript & ESLint (strict)

- `strict: true`; `@typescript-eslint/no-explicit-any` **error**
- Type assertions banned (`assertionStyle: 'never'`, `as const` only)
- Cross-domain imports forbidden — lift to `@/shared`
- Protocol strings → TypeScript `enum`
- Shared deep merge: `@/shared/data/deep-merge`; URLs: `@/shared/data/url-builder`

## System context

```mermaid
graph TB
    Creator[Content Creator] --> App[Next.js App]
    Dev[MCP Client] --> MCP[MCP Server]
    App --> Mastra[Mastra Agents]
    App --> Workers[Trigger.dev]
    App --> Supabase[(Supabase Postgres)]
    Workers --> Blob[Vercel Blob]
    App --> MastraObs[Mastra Observability]
    App --> Vercel[Vercel OTEL / Sentry]
```

## Data flow (typical agent turn)

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as API / SSE
    participant Agent as Domain Agent
    participant DB as Postgres

    U->>FE: Prompt
    FE->>API: POST chat/stream
    API->>Agent: generate/stream
    Agent->>DB: tools / RAG / persist
    Agent-->>API: stream chunks
    API-->>FE: SSE frames
```

## Third-party services

| Category | Service | Role |
|----------|---------|------|
| Hosting | Vercel | App + Blob |
| Jobs | Trigger.dev | Image / 3D / long work |
| DB / Auth | Supabase | Postgres + pgvector + Auth |
| LLM gateway | OpenRouter (primary) | Agents / scorers |
| Embeddings | OpenRouter | RAG (`/embeddings`; optional Cohere rerank) |
| Images | Gemini / Grok / Stability / LegNext | Tiles & media |
| 3D | Meshy / Hyper3D / … | Asset exporter tasks |
| Music links | YouTube public search (`youtube-search-api`, unauthenticated scrape) | Resolves soundtrack video ids from title/artist — a model cannot recall a video id, so it is never trusted to supply one |
| Observability | Mastra store + Sentry/OTel | AI spans vs HTTP |

## Access control

Two tiers. Supabase Auth + RLS decides *whether you are signed in and which rows you own*; an admin allowlist decides *who may change platform-wide settings*.

`NEXT_PUBLIC_CENTRAL_USERS` is a comma-separated list of admin emails (falls back to `ADMIN_USER_EMAIL` in `shared/auth/constants/admin-users`). `isAdminUser(email)` normalises case and whitespace, then membership-tests it.

| Surface | Gate |
|---|---|
| `/admin` route group | `app/(workspace)/admin/layout.tsx` redirects non-admins |
| `GET/PUT /api/admin/model-settings` (+ `/probe`) | `isAdminUser` before any write |
| `/api/admin/modules`, `/api/admin/tests` | `isAdminUser` |
| World Bible lock, onboarding bypass | `shared/auth/bible-permissions` |
| Background job runs (read + cancel) | `shared/jobs/owned-run` — see below |

### Persistence

`shared/persistence/` is the one home for database access: the Drizzle client, and `serviceRoleClient(reason)` for the deliberate RLS bypass that tasks need. Every service-role acquisition names a reason and is logged, so "who bypasses RLS and why" is a query rather than an archaeology exercise.

`@/db/client` remains as a deprecated re-export for one release; the importer count is tracked as `directDbClientImporters` in `.quality-ratchet.json`.

**Tenancy is a type.** Services that read tenant data take a `ProjectScope` — a branded token whose only constructor verifies ownership — not a bare `projectId: string`. A caller that has not done the check has nothing to pass, so the omission is a build error. `local/no-bare-project-id-param` reports the remaining bare signatures (report-only while the baseline burns down). See docs/DECISIONS.md ADR 0002.

### API authentication

Two layers, deliberately unequal.

**The edge proxy default-denies `/api/**`.** `src/proxy.ts` (Next 16's middleware) calls `denyAnonymousApiRequest`, which rejects any `/api` request carrying no Supabase session cookie. It is a coarse filter, not the authorization decision — it cannot do a database lookup — so it removes only the class where a route forgot to ask at all. Behind it, every handler still authenticates, and ownership checks still decide what a caller may touch.

`MIDDLEWARE_DENY_MODE` selects `report` (log and allow) or `enforce` (401). Report exists so the deny list can be observed against real traffic before it bites; anything appearing in the log is either a missing allowlist entry or a real vulnerability.

**`PUBLIC_API_PATHS`** (`shared/auth/constants/public-api-paths`) is the one allowlist in the system, because it *is* the security decision rather than a way to avoid one. Every entry states why it is public. Adding one is a security review.

**Using the session.** A handler that binds the authenticated session and never reads it is an error (`local/no-discarded-auth-context`): in an API route that usually means it proved *someone* is signed in, then acted on a caller-supplied id without checking *who*. Routes that genuinely need only session existence say so on the first line of the handler — `// auth-scope: session-existence-only — <reason>` — an explicit statement rather than a path exemption.

**Reads through Drizzle are not protected.** RLS applies only on the request-scoped Supabase-client path. Anything reaching the database through Drizzle must verify ownership itself, and services that take a `projectId` take the caller's `userId` alongside it.

**Status codes.** `401` no session · `404` authenticated but not the owner — **never `403`**, which confirms the resource exists · `400` schema failure.

Machine-checked by `src/app/api/__tests__/route-auth-conformance.test.ts`, which enumerates the real route tree and asserts every handler — including its `_lib/` helpers — reaches an auth idiom, with `PUBLIC_API_PATHS` as the only exclusion. It also asserts every allowlist entry still maps to a live route, so the two cannot drift.

**Edge runtime.** `proxy.ts` and anything it imports run on the Edge. A `no-restricted-imports` block keeps `@/db`, drizzle, Node builtins and provider/job SDKs out of that bundle, with a fixture under `scripts/gate-fixtures/` that must fail.

### Background job runs

A Trigger.dev run id is **not** a capability token: it is handed to the client on trigger and echoed in URLs and logs. Reading or cancelling a run therefore has to prove the caller owns the project the run belongs to, or any signed-in user can read any tenant's generation output.

- **One owner module.** `shared/jobs/owned-run.ts` is the only legal caller of `runs.retrieve` / `runs.cancel` / `runs.subscribeToRun`. Use `retrieveOwnedRun(runId, userId)` and `cancelOwnedRun(runId, userId)`.
- **Ownership travels on a run tag.** `triggerOwnedRun` stamps `project:<uuid>`, derived from the payload's `projectId`. Task-written *metadata* is not a reliable source — most tasks never set one. A run that cannot be tagged is refused rather than created unreadable.
- **404, never 403.** A 403 confirms that someone else's run id exists.
- **No user?** `retrieveSystemRun(runId, SystemRunReason)` — a named, countable reason, not a path exemption.

Machine-checked by `local/trigger-runs-ownership` (`npm run lint`), which ships a deliberately-invalid fixture under `scripts/gate-fixtures/` that must fail; `scripts/__tests__/gate-fixtures.test.ts` asserts it still does, so the rule cannot be silently disabled.

The `NEXT_PUBLIC_` prefix inlines the list into the client bundle so the UI can hide admin affordances. It is **not** a security boundary — treat it as public and keep every real check server-side, as the routes above do. Anything genuinely secret stays in RLS policies or server-only env. The `anon` role has no table grants in `public`, so the public API key cannot enumerate relations via PostgREST or GraphQL; signed-in browser clients use `authenticated`, and server jobs use `service_role`. `pg_graphql` is not installed.

## Core patterns

1. **RAG** — hybrid search + rerank; cite sources.
2. **Async workers** — Frontend → API → Trigger → persist → poll/subscribe.
3. **One Mastra instance / one Postgres store** — see AGENTS.md.
4. **Quality gates** — `qualitygate:*`, metrics 400/800 lines, complexity 15/25 — [DEVELOPMENT.md](./DEVELOPMENT.md).
5. **One declaration per world-bible section** — see below.

### Adding a world-bible section

Edit `src/domains/storyteller/core/bible/section-registry.ts` and run `npm run test:unit`. That is the whole procedure.

`SECTION_REGISTRY` is typed `Record<WorldBibleSection, SectionSpec>`, so a new `BibleSection` member that is not declared **fails to compile**:

```
error TS2741: Property '[BibleSection.X]' is missing in type '{ … }'
  but required in type 'Record<WorldBibleSection, SectionSpec>'.
```

Each entry carries `owner`, `merge`, `hydrates`, an optional `hydratesAs` (the spelling content reaches UI state under, when it differs), `aliases`, and `label`. **A section that does not hydrate must say `why`** — a defect and a decision look identical in code otherwise, and telling them apart is the point.

`BIBLE_OWNED_PLAN_FIELDS` and `HYDRATION_PLAN_FIELDS` are derived. They were three hand-kept lists that had to agree; when one drifted, a section silently stopped appearing — soundtracks, then factions, then plot twists, then the roadmap and executive summary.

Eight world-level fields (`genre`, `tone`, `sequences`, `seasonStructure`, `centralTheme`, `masterPrompt`, `moodImages`, `executiveSummary`) are story-plan scalars rather than `BibleSection` members, so the type cannot force them. They are declared in `WORLD_SCALAR_FIELDS`, and a coverage test fails if a wire plan field is neither a section, a scalar, nor episode-owned.

## Mastra Studio

```bash
npm run mastra:dev    # :4111
npm run mastra:build
npm run mastra:smoke  # handover when Mastra paths change
```

| Concern | Location |
|---------|----------|
| Studio entry | `src/mastra.ts` |
| File-based agents | `src/mastra/agents/<id>/` |
| Runtime registry | `src/shared/agent-kernel/mastra/runtime-registry.ts` |
| Domain agents | `src/domains/*/ai/` |

## Agent local workspace (`.local/`)

| Path | Use |
|------|-----|
| `.local/sessions/…` | Multi-request tracking |
| `.local/tmp/…` | Throwaway recon |
| `.local/quality-backlog.md` | Cached gate failures |

Templates: `.agents/templates/session/`.
