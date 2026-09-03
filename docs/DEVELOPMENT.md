# Development — tests, evals, observability, quality

> Daily commands also live in root [CLAUDE.md](../CLAUDE.md).


## Adding an environment variable

1. Add it to `serverEnvSchema` in `src/shared/config/env.ts` — or to `clientEnv` in `env.client.ts` if it is `NEXT_PUBLIC_*`.
2. Add it to `.env.local.example` with a one-line comment.
3. `npm run env:check`.

Required vs optional is read off the call sites, not judged: a bare use or an existing throw means required, a `??` default means optional with that default, and anything ambiguous resolves to **optional**. A wrong `optional` is a familiar late failure; a wrong `required` is an app that will not start.

`NEXT_PUBLIC_*` values must stay literal member expressions in `env.client.ts` — Next substitutes them at build time only where the source reads `process.env.NEXT_PUBLIC_X` verbatim, so a loop or a helper ships `undefined` to the browser.

`env.ts` deliberately does **not** import `server-only`: `shared/persistence/client.ts` reads `DATABASE_URL`, and the OpenAPI generator loads that module under `tsx`, where the marker throws. The production build is what enforces the boundary — it fails on a client component reaching a server module and prints the import trace. A module that reads server configuration and is reachable from a client component should still split, as `config/resolve-chat-model.ts` does for the chat model catalog.

### Verifying that public values are still inlined

Two halves, because only one of them can be a unit test.

`src/shared/config/__tests__/env-client.test.ts` protects the *precondition* — every read is a literal member expression, nothing is computed or looped. That is what a refactor would break.

The *outcome* needs a build:

```bash
npm run build
grep -rl "$(grep '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2-)" .next/static/chunks/   # ≥ 1
grep -rl 'process\.env\.NEXT_PUBLIC_SUPABASE_URL' .next/static/chunks/                          # 0
```

The value must appear in a client chunk and the expression must not survive. Run it after changing `env.client.ts`.

## Test tiers

| Tier | Command | Location |
|------|---------|----------|
| Unit | `npm run test:unit` | `src/**/__tests__/**` (Vitest) |
| Coverage | `npm run test:coverage` | Vitest `@vitest/coverage-v8` · HTML at `coverage/index.html` |
| E2E | `npm run test:e2e [scenario]` | Playwright via `scripts/run-e2e.ts` |
| Scorer fixture | `npm run eval:scorer-fixture` | `evals/` + Mastra scorers on frozen `referenceOutput` |
| Agent contract | `npm run eval:agent-contract` | `beat-draft-workflow` mechanics + trace contracts |
| Storybook | `npm run storybook` | `stories/` + `.storybook/` (Vite; `src/components/` primitives) |

```bash
npm run test:unit
npm run test:coverage
npm run test:coverage:open
npx vitest run src/domains/storyteller/ai/tools/__tests__/storytelling.test.ts
npm run test:e2e smoke
npm run eval:scorer-fixture -- --samples=5
npm run eval:agent-contract
npm run eval:dashboard
npm run storybook   # Vite catalog of src/components primitives (:6006)
npm run dev:stack   # Next :3000 + Mastra Studio :4111 + Trigger.dev
```

- Colocate unit tests next to code. Exclude `*.e2e.test.ts` from default unit runs (need DB/LLM).
- Coverage (`npm run test:coverage`) uses `@vitest/coverage-v8` on every `src` `.ts`/`.tsx` file (`all: true`). `test:unit` stays uninstrumented. HTML / LCOV / json-summary land in `coverage/` (gitignored); `npm run test:coverage:open` generates then opens the HTML report.
- E2E needs `npm run dev` (or `dev:stack`) + `.env.local`. Default Playwright (`:3001` production start) sets `DATABASE_SSL_REJECT_UNAUTHORIZED=false` so a TLS-inspecting proxy does not block Postgres.
- Golden set: `evals/datasets/storyteller-golden.ts`.
- `npm run eval` is a **fixture-only alias** of `eval:scorer-fixture`. It is not agent quality.

