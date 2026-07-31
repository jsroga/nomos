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
| `shared/` | Cross-module — allowlist in `scripts/structure-gates/src-topology.ts` (`admin`, `agent-kernel`, `auth`, `canvas`, `chat`, `data`, `debug`, `errors`, `jobs`, `observability` + legacy `ai`/`three`/`tours`/`types`/`workspace`) |
| `components/` | Design system (PascalCase folders) |
| `db/` | Drizzle schema + `db` client (`DATABASE_URL`) |
| `trigger/` | Task registry |
| `trigger-dark-factory/` | Opt-in Cursor SDK execute task (esbuild-external; not in default `TRIGGER_DIRS`) |
| `mcp/` | MCP server (separate deployable) |

`src/mastra.ts` — Mastra Studio CLI entry; `src/mastra/agents/` holds file-based instructions. Production instance: `src/shared/agent-kernel/MastraInstance.ts`.  
Evals: top-level `evals/`. Structure tests: `src/__tests__/structure.test.ts`, `src/domains/__tests__/domain-structure.test.ts`.

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
| Embeddings | Voyage (optional) | RAG |
| Images | Gemini / Grok / Stability / LegNext | Tiles & media |
| 3D | Meshy / Hyper3D / … | Asset exporter tasks |
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

The `NEXT_PUBLIC_` prefix inlines the list into the client bundle so the UI can hide admin affordances. It is **not** a security boundary — treat it as public and keep every real check server-side, as the routes above do. Anything genuinely secret stays in RLS policies or server-only env.

## Core patterns

1. **RAG** — hybrid search + rerank; cite sources.
2. **Async workers** — Frontend → API → Trigger → persist → poll/subscribe.
3. **One Mastra instance / one Postgres store** — see AGENTS.md.
4. **Quality gates** — `qualitygate:*`, metrics 400/800 lines, complexity 15/25 — [DEVELOPMENT.md](./DEVELOPMENT.md).

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
