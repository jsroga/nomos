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
| Module handoff | `node scripts/fabro-verify.mjs` |

**Metrics (warn / error):** 400 / 800 lines · complexity 15 / 25.  
**IMPORTANT — never disable rules on your own if not allowed.** No file-level `eslint-disable` and no new `eslint.config.js` `'off'` overrides without explicit user approval.

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
NEXT_PUBLIC_FF_PERF_DEBUG=true   # React Scan re-render overlay (+ enables CWV HUD too)
npm run analyze                  # ANALYZE=true webpack bundle report
npm run audit:cwv -- --url http://localhost:3000/
```

UI lives in `src/shared/debug/`. Unset both flags → overlays hidden.

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
| Storyteller roles | `STORYTELLER_{AUTHOR,PLANNER,CRITIC,MUSE,PREMISE,CHAT}_MODEL` | `ROLE_ENV_VARS` → `resolveRoleModel` |
| Game design | `GAME_DESIGN_MODEL` | `domains/game-design/config/model-config.ts` |
| Loop creator | `LOOP_CREATOR_MODEL` | `domains/loop-creator/config/model-config.ts` |
| Generation | `GENERATION_MODEL`, `GENERATION_MODEL_FAST`, `GENERATION_MODEL_CREATIVE` | `models.ts` |
| Planning | `PLANNING_MODEL`, `PLANNING_MODEL_REASONING` | `models.ts` |
| Embeddings | `EMBEDDING_MODEL` (default `openai/text-embedding-3-small`) | OpenRouter `/embeddings` |
| Eval judges | `JUDGING_MODEL`, `JUDGING_MODEL_FALLBACK` | `models.ts` |
| Writers-room picker default | `NEXT_PUBLIC_DEFAULT_AGENT_MODEL` | `domains/storyteller/config/constants/model-config.ts` |

Overrides are read at call time, not module load, so dotenv scripts and per-environment rollbacks work regardless of import order. `GET /api/settings/models` prints the resolved role→model table with provenance.

The writers-room picker offers Kimi 2.7 (`moonshotai/kimi-k2.7-code`) and GLM 5.2 (`z-ai/glm-5.2`); both route through the same key, so no per-provider keys are required. RAG embeddings and Cohere rerank also use `OPENROUTER_API_KEY`. Remaining direct-provider exceptions: OpenAI for the moodboard, `generate-metrics`, and interior-texture endpoints.

## Mastra / agents

See root [AGENTS.md](../AGENTS.md). Smoke: `npm run mastra:smoke`.