### The eval gate

**Two files, two jobs.** `evals/baselines/<dataset>.<date>.json` is the
*reference* — a run someone inspected and chose, dated and never overwritten.
`evals/results/latest.json` is the *last run*, overwritten every time.
Comparison is always latest vs a named baseline; choosing a new one is a
visible commit.

```bash
npm run eval:gate            # run scorer fixtures, compare to the newest baseline, exit 1 on a regression
npm run eval:scorer-fixture  # run fixtures only, no comparison (`npm run eval` is the same)
npm run eval:agent-contract  # workflow contract tests (no live model)
npm run eval:full            # both fixture datasets — before a release, after a model change
npm run eval:noise           # re-measure σ after changing a judge or the golden set
```

**These fixture scorers are not agent quality.** They score frozen
`referenceOutput` on golden examples. A green `eval:scorer-fixture` does not
mean the live beat-draft agent improved.

**A regression is a drop beyond noise, not any drop.** LLM judges are
stochastic; a hard `>=` on a mean of 24 examples fails constantly, and a gate
that cries wolf gets disabled. The threshold is `max(2σ, 0.02)` per scorer,
with σ measured over three unchanged runs and committed in
`evals/constants/thresholds.ts` beside the number it came from.

A σ of 0 from an **LLM judge** means "no variation observed in three runs", not
"deterministic" — three scorers (`consistency`, `critic-discipline`,
`beat-plan-concreteness`) are genuinely deterministic; the rest are judges whose
golden examples happen to be unambiguous. The 0.02 floor is what stops those
zeros becoming hair-triggers, and it is load-bearing for six of the eight.

**The pre-commit hook checks comparison honesty, not freshness hashes.**
`check-eval-freshness` reads `evals/results/latest.json` and treats
`comparison.passed === true` as a pass. A missing `passed` key is **skipped**,
and skipped is not a pass. `passed: false` fails the commit. It never runs the
evals.

**Judge cost is read off Mastra's scorer result, never out of `llm_calls`.**
Judge calls score a golden set rather than a tenant's work, so ADR 0003 keeps
them out of that table; only the committed price table is shared. A run costing
more than 1.1× the baseline fails, because a prompt that doubled in length
scores the same and bills twice.

**CI does not run live evals.** GitHub Actions (`.github/workflows/ci.yml`)
runs architecture, scoped typecheck/eslint (`qualitygate:changed`), and
`npm run test:unit`. Pass/fail is the process exit code. Local husky still
runs full `precommit` (including unit + production build). `npm run eval:full`
stays a human cadence: before a release, and after any change to a judge model
or the golden set.

| Change touches… | Gate scorers |
|-----------------|--------------|
| Author prompt / draft-revise | `magic`, `prose-craft`, `stakes-cost`, `story-motion` |
| Tools / context / canon | `consistency`, `hallucination` |
| Critics | `prose-craft`, `stakes-cost` |

`stakes-cost` is **registered but never runs** — no golden example scopes it in
`metadata.scorers`, so it has no coverage and no baseline. Adding one is the
smallest useful contribution to this suite.

Enforced by: `npm run precommit` (eval comparison honesty), `npm run eval:gate`,
`npx vitest run evals/__tests__`.

## Quality gates

| When | Command |
|------|---------|
| After focused edit | `npm run qualitygate:file -- <path>` |
| Every 5 todos | `npm run qualitygate:changed` |
| Many failures | `npm run qualitygate:capture` → `.local/quality-backlog.md` |
| Before “done” | `npm run typecheck` · `npm run lint` · `npm run test:unit` |
| Commit | `npm run precommit` (never `--no-verify`) |
| CI | `.github/workflows/ci.yml` — architecture + `qualitygate:changed` + `test:unit` (exit codes, not log greps) |
| OpenAPI public docs | `npm run openapi:generate` · `npm run openapi:check` (drift + route coverage; also in precommit) |
| Module handoff | `node scripts/fabro-verify.mjs` |

