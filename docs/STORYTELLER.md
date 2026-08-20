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
| Modes | **mutations-only plan-first**: `chat` (reads + `propose_character_fields` + `submit_plan`) → `build` (mutating tools) |
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
- Phase navigator / beat board / character web
- Streaming writers’ room chat

## Writers Room ↔ World Bible

**Models:** composer picker (Kimi / GLM / Opus) → chat adapter only. Default when unset: `STORYTELLER_CHAT_MODEL`. Author / planner / critic / muse / premise use their own `STORYTELLER_*_MODEL` pins — see [DEVELOPMENT.md](./DEVELOPMENT.md) § Model routing.

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

`npm run eval` — golden set + craft scorers. Policy in [DEVELOPMENT.md](./DEVELOPMENT.md).
