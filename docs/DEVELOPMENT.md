# Development — tests, evals, observability, quality

> Daily commands also live in root [CLAUDE.md](../CLAUDE.md).

## Test tiers

| Tier | Command | Location |
|------|---------|----------|
| Unit | `npm run test:unit` | `src/**/__tests__/**` (Vitest) |
| E2E | `npm run test:e2e [scenario]` | Playwright via `scripts/run-e2e.ts` |
| Eval | `npm run eval` | `evals/` + Mastra scorers |

```bash
npm run test:unit
npx vitest run src/domains/storyteller/ai/tools/__tests__/storytelling.test.ts
npm run test:e2e smoke
npm run eval -- --samples=5
npm run eval:dashboard
npm run dev:stack   # Next :3000 + Mastra Studio :4111 + Trigger.dev
```

- Colocate unit tests next to code. Exclude `*.e2e.test.ts` from default unit runs (need DB/LLM).
- E2E needs `npm run dev` (or `dev:stack`) + `.env.local`.
- Golden set: `evals/datasets/storyteller-golden.ts`. Baseline: `evals/results/latest.json` — **no scorer may regress** below baseline to ship.

### Eval gating (short)

| Change touches… | Gate scorers |
|-----------------|--------------|
| Author prompt / draft-revise | `magic`, `prose-craft`, `stakes-cost`, `story-motion` |
| Tools / context / canon | `consistency`, `hallucination` |
| Critics | `prose-craft`, `stakes-cost` |

## Quality gates

| When | Command |
|------|---------|
| After focused edit | `npm run qualitygate:file -- <path>` |
| Every 5 todos | `npm run qualitygate:changed` |
| Many failures | `npm run qualitygate:capture` → `.local/quality-backlog.md` |
| Before “done” | `npm run typecheck` · `npm run lint` · `npm run test:unit` |
| Commit | `npm run precommit` (never `--no-verify`) |
| OpenAPI public docs | `npm run openapi:generate` · `npm run openapi:check` (precommit) |
| Module handoff | `node scripts/fabro-verify.mjs` |

**Metrics (warn / error):** 400 / 800 lines · complexity 15 / 25.  
**IMPORTANT — never disable rules on your own if not allowed.** No file-level `eslint-disable` and no new `eslint.config.js` `'off'` overrides without explicit user approval.

ESLint (`eslint.config.js`) ignores generated/local trees (`.mastra/**`, `.local/**`, `.design-sync/**`). `local/no-magic-string` is off for Vitest and Playwright suites (`**/__tests__/**`, `**/*.test.*`, `**/*.e2e.test.*`, `e2e/**`) — titles and fixtures are prose, not wire vocabulary.

## Public OpenAPI (`/api-docs`)

Scalar at `/api-docs` serves committed [`public/openapi.json`](../public/openapi.json). **Zod is the contract** — do not hand-edit the JSON.

To add or change a documented route:

1. Put request/response Zod in `core/io/*.dto.ts` or `@/shared/data/*-service` (parse in the route).
2. Register path + method in `src/shared/openapi/register-shared-routes.ts` or `src/domains/<module>/core/io/openapi-routes.ts`.
3. Run `npm run openapi:generate` and commit `public/openapi.json`.
4. `npm run openapi:check` (also in precommit) fails if the committed spec drifts.

SSE chat streams stay out of the REST spec; MCP tool details live in [MCP_API.md](./MCP_API.md).

## Observability

Two systems (not correlated today):

| System | Records | Sink |
|--------|---------|------|
| Mastra AI tracing | Agents, tools, workflows, scorers | Mastra Postgres store → Studio; optional Cloud |
| Sentry / `@vercel/otel` | HTTP, RSC, errors | Sentry |

Config: `src/shared/agent-kernel/mastra/observability-config.ts`. Spans in app code: `withMastraSpan()` from `@/shared/observability/mastra-tracing`. Storage uses `PostgresStoreVNext` so Studio discovery/feedback endpoints work (optional `OBSERVABILITY_DATABASE_URL`, else `DATABASE_URL`).