**Metrics (warn / error):** 400 / 800 lines · complexity 15 / 25.  
**IMPORTANT — never disable rules on your own if not allowed.** No file-level `eslint-disable` and no new `eslint.config.js` `'off'` overrides without explicit user approval.

ESLint (`eslint.config.js`) ignores generated/local trees (`.mastra/**`, `.local/**`, `.design-sync/**`). `local/no-magic-string` is off for Vitest and Playwright suites (`**/__tests__/**`, `**/*.test.*`, `**/*.e2e.test.*`, `e2e/**`) and Storybook (`stories/**`, `.storybook/**`) — titles and fixtures are prose, not wire vocabulary.

## Public OpenAPI (`/api-docs`)

Scalar at `/api-docs` serves committed [`public/openapi.json`](../public/openapi.json). **Zod is the contract** — do not hand-edit the JSON.

To add or change a documented route:

1. Put request/response Zod in `core/io/*.dto.ts` or `@/shared/data/*-service` (parse in the route).
2. Register path + method in `src/shared/openapi/register-shared-routes.ts` or `src/domains/<module>/core/io/openapi-routes.ts`.
3. Run `npm run openapi:generate` and commit `public/openapi.json`.
4. `npm run openapi:check` (also in precommit) fails if the committed spec drifts **or** a `src/app/api/**/route.ts` is missing from the spec (unless its path is on `scripts/openapi/route-coverage-omit.ts`). `qualitygate:file` on API routes runs the same coverage check.

Scalar `info.description` is public product copy — keep generate commands out of the spec. Storyteller REST (projects, characters, episodes, beats, bible, plan, jobs, consistency) is in the spec. SSE chat (`/storyteller/chat/stream`, autonomous draft) and a few workspace-only helpers stay out; MCP tool details live in [MCP_API.md](./MCP_API.md).

## Observability

Two systems (not correlated today):

| System | Records | Sink |
|--------|---------|------|
| Mastra AI tracing | Agents, tools, workflows, scorers | Mastra Postgres store → Studio; optional Cloud |
| Sentry / `@vercel/otel` | HTTP, RSC, errors | Sentry |

Config: `src/shared/agent-kernel/mastra/observability-config.ts`. Spans in app code: `withMastraSpan()` from `@/shared/observability/mastra-tracing`. Storage uses `PostgresStoreVNext` so Studio discovery/feedback endpoints work (optional `OBSERVABILITY_DATABASE_URL`, else `DATABASE_URL`). `public.mastra_*` tables (including observability partitions) have RLS enabled and no PostgREST policies; Mastra talks to them over `DATABASE_URL`, not the anon key. New `mastra_*` tables inherit that lock via event trigger `enable_rls_on_mastra_tables`.

```bash
MASTRA_TRACE_CONSOLE=true
MASTRA_TRACE_SAMPLE_RATIO=0.1
MASTRA_PLATFORM_ACCESS_TOKEN=
npm run mastra:dev   # Traces tab
```

`MODEL_CHUNK` spans dropped by default (`MASTRA_TRACE_MODEL_CHUNKS=true` to keep).

Studio **Scores** on a chat trace: the `storyteller` agent writes `goal-reached` every turn and samples `hallucination` / `magic` / `prose-craft` at rate `0.2`. Trace **Evaluate** lists the same judges from `createMastra({ scorers: STORYTELLER_SCORERS })` for spans that were not sampled.

Studio **Experiments**:

| Dataset | Publisher | Task |
|---|---|---|
| `aeternum-episode-01` | `npx tsx evals/scripts/publish-aeternum-studio.ts` | Frozen beats (structural identity, no LLM) |
| `storyteller-golden-quality` | `npx tsx evals/scripts/publish-golden-quality-studio.ts` | Frozen golden `referenceOutput` (hallucination + magic judges) |

