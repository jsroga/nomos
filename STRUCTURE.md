# STRUCTURE.md — src-root ideal layout (move contract)

**Module:** src-root · **Scope decision:** C — Full src-root (see `DECISIONS.md`)
**Authority:** `docs/unified/ARCHITECTURE.md` §3 + `docs/unified/SPEC.md` F-1…F-3.
This file is the **move contract**: `PLAN.md` todos reference rows here by section.

> Supersedes the previous domains-catalog STRUCTURE.md (that scope is a separate
> future run). Grounded in a fresh 2026-07-03 inventory (`ls`/`grep`, see PLAN §0).

---

## 1. Current top-level tree (`ls -1 src/`, 2026-07-03)

| Entry | Role today |
|---|---|
| `agent-core/` | Mastra kernel dupes: observability (459 LOC manual spans), models, judging, memory, skills, agents, planner, executive, persistence, search, workspace, schemas |
| `app/` | Next.js App Router — routes + API ✅ |
| `components/` | 18 loose app-shell components + `auth/`, `providers/`, `tour.tsx` + `ui/` (target-aligned subfolder, 170 imports) |
| `config/` | `style-presets.ts` (image-gen presets; 9 imports: WBT + storyteller + app routes) |
| `constants/` | `localStorage.ts`, `polling.ts`, `worldPromptIdeas.ts` (24 imports) |
| `content/` | `legal/` markdown read via `fs` from `app/terms` + `app/privacy` |
| `db/` | Drizzle schema + client ✅ |
| `domains/` | Product modules ✅ (internals out of scope) |
| `evaluation/` | Offline eval harness (2 imports from app) |
| `hooks/` | `useGameEntities.ts`, `useProjectFromUrl.ts` (9 imports; real impls already in `shared/data/`) |
| `infrastructure/` | `ai/` (replicate, meshy, fal, legnext, gateway, embeddings, rag, contextAssembler) + `storage/` (Supabase clients, `database.types.ts`) — 23 imports |
| `instrumentation.ts`, `instrumentation-client.ts` | Next.js instrumentation — stays at root ✅ |
| `lib/` | 6 shims (auth, api-utils, db, error-utils, security, utils = 252 imports) + 16 real files/dirs (~52 imports) |
| `mcp/` | MCP server (single entry) — keep per goal exception |
| `middleware.ts` | Next.js middleware — stays at root ✅ |
| `pages/` | Legacy Pages router: `api/mcp.ts` (live MCP HTTP endpoint) + `_error.tsx` (Sentry) |
| `prompts/` | Storyteller-only prompt registry/repository (5 imports, all storyteller) |
| `services/` | `entities.service.ts`, `storyteller.service.ts`, `tiles.service.ts`, `index.ts` (5 imports) |
| `shared/` | F-1 stubs ✅ — `agent-kernel/`, `auth/`, `data/`, `errors/`, `jobs/`, `observability/`, `types/`, `__tests__/` |
| `store/` | `useAuthStore` (2), `useErrorStore` (3), `useGlobalStatusStore` (16) |
| `trigger/` | Trigger.dev task files ✅ (registry role; internals untouched) |
| `types/` | `enums.ts`, `onboarding.ts`, `three-jsx.d.ts` (6 imports) |
| `workflows/` | `game-design/` (LIVE — imported by `app/api/workflows/game-design/route.ts`), `human-loop-workflow.ts`, `schema.ts` |

**23 entries → target is 8 folders + 3 root files.**

## 2. Ideal target tree (after this run)

```
src/
├─ domains/<module>/          # vertical slices (internals: domains-catalog run)
├─ shared/                    # cross-module (imported by 2+ modules)
│   ├─ agent-kernel/          # MastraInstance, models, agents, context, skills, scorers
│   ├─ ai/                    # external AI clients: replicate, meshy, fal, legnext,
│   │                         #   gateway, embeddings, rag (ex-infrastructure/ai)
│   ├─ auth/                  # auth, security, validation, useAuthStore, supabase-admin, admin-users
│   ├─ data/                  # api-utils, utils, url, fetch-cache, react-query, seedFromString
│   │   ├─ queries/           #   useGameEntities, useProjectFromUrl
│   │   ├─ generation/        #   TilesService, style-presets
│   │   ├─ constants/         #   localStorage, polling, visuals
│   │   └─ storage/           #   StorageService, supabase clients (ex-infrastructure/storage)
│   ├─ errors/                # error-utils, useErrorStore, ErrorBoundary(+Wrapper)
│   ├─ jobs/                  # useGlobalStatusStore, AsyncStatusIndicator, Troubleshoot*
│   ├─ observability/         # langfuse-session + ex-agent-core/observability (verbatim move)
│   ├─ tours/                 # tour engine + per-module tours + tour-constants + module-tours  [taxonomy extension — see note]
│   └─ types/                 # enums, onboarding, three-jsx.d.ts (ambient)
├─ components/ui/             # Radix + CVA primitives ONLY (+ ImageLightbox, LiquidGlass, EntityPicker)
├─ db/                        # schema + client + types.ts (ex database.types.ts)
├─ trigger/                   # task registry (unchanged)
├─ app/                       # routes + API glue
│   ├─ _shell/                # app chrome: GlobalHeader, GlobalSidebar, GameHubDashboard,
│   │                         #   ProjectLoader, ProjectSelectorDropdown, ProjectTourWrapper,
│   │                         #   ModuleOnboardingController, providers/, auth/
│   ├─ _content/legal/        # terms.md, privacy.md (fs-read by app/terms + app/privacy)
│   └─ api/mcp/route.ts       # migrated from pages/api/mcp.ts
├─ mcp/                       # ALLOWED EXCEPTION — single-entry MCP server (goal §inventory)
├─ evaluation/                # ALLOWED EXCEPTION — slim offline harness (overhaul deferred)
├─ middleware.ts              # stays at root
└─ instrumentation.ts / instrumentation-client.ts   # stay at root
```