```bash
MASTRA_TRACE_CONSOLE=true
MASTRA_TRACE_SAMPLE_RATIO=0.1
MASTRA_PLATFORM_ACCESS_TOKEN=
npm run mastra:dev   # Traces tab
```

`MODEL_CHUNK` spans dropped by default (`MASTRA_TRACE_MODEL_CHUNKS=true` to keep).

## Perf debug (opt-in)

```bash
NEXT_PUBLIC_FF_CWV_HUD=true      # live Core Web Vitals overlay (attribution) — restart dev
NEXT_PUBLIC_FF_PERF_DEBUG=true   # React Scan + CWV HUD + 3d-canvas renderer HUD
npm run analyze                  # ANALYZE=true webpack bundle report
npm run audit:cwv -- --url http://localhost:3000/
```

UI lives in `src/shared/debug/`. Unset both flags → overlays hidden.

### 3D canvas operator checklist

With `NEXT_PUBLIC_FF_PERF_DEBUG=true` open `/{projectId}/3d-canvas` and confirm:

1. Idle orbit FPS rises vs pre-change baseline; shadow map ≤2048 at High.
2. Sculpt ~10s — heightmap bumps/s stay near ~30; undo still reverts walls/objects (not every brush stamp).
3. Scatter ~100 props — object count climbs without Html loaders; tab hidden → frameloop stops.
4. Switch Render Quality Low/Medium/High under Terrain → Optimization & Lighting.

## Landing SSR (`ssr: false`)

On marketing pages: `{ ssr: false }` is allowed **only** for non-text FX (WebGL / canvas / Three). Text and content sections must SSR — use `dynamic()` without `ssr: false`, plus scroll/idle gates for FX. Agent rule: `.cursor/rules/marketing-ssr.mdc`. Full product UI contract (projects, chat, tokens): [DESIGN.md](./DESIGN.md).

## Landing A/B (hero headline)

Sticky cookie `lp_hero` (`a` | `b`) assigned in `src/proxy.ts` on `/`. Split via env (0–100); missing → 50/50; one side set → other is remainder; both set but not summing to 100 → normalized.

| Env | Effect |
|---|---|
| `LANDING_HERO_AB_A_PCT` | Share for variant A (`SHIP / GAMES / NOT BUSYWORK`) |
| `LANDING_HERO_AB_B_PCT` | Share for variant B (`BUILD / FASTER / SHIP BETTER`) |

Copy lives in `LANDING_HERO_HEADLINES` (`src/domains/marketing/ui/LandingPage/constants/landing-copy.ts`).

## Feature flags

Opt-in flags are named `FF_<NAME>` and turn on with the exact value `true`; anything else is off. Server code reads them via `isFeatureEnabled(FeatureFlag.X)` from `@/shared/data/constants/feature-flags`. Client code must reference `process.env.NEXT_PUBLIC_FF_*` as a literal so Next can inline it — the helper does not work in the browser bundle.

| Flag | Effect |
|---|---|
| `FF_STORYTELLER_CONTROLLER` | Plan-first AgentController path for chat |
| `FF_STORYTELLER_AUTONOMOUS` | Durable autonomous drafting loop (goals + durable agents) |
| `FF_LOOP_CREATOR_MASTRA` | Loop-creator chat via Mastra instead of the legacy adapter |
| `FF_REMOTE_PROMPTS` | Remote prompt hub instead of the local registry |
| `FF_INTERNAL_DOCS` | Exposes `GET /api/settings/models` in production (still requires `INTERNAL_DOCS_SECRET`) |
| `NEXT_PUBLIC_FF_PERF_DEBUG` | React Scan overlay + CWV HUD + CharacterWeb timings |
| `NEXT_PUBLIC_FF_CWV_HUD` | Core Web Vitals overlay only |