`npm run eval` remains the file report (`evals/results/latest.json`).

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
| `FF_CANVAS_GEMINI_UPSCALE` | Gemini pre-upscale before Topaz |
| `FF_TILE_SEAM_COLOR_FADE` | 16px follow-up tile edge color fade (off: packed grey-hole crop only) |
| `NEXT_PUBLIC_FF_3D_CANVAS` | Show 3D Canvas in the workspace sidebar and project hub |
| `NEXT_PUBLIC_FF_LOOP_CREATOR` | Show Loop Creator in the workspace sidebar and project hub |
| `NEXT_PUBLIC_FF_PERF_DEBUG` | React Scan overlay + CWV HUD + CharacterWeb timings |
| `NEXT_PUBLIC_FF_CWV_HUD` | Core Web Vitals overlay only |

**Kill switches are not `FF_` flags.** `STORYTELLER_GUARDRAILS_ENABLED`, `STORYTELLER_HITL_ENABLED`, `STORYTELLER_USE_PROMPT_HUB`, and `VOYAGE_ENABLED` default to **on** and use `!== 'false'`. Renaming them would invert their meaning and silently disable guardrails when unset.

## Model routing

Every model resolves through the OpenRouter gateway on `OPENROUTER_API_KEY`. Defaults live in `src/shared/agent-kernel/models.ts` and the per-domain `config/model-config.ts`; agents default to `openrouter/auto-beta`. Pin a slot by setting its env var to a `provider/model` id — the gateway prefix is added automatically.

### OpenRouter account controls

Operator-only. Do this in the OpenRouter dashboard, not in app code:

| Control | Why |
|---------|-----|
| Zero Data Retention (ZDR) | Prompts and completions must not be retained by the provider. |
| `limit_usd` | Hard spend ceiling so a runaway agent cannot empty the account. |
| `allowed_models` | Only the models this product is priced and eval'd for. |

Do **not** add an app-layer regex prompt-injection filter. Fiction dialogue will trip it. Do **not** enable OpenRouter `person-name` or `address` filters.

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

**Image models (Apiframe)** — pixel paths use `APIFRAME_API_KEY` only. Pin a surface with `IMAGE_*_MODEL` (see `.env.local.example`). First tile defaults to `midjourney`. Moodboard defaults to `midjourney` (`IMAGE_MOODBOARD_MODEL`). Combined episode storyboard video defaults to Kling 3.0 storyboard look (`IMAGE_STORYBOARD_VIDEO_MODEL`); CorkBoard offers Kling/Seedance × film-like/storyboard-like. Duration is hardcoded to 15s. Kling sends `klingParams.multi_prompt` as a JSON string of `[{prompt, duration}, …]` (max 6 shots, each 1–12s, summing to the clip) plus a look-specific `negative_prompt`. Seedance has neither field — look is locked in the prompt (`Avoid: …`). Native `generate_audio` is a sound bed. Every preset then gets one continuous spoken voice-over (Luna script → OpenRouter `/audio/speech` with look + opening-beat `instructions` → ffmpeg mix) on `OPENROUTER_API_KEY`. Mix uses `FFMPEG_PATH`/`FFPROBE_PATH` when set (Trigger cloud ffmpeg extension), otherwise `ffmpeg-static`/`ffprobe-static` — local `trigger dev` does not install apt ffmpeg. Missing binaries skip VO and still save the video. Episode posters and series posters honor `IMAGE_EPISODE_POSTER_MODEL` and `IMAGE_SERIES_POSTER_MODEL`. Generate values: `midjourney` · `nano-banana` · `nano-banana-pro` · `grok-imagine-image` · `gpt-image-1.5` · `flux-2-pro`. Video: `kling-3.0` · `seedance-2.5`. Upscale: `topaz-image-upscale` · `clarity-upscale` · `midjourney`. Repaint: `gpt-image-2`. Resolvers live in `src/shared/ai/image-model-env.ts` and `src/shared/ai/storyboard-video-env.ts`.