> **Taxonomy note — `shared/tours/`:** ARCHITECTURE §3 lists six `shared/` children;
> the tour/onboarding system (tour engine + 5 module tours + constants, ~32 imports
> from 5 domains) is a cross-module client building block that fits none of them.
> Adding `shared/tours/` follows the §3 rule ("imported by 2+ modules → shared/").
> **`app/_shell/`** uses the Next.js private-folder convention; shell chrome is
> "app glue", legal under §3.

## 3. Disposition table (every legacy top-level folder)

| Folder | Disposition | Evidence / notes |
|---|---|---|
| `agent-core/` | **merge → `shared/agent-kernel/` + `shared/observability/`** | 30 imports (observability 19, agents 5, judging 2, models/skills/planner/executive 1 each). Subdirs with 0 `@/`-imports (memory, schemas, persistence, search, workspace) audited → delete if relative-import-free, else merge |
| `lib/` | **merge → `shared/*`, `db/`, domains; then delete** | 6 shims (252 imports) codemod-only; 16 real files mapped in §4 |
| `infrastructure/` | **merge → `shared/ai/`, `shared/data/storage/`, `db/types.ts`** | 23 imports across 3+ modules + trigger |
| `hooks/` | **delete after codemod** | 9 imports; impls already at `shared/data/queries/` + `shared/data/` |
| `store/` | **merge → `shared/auth/`, `shared/errors/`, `shared/jobs/`; delete** | 21 imports; `useAuthStore`/`useErrorStore` already exist in `shared/` |
| `services/` | **merge → `shared/data/` (entities, tiles) + `domains/storyteller/services/` (storyteller); delete** | 5 imports; `EntitiesService`/`TilesService` already in `shared/data/` |
| `prompts/` | **move → `domains/storyteller/prompts/`** | 5 imports, all storyteller |
| `evaluation/` | **keep slim** (exception) | 2 imports; scorer port deferred |
| `mcp/` | **keep** (exception) | single entry; 7 imports (self-tests + pages/api + app/api/api-keys) |
| `workflows/` | **move → `domains/game-design/workflows/`** | ⚠ assess correction: 1 live import from `app/api/workflows/game-design/route.ts`; NOT dead |
| `types/` | **merge → `shared/types/`; delete** | 6 imports |
| `config/` | **merge → `shared/data/generation/style-presets.ts`; delete** | 9 imports from WBT + storyteller + app routes (cross-module) |
| `constants/` | **merge → `shared/data/constants/` (localStorage, polling) + `domains/world-building-toolkit/` (worldPromptIdeas); delete** | 24 imports |
| `content/` | **move → `app/_content/legal/`; delete** | 0 imports; 2 `fs.path` string refs: `app/terms/page.tsx:10`, `app/privacy/page.tsx:10` |
| `pages/` | **migrate `api/mcp.ts` → `app/api/mcp/route.ts`; delete `_error.tsx` + folder** | ⚠ Risk: MCP SSE/`externalResolver` semantics — PLAN item 44 has a documented-exception fallback |
| `components/` (loose files) | **split → `app/_shell/`, `components/ui/`, `shared/errors|jobs|tours`** | 26 non-ui imports; `components/ui/` (170 imports) already correct |

## 4. Move map (old → new)

### 4a. Codemod-only (target already exists; rewrite import, then delete shim)

| Old import | New import | Sites |
|---|---|---|
| `@/lib/auth` | `@/shared/auth/auth` | 34 |
| `@/lib/api-utils` | `@/shared/data/api-utils` | 47 |
| `@/lib/db` | `@/db/client` | 44 |
| `@/lib/error-utils` | `@/shared/errors/error-utils` | 64 |
| `@/lib/security` | `@/shared/auth/security` | 2 |
| `@/lib/utils` | `@/shared/data/utils` | 61 |
| `@/lib/validation/auth` | `@/shared/auth/validation` | 5 |
| `@/hooks/useGameEntities` | `@/shared/data/queries/useGameEntities` | ~5 |
| `@/hooks/useProjectFromUrl` | `@/shared/data/useProjectFromUrl` | ~4 |
| `@/store/useAuthStore` | `@/shared/auth/useAuthStore` | 2 |
| `@/store/useErrorStore` | `@/shared/errors/useErrorStore` | 3 |
| `@/services/{entities,tiles}.service` | `@/shared/data/EntitiesService`, `@/shared/data/generation/TilesService` | ~3 |
| `@/services/storyteller.service` | `@/domains/storyteller` barrel (or its services path if barrel lacks the export) | ~2 |