**Kill switches are not `FF_` flags.** `STORYTELLER_GUARDRAILS_ENABLED`, `STORYTELLER_HITL_ENABLED`, `STORYTELLER_USE_PROMPT_HUB`, and `VOYAGE_ENABLED` default to **on** and use `!== 'false'`. Renaming them would invert their meaning and silently disable guardrails when unset.

## Model routing

Every model resolves through the OpenRouter gateway on `OPENROUTER_API_KEY`. Defaults live in `src/shared/agent-kernel/models.ts` and the per-domain `config/model-config.ts`; agents default to `openrouter/auto-beta`. Pin a slot by setting its env var to a `provider/model` id — the gateway prefix is added automatically.

| Slot | Env var | Resolver |
|---|---|---|
| Storyteller chat (Writers Room) | UI picker → `STORYTELLER_CHAT_MODEL` → matrix `chat` | `resolveRoleModel('chat')` + RequestContext `storyteller.chatModel` |
| Storyteller orchestration | `STORYTELLER_{AUTHOR,PLANNER,CRITIC,MUSE,PREMISE}_MODEL` | `ROLE_ENV_VARS` → `resolveRoleModel` (not the chat picker) |
| Game design | `GAME_DESIGN_MODEL` | `domains/game-design/config/model-config.ts` |
| Loop creator | `LOOP_CREATOR_MODEL` | `domains/loop-creator/config/model-config.ts` |
| Generation | `GENERATION_MODEL`, `GENERATION_MODEL_FAST`, `GENERATION_MODEL_CREATIVE` | `models.ts` |
| Planning | `PLANNING_MODEL`, `PLANNING_MODEL_REASONING` | `models.ts` |
| Embeddings | `EMBEDDING_MODEL` (default `openai/text-embedding-3-small`) | OpenRouter `/embeddings` |
| Eval judges | `JUDGING_MODEL`, `JUDGING_MODEL_FALLBACK` | `models.ts` |
| Chat picker fallback (client default) | `NEXT_PUBLIC_DEFAULT_AGENT_MODEL` | `resolveChatModelId` when env chat pin unset |

**Writers Room vs orchestration.** The composer offers three catalog models (Kimi / GLM / Opus). That choice only overrides the **chat adapter**. Beat-draft author, planner, critics, muse, and premise use their own matrix rows and `STORYTELLER_*_MODEL` pins — never the picker. `STORYTELLER_CHAT_MODEL` is the server default when the client sends no picker id.

**Image models (Apiframe)** — pixel paths use `APIFRAME_API_KEY` only. Pin a surface with `IMAGE_*_MODEL` (see `.env.local.example`). Generate values: `midjourney` · `nano-banana` · `nano-banana-pro` · `grok-imagine-image` · `gpt-image-1.5` · `flux-2-pro`. Upscale: `topaz-image-upscale` · `clarity-upscale` · `midjourney`. Repaint: `flux-fill-pro`. Resolvers live in `src/shared/ai/image-model-env.ts`.

Overrides are read at call time, not module load, so dotenv scripts and per-environment rollbacks work regardless of import order. `GET /api/settings/models` prints the resolved role→model table with provenance.

The Writers Room picker offers three catalog models (Kimi / GLM / Opus); selection is chat-only. Orchestration pins use `STORYTELLER_{AUTHOR,PLANNER,CRITIC,MUSE,PREMISE}_MODEL`. Text LLMs, RAG embeddings, and Cohere rerank use `OPENROUTER_API_KEY` only — `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GOOGLE_API_KEY` are optional legacy fallbacks. Image paths use Apiframe (`APIFRAME_API_KEY`).

## Mastra / agents

See root [AGENTS.md](../AGENTS.md). Smoke: `npm run mastra:smoke`.

Studio bundling resolves `@/*` via `tsconfig.json` `compilerOptions.paths` and requires `baseUrl: "."`. If `mastra dev` crashes with `Cannot find package '@/…'`, wipe the stale bundle (`rm -rf .mastra`) and restart — smoke also fails when `.mastra/output/index.mjs` still contains those imports.