Overrides are read at call time, not module load, so dotenv scripts and per-environment rollbacks work regardless of import order. `GET /api/settings/models` prints the resolved role→model table with provenance.

The Writers Room picker offers three catalog models (Kimi / GLM / Opus); selection is chat-only. Orchestration pins use `STORYTELLER_{AUTHOR,PLANNER,CRITIC,MUSE,PREMISE}_MODEL`. Text LLMs, RAG embeddings, and Cohere rerank use `OPENROUTER_API_KEY` only — `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GOOGLE_API_KEY` are optional legacy fallbacks. Image paths use Apiframe (`APIFRAME_API_KEY`).

## Adding a background task

Every background task is defined by `defineOwnedTask` from `@/shared/jobs`. It
requires a payload schema, a queue, and — through the schema — a submission
nonce, so a task that omits any of them does not compile. A raw `task(` or
`schemaTask(` outside `src/shared/jobs/define-task.ts` is an ESLint error.

```ts
export const generateThing = defineOwnedTask({
  id: 'generate-thing',
  schema: generateThingPayloadSchema,   // spreads OWNED_PAYLOAD_SHAPE
  queue: JobQueue.Apiframe,
  run: async payload => { /* payload is already parsed */ },
})
```

**Write the schema first.** Put it in a `constants/*-payload.ts` sibling and
derive the payload type with `z.infer` — never maintain an interface beside the
schema. A type another module owns (a crop spec, a tile's neighbours) is
carried through with `ownedElsewhere<T>()` rather than mirrored, because a
hand-written copy drifts from what it copies.

**Pick a queue by quota pool, not by task.** The limit protects Meshy or
Apiframe, not `generate-tile`; a per-task queue would give each task its own
ceiling and no shared one. `JobQueue.ImageProvider` covers the tasks that
choose their provider from the payload at run time.

**State what makes a run the same run.** The idempotency key is
`<taskId>:<requestId>`, derived by `triggerOwnedRun` — never from prompt
content, because regenerating with the same prompt is expected to return a
different image and a content hash would silently hand back the previous one.
Client callers wrap the request in `withSubmissionNonce(intent, …)`, which
holds one nonce per user intent while that submission is in flight: a
double-click collapses into one run, a deliberate re-roll gets a new one.
Routes read the nonce with `requireSubmissionNonce(body)` and answer 400 when
it is missing rather than minting one — a server-side nonce is unique per
request, so it would make every double-submit a second paid run while looking
like the feature was on.

Client modules import from `@/shared/jobs/submission-nonce` directly. The
`@/shared/jobs` barrel reaches Trigger's SDK and the database client, and a
component that pulls those in fails the browser build.

**Machine presets are unset on purpose.** Eighteen of nineteen tasks run on the
default, and a larger machine bills more per second — so a preset is set only
where there is a reason behind it, which today is `upscale-tile` alone (sharp
holds a decoded upscale in memory). There is no production traffic to size the
rest from. Once there is, read Trigger's dashboard under **Runs → duration and
memory** per task, and set presets from that rather than from a guess.

**Concurrency limits are placeholders.** `JOB_QUEUE_CONCURRENCY_LIMIT` is a
flat 4 because the real Meshy / Apiframe / Fal quotas are unknown and the app
is low-volume; the cost of starting too low is a queue that never fills. Raise
it from **Runs → Queues**, comparing concurrency against queued depth.

Enforced by: `npm run lint` (`local/no-raw-trigger-task`),
`npx vitest run src/shared/jobs scripts/__tests__/trigger-task-inventory.test.ts`.

## Mastra / agents

See root [AGENTS.md](../AGENTS.md). Smoke: `npm run mastra:smoke`.

Studio bundling resolves `@/*` via `tsconfig.json` `compilerOptions.paths` and requires `baseUrl: "."`. If `mastra dev` crashes with `Cannot find package '@/…'`, wipe the stale bundle (`rm -rf .mastra`) and restart — smoke also fails when `.mastra/output/index.mjs` still contains those imports.