### 4b. File moves (`git mv` + codemod)

| Old path | New path |
|---|---|
| `store/useGlobalStatusStore.ts` | `shared/jobs/useGlobalStatusStore.ts` (16 imports) |
| `agent-core/models.ts` | `shared/agent-kernel/models.ts` |
| `agent-core/observability.ts` | `shared/observability/observability.ts` (verbatim; Mastra-tracing rewrite deferred) |
| `agent-core/agents/*` | `shared/agent-kernel/agents/*` |
| `agent-core/judging/*` | `shared/agent-kernel/scorers/*` |
| `agent-core/skills/*` | `shared/agent-kernel/skills/*` |
| `agent-core/planner.ts`, `executive.ts` | `shared/agent-kernel/` |
| `agent-core/{memory,schemas,persistence,search,workspace}` | audit (0 `@/`-imports) → delete or merge to `shared/agent-kernel/` |
| `infrastructure/ai/*` (incl. `rag/`) | `shared/ai/*` |
| `infrastructure/storage/{StorageService,supabase,supabaseClient}.ts` | `shared/data/storage/*` |
| `infrastructure/storage/database.types.ts` | `db/types.ts` |
| `prompts/*` | `domains/storyteller/prompts/*` |
| `workflows/game-design/*` (+ `human-loop-workflow.ts`, `schema.ts` if relatively imported) | `domains/game-design/workflows/*` |
| `types/{enums,onboarding}.ts`, `types/three-jsx.d.ts` | `shared/types/*` |
| `config/style-presets.ts` | `shared/data/generation/style-presets.ts` |
| `constants/{localStorage,polling}.ts` | `shared/data/constants/*` |
| `constants/worldPromptIdeas.ts` | `domains/world-building-toolkit/` (existing constants home) |
| `content/legal/*` | `app/_content/legal/*` (+ update 2 fs-path strings) |
| `lib/{url,fetch-cache,react-query,seedFromString}.*` | `shared/data/*` |
| `lib/{supabase-admin.ts,admin-users.tsx}` | `shared/auth/*` |
| `lib/langfuse-session.ts` | `shared/observability/langfuse-session.ts` |
| `lib/agent-context/cross-domain-context.ts` | `shared/agent-kernel/context/cross-domain-context.ts` |
| `lib/constants/visuals.ts` | `shared/data/constants/visuals.ts` |
| `lib/server/{image-service,prompts}.ts` | audit importers → `domains/world-building-toolkit/services/` (default) or `shared/data/server/` |
| `lib/{chat-persistence,bible-permissions}.ts` | `domains/storyteller/services/` (single-domain; confirm via grep) |
| `lib/{tour-constants,module-tours}.ts`, `lib/tours/*`, `components/tour.tsx` | `shared/tours/*` |
| `components/{GlobalHeader,GlobalSidebar,GameHubDashboard,ProjectLoader,ProjectSelectorDropdown,ProjectTourWrapper,ModuleOnboardingController}.tsx`, `components/providers/`, `components/auth/` | `app/_shell/*` |
| `components/{ErrorBoundary,ErrorBoundaryWrapper}.tsx` | `shared/errors/*` |
| `components/{AsyncStatusIndicator,TroubleshootIndicator,TroubleshootPanel}.tsx` | `shared/jobs/*` |
| `components/{ImageLightbox,LiquidGlass,EntityPicker}.tsx` | `components/ui/*` |
| `pages/api/mcp.ts` | `app/api/mcp/route.ts` (Node runtime route handler) |
| `pages/_error.tsx` | delete (App-Router `global-error` covers once `pages/` is gone) |

## 5. Re-export shim plan (SPEC F-1 staged migration)

- **Existing shims** (`lib/auth`, `api-utils`, `db`, `error-utils`, `security`, `utils`): codemod importers this run, **then delete the shim files** — no new shims needed.
- **Temporary shims created then removed within this run** (so move and codemod land as separate, individually-green commits): `store/useGlobalStatusStore.ts`, `agent-core/observability.ts`, `agent-core/models.ts` → 3-line `export * from '@/shared/...'`.
- **No shims** for ≤9-import paths (`prompts`, `types`, `config`, `services`, `hooks`, `workflows`, `store/useAuthStore`, `store/useErrorStore`) — atomic move+codemod per commit.
- End state: **zero shim files remain**; boundary lint at `error` blocks all legacy paths.

## 6. Out of scope for this run

- `src/domains/*` internal reshape (domains-catalog run) — only import-line fixes.
- `evaluation/` rewrite / Mastra `createScorer` port (dedicated eval run).
- Rewriting `agent-core/observability.ts` onto Mastra AI Tracing (A-stream) — this run **moves** it verbatim.
- `useAuthStore` → TanStack Query refactor (behavior change).
- `mcp/` internals; `trigger/` internals; `db/schema.ts` contents.
