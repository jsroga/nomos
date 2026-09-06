# Storyteller

> Domain: `src/domains/storyteller/`. Public UI: `@/domains/storyteller` → workspace layout.  
> Mastra conventions: root [AGENTS.md](../AGENTS.md). Module map: [MODULES.md](./MODULES.md).

## Role

Virtual **writers’ room**: series bible, characters, episodes, beats, script drafts, critics, and generative media (moodboard / storyboard / poster) via Trigger.dev.

## Runtime surfaces

| Surface | Path / flag |
|---------|-------------|
| Chat SSE (default) | `/api/storyteller/chat/stream` — agent.stream + tools |
| AgentController chat | `FF_STORYTELLER_CONTROLLER=true` — plan-first modes |
| Autonomous draft | `FF_STORYTELLER_AUTONOMOUS=true` — durable agent + goals |
| Beat-draft workflow | Mastra workflow: plan → draft → critics → revise; editorial **suspend/resume** HITL |
| Fix inconsistencies | Mastra workflow: scan World Bible + all episodes → propose field patches → **apply all / discard all** suspend |
| CLI probe | `npm run storyteller:controller` — interactive plan→approve→build REPL |
| Live tests | `npm run test:live` — `*.e2e.test.ts` against real agents/models/DB |

## AgentController (accepted ADR, 2026-07)

**Flag:** `FF_STORYTELLER_CONTROLLER=true`. Legacy stream path remains default when unset.

| Piece | Choice |
|-------|--------|
| Controller | `storyteller-chat`; **existing** Postgres Mastra store only |
| Session | per user/project tags; thread per conversation |
| Modes | **Chat + Build only** (skip extra Controller modes unless a Plan-mode leak is evidenced): `chat` (reads + `propose_character_fields` + `submit_plan`) → `build` (mutating tools) |
| Beat verdict | stays workflow suspend — compose with controller modes |
| SSE | reuse frozen `ChatFrameType` frames (`Start` / `Token` / `ToolResult` / `Questions` / …) |

Reads are never gated. Mutating tools are invisible in `chat` mode until a plan is approved.

Implementation: `src/domains/storyteller/ai/controller/`. Registration via `core/io/mastra-runtime.ts`.

## Beat-draft pipeline

Durable Mastra workflow (not the chat AgentController):

1. Plan beats / brief  
2. Draft prose  
3. Parallel critics (prose / stakes / continuity)  
4. Revise  
5. Human verdict via workflow suspend schemas  

Wire contract for chat frames: skill `sse-wire-contract` + e2e smoke.

## Fix inconsistencies

Blocking HITL pass over the **whole project** (World Bible, characters, every episode and beat). Not the chat AgentController and not Writers Room SSE.

1. Assemble canon from the database  
2. Structural setup/payoff **ID join** (`setupId` / `payoffFor`)  
3. Chunked continuity critic via Mastra `structuredOutput` (`ContinuityScanReportSchema`)  
4. Author-tier patches via `ConsistencyFixBatchSchema`  
5. Suspend with findings + diffs — **Apply all** or **Discard all**  
6. Cascade-apply through the existing editor + undo manager, or no-op on discard  

Start: `POST /api/storyteller/consistency/fix-run` (SSE until suspend/complete). Resume: `POST /api/storyteller/consistency/fix-run/resume` with `{ runId, action: apply | discard, projectId }`. Existing `/consistency/check|apply|undo` stay. Linguistic regex scanners are not used; world-rule findings come from the critic, not keyword harvest.

## Layout (domain)

```
ai/agents/     # Muse, author, critics, chat adapter, …
ai/workflows/  # beat-draft, fix-inconsistencies, …
ai/controller/ # AgentController
services/      # CRUD, context assembly, RAG helpers
tasks/         # moodboard, storyboard, poster, …
ui/            # World Bible, timeline, writers room chrome
state/         # TanStack + UI stores
core/io/       # API clients, mastra-runtime seam
```

## UI highlights

- World Bible panel (lockable for central users)
- Phase navigator / beat board / character web / Draft tab (`ScriptEditor`)
- Streaming writers’ room chat

## Writers Room ↔ World Bible

**Models:** composer picker (Kimi / GLM / Opus) → chat adapter only. Default when unset: Kimi (`STORYTELLER_CHAT_MODEL` / catalog). Author / planner / critic / muse / premise use their own `STORYTELLER_*_MODEL` pins — see [DEVELOPMENT.md](./DEVELOPMENT.md) § Model routing. `npm run test:e2e smoke` posts GLM only; it never uses Kimi or GPT-5.6 Sol. Scorers stay on `npm run eval`, not on smoke.

Chat goes through `/api/assistant/storyteller` (shared assistant route). Section refreshes and free chat share one thread; bible writes are gated so the wrong panel does not get a Pending Review blur.

| Concern | Contract |
|---------|----------|
| Active section | Client sends `bibleSection` on the chat body; route sets `STORYTELLER_BIBLE_SECTION` on Mastra `RequestContext` (`ai/request-context.ts`) |
| Tool writes | `update_world_bible` may set `worldDescription`, `inspirations`, `moodSoundtrack`, `soundtracks`, `episodeRoadmap`, characters, etc. When a section is set, `bible-section-allowlist.ts` drops off-section fields before execute |
| Episode create | `manage_episode` create persists the row; Writers Room invalidates the episodes query and `selectEpisode`s the new id (toast “Episode created”) |
| Episode premise | Prefer `manage_episode` create/update with `data.premise`. `update_world_bible` `{ episodePremise }` only when an `episodeId` is already in the open workspace |
| Tool proposals | Completed `update_world_bible` → `proposeAssistantBibleUpdate` → Accept/Reject on that section (`BibleSectionChrome`) |
| Free chat | Overview-only prose dumps do **not** auto-open Pending Review; user uses **Add to world** |
| Add to world | If that section already has Pending Review, runs the same `onAccept` as Accept. Otherwise infers target (structured extract, else Overview) and **commits** with `executeAction` (toast “Added to world”) — never a silent no-op |
| Extras | If the tool also wrote fields outside the requested section, ConfirmDialog: commit requested only vs include extras |
| Concurrent refresh | One section refresh at a time while the thread is busy (avoids Mastra `MessageRepository` duplicate-id crashes) |
| Status labels | Waiting copy is “Waiting for Writers Room…” / “Still waiting for the model…” — not “Loading world context…” |

Key paths: `StorytellerWritersRoom.tsx`, `propose-assistant-bible-update.ts`, `parse-created-episode-from-tool.ts`, `resolve-add-to-world-target.ts`, `extract-inspirations.ts`, `extract-soundtrack-tracks.ts`, `src/mastra/agents/storyteller/instructions.md`.

Chat context assembly does **not** run entity-graph RAG on the hot path; project snapshot token budget is larger (`context-assembly-service.ts`, `token-budget.ts`).

## Season spine vs episode vs beats

Roadmap cards are **not** `episodes` rows. Matching is by position: `episodes.sequence` **N** ↔ resolved roadmap list index **N-1**. List precedence: overlay sequences → `episodeRoadmap.episodes` → `episodeRoadmap.sequences` → top-level `sequences` (`core/utils/roadmap-slot.ts`).

| Layer | Job |
|-------|-----|
| Season roadmap | High-level spine (8–12 slots: title, logline, inciting / midpoint / finale). Not a 10-point plan. |
| Episode premise | Expands **that** slot into Ozymandias + 10-point. |
| Beats | Split the episode (which already expands the slot) into 30 text cards. |

Chat context injects `=== SEASON ROADMAP ===`, compact `=== EPISODE INDEX ===`, and — when an episode is open — `=== ROADMAP SLOT ===`. Missing slot: generate from premise only. Extra roadmap slots stay as future spine; do not auto-create episode rows.

Section alignment uses one ContinuityCritic pass driven by `ALIGNMENT_REGISTRY` (`core/constants/alignment-registry.ts`): `check_section_alignment` in chat (read-only; not on every beat create) and the same jobs inside **Fix inconsistencies** `agenticScan`.

## Episode phases (Premise → Beats → Draft)

`PhaseNavigator` is three steps: **Premise**, **Beats**, **Draft** (`Phase.PREMISE` → `BREAKING` → `WRITING`). Draft unlocks when the beat board has at least one card.

| Phase | Surface | Job |
|-------|---------|-----|
| Premise | `StoryPlanBoard` | Ozymandias + 10-point for this episode. |
| Beats | Cork Board | ~30 text cards. Prompts forbid drafting scripts and calling `run_beat_draft_workflow`. |
| Draft | `ScriptEditor` on `StorytellerTab.Script` | Manuscript in `episodes.scriptContent`. |

**Draft today.** Courier `contentEditable`, placeholder “Start writing your screenplay…”, selection Expand / Condense / Rewrite via `POST /api/storyteller/script/edit`. No generate-from-bible, no ghost completion, no “next section,” no Novel mode.

**Draft as specified** (architecture-review Phase 3, `target-architecture.md` §7.5): Medium-quiet well; Cursor-style ghost text (Tab accept, Esc dismiss); **Generate next** / **Regenerate this section** through the existing beat-draft workflow; two modes — **Script** (studio/TV format) and **Novel** (chapter prose) — taught as Author format skills, not a new agent. Context is partitioned world bible + episode premise + the beat board. Host still persists compiler output after Approve.

## Generate-new-part canon pack

Non-chat generate APIs load the same season spine as chat via `loadStoryCanonPack` / `loadOpenEpisodeCanon` (`services/story-canon-pack.ts`). Sources match context assembly: `story_plans.content` (fallback `projects.storyPlan`) + `projects.seriesBible`. Resolution reuses `resolveRoadmapSlot` and `resolveContextEpisodePremise`. Chat, Cork Board beat **text**, and beat-draft keep their own assemblers.

| Surface | Slice | Must not inject |
|---------|--------|-----------------|
| Missing character fields | `formatCanonForTextFill` — bible, compact season list, episode index, cast | 10-point arrays, beat boards, `[Name][id]` chips |
| Moodboard | World description + overview (executive summary, central question). Missing either → generate overview first. LLM 3–5 word subject + hardcoded style lock. Look `--sref` pair in `tasks/constants/storyteller-look-sref.ts`; later tiles may also `--sref` the first moodboard image. | Genre, tone, full roadmap, Ozymandias, 10-point |
| Portraits | Same overview LLM subject + hardcoded portrait lock + description + look `--sref` pair | Genre, tone, full roadmap, Ozymandias, 10-point |
| Episode posters | Same overview LLM subject + hardcoded `movie poster for …` wrap + look `--sref` pair | Genre, tone, full roadmap, 10-point |
| Beat image prompt | `formatCanonEpisodeLock` — visual lock + slot brief + logline/hook/theme | 10-point plans, 30 beat loglines, chat “expand this slot” copy |

Loader does not query the beats table. Beat **text** stays `manage_beat` on Cork Board/chat.

## Evals

`npm run eval` — golden set + craft scorers (`JUDGING_MODEL`, real models). Policy in [DEVELOPMENT.md](./DEVELOPMENT.md). Do not run those judges inside e2e smoke.

## Phase 4 promotion

Wave 1 labels live on `evals/datasets/storyteller-golden.ts` (`promotion` category, scorer id `promotion-floor` so fixture averages do not shift). Measurement is `evals/__tests__/wave1-promotion-floor.test.ts` plus `evals/promotion/wave1-decisions.ts`. No live 50-label study.

| Extra | Decision | Floor |
|---|---|---|
| Extra cognition critic | no-go | Continuity brief already covers knowledge the POV does not possess. `checkCharacterKnowledgeFromRows` hits `promo-cognition-token-01` (`THE_BELLS_ARE_VERA`). |
| Extra dialogue critic | go | Deterministic `runSyncProseCheck` misses talking-heads / disembodied said-book. Prose brief covers info-dump, not adjacency or embodiment. |
| Manuscript embedding search | go | Literal `search_manuscript` hits `the silver bell under the floorboard` and misses the paraphrase plant. |
| Knowledge ledger | go | Partition + POV miss `promo-paraphrase-leak-01` (“harbour chimes belong to her”). |
| Fiction-adjusted Humanizer (#1 #3 #4 #10 #25) | no-go | Extra s8 patterns raise hits on `persona-grrm-01` while always-on already catches `prose-craft-cliche-01`. Always-on Humanizer (#7, #20–#24) stays. |

`FF_STORYTELLER_EXTRA_CRITIC_SCOPES` stays default off. Cognition critic files are not added. Dialogue critic wires only when the flag is exactly `true`. Embedding and ledger follow their go rows; Humanizer extra classes are not added to `SKILL.md`.

`search_manuscript` stays one tool id: literal hits first, then gateway `embed` (`LlmFeature.RagEmbedding`) after a miss when a `ProjectScope` is on the request. No module-global Voyage client. Knowledge-ledger rows are host-written after Approve (`persistBeat`); author-truth partition stays. `setups_payoffs` jsonb is unchanged. Apply `supabase/migrations/20260905120000_knowledge_ledger.sql` as an operator — agents do not run live SQL.

Promote a finding with **Approve and promote** (or `promote_rule` in Build mode). New findings still default `promoteToProjectRule: false`. Chat/plan mode cannot call `promote_rule`.

Autonomy: `FF_STORYTELLER_AUTONOMOUS` stays default off. Queued editorial verdicts are durable suspend snapshots (`GET /api/storyteller/workflow/resume?queued=1&projectId=`). Approve / Revise / Kill still host-persist. No `autoApprove: true`. No `commit_beat`. Goal judge remains episode-finished only.

Mastra `mastra_messages` prune is a scheduled Trigger fan-out (existing store; not re-exported from `src/trigger/index.ts`). Host Approve also writes `beats.after_beat_state` (positions, injuries, objects held, open plants, next-decision owner) with the beat. Kill emits zero persist. Apply `supabase/migrations/20260905130000_after_beat_state.sql` as an operator.

## Phase 4 skips

These stay out of this phase. Chat + Build remain the Controller floor.

| Skip | Why it stays out |
|---|---|
| drizzle-kit empty-diff / RLS user-B tests | Actions 33–34 / ADR 0001. Drizzle persist is BYPASSRLS; agents do not apply live SQL. |
| `/api/assistant` host merge and SSE↔AI-SDK wire merge | Phase K / Phase 2 out of scope. |
| Voice settings UI and catalog L3 script runners | Phase 3 out of scope. |
| Four extra Controller modes / `commit_beat` | No Plan-mode leak evidenced. Mutations stay in Build. |
| Object-identity ledger table | Knowledge ledger + partition cover duplication until a labelled golden-set miss. |
| Anchoring / realism critic scopes | Floor three critics unless first-appearance or institutional beats still fail. |
| `RedisServerCache` on the durable author | In-process cache until multi-process autonomy is operator-on. |
| Delete `anti-slop` | Wave 1 fiction-adjusted Humanizer is no-go; s8/s9 did not win on style-fidelity. Always-on Humanizer stays. Author compose still loads `anti-slop/SKILL.md`. |
