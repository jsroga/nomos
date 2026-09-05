# Nomos — Phased plan

**End state** is still: one chat agent, planner, author (incl. Humanizer after verdict), one critic × 3 scopes (more scopes only by ablation), Muse as `brainstorm`, three workflows (`beat-draft`, `artifact-draft`, `fix-inconsistencies`), catalog skills at L1 / bodies on match. Writer journey: Premise → Beats → Draft (Script / Novel manuscript on the existing tab).

**This file** is how to get there without a 32-action serial chain. Two tracks run in each phase:

| Track | What it is | Why it is in the same plan |
|---|---|---|
| **Platform** | Auth, CI, cost, gates, jobs, contracts — the whole app | The opus audit’s P0s are mostly here. They are the strongest part of `actions.md`. Storyteller quality numbers are lies until this track is honest. |
| **Storyteller** | Beat loop, skills, Humanizer, other artifacts | The writing system. Starts small; same agents you have today until Phase 2. |

Do not start a later phase until the previous **Exit** is green. Loop Creator and 3D Canvas stay out of scope through Phase 4 except where a shared file (gateway, auth, CI, eval harness) is touched. **Phase 5** is the workspace chat overlay: those modules become first-class *chat session owners*, not writing-compiler work. **Phase 6** is tests only (unit coverage +15% relative, Playwright on four product surfaces). No product features in Phase 6.

Action numbers in parentheses are ids from `actions.md`. They are **mapped**, not executed in opus order. Actions **33–38** are Phase 5 only. Actions **49–51** are Phase 6 only. Appendix B stays **39–48**.

---

## Constraints that are not a late ticket

These bind every phase. They are not Phase 4 leftovers.

**Latency (Action 28).** Reconcile `GENERATION_STUCK_TIMEOUT_MS` (180s), route `maxDuration`, and the workflow author timeout to **one** source in Phase 0. InkOS default is **one** auto-revise — copy that budget. Do not add critic scopes or a Humanizer pass that makes the first window miss 180s. The editorial suspend is what splits one long job into two request windows; do not remove it to “simplify.”

**Injection (Action 27, corrected).** OpenRouter **ZDR**, **`limit_usd`**, and **`allowed_models`** are real account P0s. **Regex prompt-injection is not P0.** Fiction dialogue (“ignore that order”, “system”) will trip it. App-layer: delimit and cap `masterPrompt`; hard rules packed after it; layer scoping in code. Do not enable `person-name` / `address` filters.

**Critic wall.** Floor is the **three** critics that already run. Five scopes are a Phase 4 ablation, not a Phase 2 default.

**Commit.** The model never gets `commit_beat`. Human verdict (or a later queued autonomous mode) is the only persist trigger. Action 10’s three modes are **not** built as `read / draft / commit` with a mutating commit tool.

---

## Phase 0 — Trust and honesty

Nothing new to demo. The current loop stops lying.

### Platform

| Work | Actions / findings |
|---|---|
| `getUser()` identity; lint-ban `getSession()` on server | 1 |
| `/api/complete-token` authenticated; `/api/trigger/token` through `retrieveOwnedRun` | 1 |
| PATCH allowlists on beats/characters (no body spread / reparent) | 1 |
| CI exists (architecture + scoped tsc/eslint + unit). Pin `tsx`. Unique temp config per tsc run | 4 |
| OpenRouter: ZDR + spend ceiling + allowlist. **No** regex injection filter | 27 (account half) |
| Rename eval commands: `eval:scorer-fixture` (today), `eval:agent-contract` (new, stubbed). Pre-commit checks comparison **passed**, not “a file exists” | 7 (naming + honesty) |
| `usage` → `totalUsage`; gateway context on `/api/assistant`; kill embedding module-global | 6 (first cut) |

### Storyteller

| Work | Actions / findings |
|---|---|
| Call `resumeChatWorkflow`; drop `timeout: 120` / `defaultOption: 'approve'`; carry summary+draft on the verdict frame | 9 (policy), 30 (wire, not new UI) |
| Kill `autoApprove: true` on `POST /chat`. Same mutation policy on every remaining entry | 9 |
| Persist: fail the run on save miss; pass `sequence`; uniqueness `(episodeId, sequence)` | 2 |
| Typed run trace on **existing** `beat-draft-workflow` | 3 |
| Trace-contract tests: one dispatch, three critics overlap, kill = no `persist.commit` | 18 |
| One timeout source (client / route / workflow) | 28 (reconcile now) |

**Exit.** Forged/unsigned token → 401 against the real client. User A cannot complete B’s wait token or move B’s beat. Approve stores a beat with sequence 1,2,3 and a trace. An answered verdict resumes. `eval:scorer-fixture` may not be called a quality gate.

---

## Phase 1 — Visible loop, cheap compiler, platform gates that fire

Same six agents, same two workflows. Host work, not new personalities.

### Platform

| Work | Actions / findings |
|---|---|
| Compose ESLint `no-restricted-imports` (last-write-wins). Test **effective** config on a real `src/domains/storyteller/**` path | 5 |
| Ratchet vs a pinned base ref; AST/syntax inventory not text-line counts; the seven honor-system counters get a consumer or are deleted | 5 |
| `dangerouslyIgnoreUnhandledErrors: false` (or equivalent that fails the suite) | 8 (tests) |
| Checkpoint paid Trigger steps before retry: generate-tile, Meshy create. Pattern from `remesh-3d-model` (`maxAttempts: 1` is a stopgap) | 8 (jobs) |
| Remaining cost holes: Voyage/hybrid-search, OpenRouter rerank, unmetered tasks — through the gateway or named exemption | 6 (complete) |
| Contracts: do not boil 86 raw routes. Propagate the 3D exporter pattern onto the **next** storyteller PATCH you touch. OpenAPI from the schema the route runs, or stop claiming `openapi:check` proves it | 4.7, 13 (pilot, not flood) |

### Storyteller

| Work | Actions / findings |
|---|---|
| Deterministic lint **in** beat-draft: causal graph, hygiene, POV-noun filter; live `setups` **dual-write** (jsonb stays — it packs Law of Motion) | 19, 12 (partition only) |
| Author-truth never in Author context (prompt partition, not a ledger table yet) | 12 |
| Bind `memory: { thread, resource }` on **every** live door (SSE, controller flag, `/api/assistant`, autonomous) + helper `(projectId, episodeId, userId)`; bound MCP `lastMessages` | 31 (bind + bound; expiry can wait) |
| Muse `wildcards` on the tool schema + forward. Delete dead **class** wrappers. Keep file-based `stateless*` agents. Do not build the `@mention` specialist roster | 5.1, 11 (`brainstorm` only) |
| Finding on **existing** critics (location + quote required). `promoteToProjectRule` defaults false — no `promote_rule` tool | 13 |
| Episode PATCH: allowlist lives in domain; route runs that Zod; OpenAPI generated from it. `toLegacyAsset` thumbnail via 3d contracts (no 2d↔3d import) | 4.7, 13 (pilot) |

**Constraints this phase (not leftovers).** Lint errors → **one** Author retry → still dirty skips critics and suspends (do not spend the post-verdict revise; do not unbounded `.dountil()`). Domain must not import `evals/` (core owns the checker; evals may call core). Do not `DROP` `beats.setupsPayoffs`. Do not add chat tools `read_canon` / `run_prose_check`. No Playwright. No `eslint-disable`. Workspace overlay chat is **Phase 5**, not this phase and not an insert before Humanizer. Unifying SSE vs AI-SDK wires is not a Phase 1 or Phase 2 ticket.

**Exit.** A mechanically broken beat returns to Author with $0 critic spend. Author cannot see the twist. Cross-domain import probe fails closed. A retried paid task does not create a second Meshy/tile generation. Trace tests red if a critic is deleted. System graphs: [learning-materials.md](./learning-materials.md) Part 6. Short picture: Part 2A.

---

## Phase 2 — Skills, Humanizer, measured quality (beats only)

Still no `artifact-draft`. Still **three** critic scopes. Latency budget still 3 critics + one revise + one Humanizer, or cut something.

### Platform

| Work | Actions / findings |
|---|---|
| Eval freshness hash covers `instructions.md`, skill files, thresholds; detects deletions/renames; hashes staged tree | 7, 16 (from R16) |
| Unpriced model cannot report `costUsd: 0` as a pass; cost comparison skipped ≠ cost zero | 6, 23 (honest cost) |
| Constants loophole: AST rule forbidding functions in `constants/` (incentive, not a mass move) | 4.10 / backlog B1 |

### Storyteller

| Work | Actions / findings |
|---|---|
| Catalog **L1** (names). L2 bodies on plan/scope match — not six bodies every beat | 15 (disclosure, not “full catalog in every call”) |
| Live ablation: current GRRM pack on vs off (`wildcards-ab.ts` harness) | 22, 17 (measure first) |
| `psychology` → Planner **only after** that ablation | 17 |
| Humanizer **always-on class** (20–24, #7) after verdict, sample = `masterPrompt` + accepted beats. Claim-check **in code**. Keep `anti-slop` until Humanizer wins on `s8`/`s9` without style-fidelity drop | 17 |
| Delimit + cap `masterPrompt`; structure/facts outrank tone in the packed prompt | 27 (app half) |
| `style-fidelity` on the revise **diff** (scope, not a new agent) | 14 (partial) |
| Golden set of author-labelled beats; noise floor bound to judge model id | 20, 21 (start) |
| One auto-revise max in the loop (InkOS). If Humanizer + 3 critics miss 180s, drop a critic or stream the author, do not drop the human gate | 28 |

**Exit.** Persisted text is the de-slopped revision. Claim-check zero fact delta. Pack-on vs pack-off has a number. `masterPrompt` cannot dump author-truth into Author context (trace assertion).

---

## Phase 3 — Same shape, other artifacts — and the Draft page

The navigator is already Premise → Beats → Draft. Phase 3 is when Draft becomes a manuscript, not a blank Courier field. `artifact-draft` stays the cheap bible/character line. Do not skip the Draft surface to ship more critics.

| Work | Actions / findings |
|---|---|
| **Draft manuscript** on existing `Phase.WRITING` / `ScriptEditor`: Medium well, Cursor ghost-text (Tab/Esc), **Regenerate this section** / **Generate next**, modes **Script** (studio/TV format) and **Novel** (prose). Context = partitioned bible + episode premise + beat board. Empty beats cannot Draft. Format taught as an Author skill (Fountain/studio vs novel chapter craft), not a new agent. Selection Expand/Condense/Rewrite stays. `POST /api/storyteller/script/edit` goes through the gateway with project scope | 16 (surface), 6 (cost hole), 30 (pixels on this tab) |
| `artifact-draft` (or a `type` on one workflow): character, bible section, premise — schema + 1–2 scopes + existing `SectionPendingOverlay`. **No Humanizer** | 26 |
| Prompt registry: generate buttons stop holding prose; hash joins eval artifact | 29 |
| `fix-inconsistencies` stays the sweep; do not rebuild as five beat critics | 16 (keep, don’t add showcase twin) |
| Final episode compile: heavy beat path + **one** Humanizer pass on compiled prose (the Draft tab is the tree being compiled) | 16, 17 |
| Memory TTL / prune on migrated `mastra_*` tables | 31 (expiry) |
| Judge calibration, pairwise, GRRM rubric on **plans**, verbosity control vs de-slop | 21, 23 |
| Voice fingerprints + extractor tests + min-token floor (stylometry is free only if the extractor is honest). Script-mode extractor already assumes cue structure | 32 |

**Exit.** A faction that contradicts world logic is a `Finding` and does not commit. Beat traces still show **three** critic spans, not five. Generate controls contain no prompt paragraphs. From an episode with bible + premise + beats, Draft can produce the next formatted section without the writer pasting context. Ghost-text accepts with Tab and does not run the heavy critic wall. Script pages parse as studio format; Novel pages do not contain sluglines unless the writer typed them. Playwright on this tab: generate-next, regenerate-section, mode switch.

---

## Phase 4 — Earned extras (ablation only)

Do not schedule these as a sprint. Each item names its promotion test.

| Item | Promote when | Actions |
|---|---|---|
| Critic scopes `cognition`, `dialogue` | Golden-set class survives the three | 14 |
| Humanizer fiction-adjusted class | `s8`/`s9` beat noise vs always-on-only | 17 |
| `autonomousAuthor` on | Verdicts queue; no `autoApprove` to keep moving | 16 |
| Four-layer **tables** / knowledge ledger | Partition + POV filter miss paraphrases | 12 |
| `promote_rule` | Humans already promote by hand and it sticks | 24 |
| Kimi/GLM (or whoever) as pinned roles | Live-quality run, not a leaderboard screenshot | 25 |
| Embedding `search_manuscript` | Literal search misses a golden plant/payoff class | 11 |
| Four Controller modes | A leak shows three (we are not building three commit modes anyway) | 10 |
| Coverage thresholds | After unhandled-rejection fails the suite | 8 |
| Full Zod on all 116 routes | After the storyteller PATCH set is contracted | 4.7 |

---

## Phase 5 — Workspace overlay chat

A product phase, not an ablation backlog. The writing compiler (Phases 0–4) does not need this to be honest. The workspace does: today the Writers Room chat **dies when you leave the storyteller route**, because it is mounted under `StorytellerLayout`, not under the project shell.

**Not a lettered insert before Phase 2.** Overlay chat is **Phase 5**. It does not delay Humanizer or Draft. Unifying the two chat wires (frozen SSE vs AI-SDK) is still not a ticket here — a session keeps the wire it started on.

**This section is an implementation handover.** A later agent should be able to land Actions 33–38 from this file plus `actions.md` without inventing architecture. If a sentence here conflicts with a slogan in another spec file, **this file wins** on overlay chat. Tickets: `actions.md` 33–38 (copy contracts, tests, file lists). Product rules: `target-architecture.md` §7.6.

---

### 5.0 Product (what the user sees)

One **General Chat Window** in the project chrome. Show/hide from an icon that stays on every workspace module. Navigating `/{projectId}/storyteller` → `/{projectId}/2d-canvas` **does not unmount** that window, so an in-flight `useChat` fetch keeps running. After a full refresh, the **session list** comes back from the host; messages hydrate from Mastra memory. An in-flight HTTP stream **cannot** be replayed after a reload — mark that session idle / disconnected and **do not** POST the last user message again (that would double-bill).

A session belongs to **exactly one** `AppModuleId` (extend the existing enum — do not invent a second module vocabulary). If you started a storyteller session and you are now on 2d-canvas, you may **watch** that stream. Sending a prompt from 2d-canvas is refused with a dialog: start a **new** session for this module. Several sessions may stream at once. The session list is in that same window: running indicator, rename, delete. Title is generated by a cheap `complete()` on `TEXT_GEN_FAST_MODEL` after the first user message (`LlmFeature` new member, not `StorytellerChat`).

---

### 5.1 What exists today (read these files before writing code)

#### Shell (stays mounted across module pages)

| File | Role now |
|---|---|
| `src/app/(workspace)/[projectId]/layout.tsx` | Server layout: `GlobalSidebar` + `GlobalHeader` + `ProjectLoader>{children}`. **No chat.** This is the keep-alive parent. |
| `src/components/shell/GlobalHeader/GlobalHeader.tsx` | Settings, async status. **No chat toggle.** |
| `src/components/shell/GlobalSidebar/GlobalSidebar.tsx` | Links: `/{id}/storyteller`, `/2d-canvas`, `/asset-exporter`, `/3d-canvas` (flag), `/loop-creator` (flag). Parse **this** URL shape — not `/app/...`. |
| `src/app/(workspace)/[projectId]/storyteller/page.tsx` | Thin: `<StorytellerLayout />`. Unmounts when you leave storyteller. |
| `src/app/(workspace)/[projectId]/storyteller/layout.tsx` | Pass-through `{children}`. Also unmounts when you leave. |

#### Storyteller chat (dies on navigate)

| File | Role now |
|---|---|
| `src/domains/storyteller/ui/StorytellerLayout/StorytellerWorkspace.tsx` | Three columns: left sidebar, center, **`StorytellerWritersRoom`**. |
| `src/domains/storyteller/ui/StorytellerLayout/panels/StorytellerWritersRoom.tsx` | `DomainSidebar` `position="right"` `storageKey="writers-room"` `defaultWidth={384}`. Owns add-to-world, pending prompts, generation activity, model picker. Renders `WritersRoomAssistantChat`. |
| `src/domains/storyteller/ui/StorytellerLayout/panels/WritersRoomAssistantChat.tsx` | Wraps `AssistantChat` with `agentId="storyteller"`, `persistKey={\`writers-room-${projectId}\`}`, `extraToolUIs={<BeatDraftVerdictToolUI />}`, mentions, suggestions, `writersRoomChatBody`. **`key={projectId}`.** |
| `src/domains/storyteller/ui/QuestionCard/BeatDraftVerdictToolUI.tsx` | assistant-ui tool UI; `resumeChatWorkflow` → `DEFAULT_RESUME_URL` (`/api/storyteller/workflow/resume`). Stays a **storyteller adapter extra**, not a second dock. |
| `src/shared/tours/constants/tour-step-ids.ts` | `TOUR_STEP_IDS.STORYTELLER_CHAT` — keep this id on the overlay thread host. |

#### Loop Creator chat (second private copy — also dies on navigate)

| File | Role now |
|---|---|
| `src/domains/loop-creator/ui/components/LoopChatSidebar.tsx` | Another `AssistantChat` with `moduleKey="loop-creator"`, `persistKey={\`loop-creator-${projectId}\`}`, `chatApiPath` from registry (`/api/loop-creator/assistant`). Same bug. Overlay **replaces** this mount when the flag is on. |

#### Shared chat runtime (keep; lift; do not rewrite)

| File | Role now |
|---|---|
| `src/shared/chat/assistant/AssistantChat.tsx` | `useChat` + `DefaultChatTransport` + `useAISDKRuntime`. API = `/api/assistant/<agentId>` or module `chatApiPath`. **No `id` on `useChat`.** Unmount aborts the fetch (default). Warm `GET` on the api. |
| `src/shared/chat/assistant/thread-history-adapter.ts` | **sessionStorage** `aui-thread-${persistKey}`. Comment already says swap the store later. Tab-only; not a session aggregate; one key per project. |
| `src/shared/chat/index.ts` | Barrel: types, protocol, `resumeChatWorkflow`. Overlay exports must go **here**, not a new public path. |
| `src/shared/chat/core/constants/assistant-thread-ui.ts` | `AssistantChatBodyKey`: `modelName`, `projectId`, `episodeId`, `bibleSection`, `messages`. **Add `sessionId`.** |
| `src/shared/canvas/constants/canvas-modules.ts` | `chatAgentId` / `chatApiPath` / `chatSuggestions`. `world-building` (2d-canvas) has **no agent**. Do not invent one. |
| `src/shared/canvas/module-registry.ts` | `getCanvasModuleAgentId`, `getCanvasModuleChatApiPath`, `getCanvasModuleSuggestions`. |

#### Server doors (do not merge)

| Door | Wire | Used by overlay? |
|---|---|---|
| `POST /api/assistant/[agentId]` (`src/app/api/assistant/[agentId]/route.ts`) | AI-SDK `handleChatStream`, `createUIMessageStreamResponse`, `maxDuration = 180` | **Yes** — Writers Room already. Bind memory with **session thread** when `sessionId` is present. |
| `POST /api/loop-creator/assistant` | AI-SDK (crew path) | **Yes** for loop-creator sessions via `moduleKey`. |
| `POST /api/storyteller/chat/stream` | Frozen `ChatFrameType` SSE | **No.** Leave it. Autonomous / legacy. Overlay must not call it. |
| `POST /api/storyteller/workflow/resume` | Verdict resume | **Yes, indirectly** via `BeatDraftVerdictToolUI` inside a storyteller session. |

`memoryRef` today (`src/shared/agent-kernel/mastra/memory-ref.ts`):

```
thread = storyteller:${projectId}:${episodeId ?? '_'}:${userId}
resource = userId
```

That is **one notebook per episode per user**. Multiple overlay sessions would smash into the same Mastra thread if you reuse it. **Do not change** `memoryRef()` for the existing live doors (assistant without sessionId, stream, controller, autonomous, CRUD). Those are asserted in `src/shared/agent-kernel/mastra/__tests__/memory-ref.test.ts`. Add a **new** helper for overlay sessions.

`requireAuth` + `tryProjectScope` already on the assistant route. Overlay session CRUD must use the same: `ProjectScope` on every write. Cross-user read = 404 (not 403).

---

### 5.2 Why the stream dies (do not “fix” the page)

Next.js App Router unmounts `{children}` of `[projectId]/layout.tsx` when the module segment changes. `AssistantChat` lives under `storyteller/page.tsx` → `StorytellerLayout` → `StorytellerWritersRoom`. Unmount runs the `useChat` cleanup; `DefaultChatTransport` aborts the fetch; tokens stop.

**Wrong fix:** copy `AssistantChat` onto `2d-canvas/page.tsx` (two trees, two bills, still dies leaving canvas).

**Right fix:** mount **one** client overlay as a **sibling** of `ProjectLoader`, still inside `[projectId]/layout.tsx`, so the React instance survives `children` swapping.

```tsx
// layout.tsx — overlay is NOT inside {children}
<div className="flex-1 overflow-hidden relative">
  <ProjectLoader>{children}</ProjectLoader>
  <WorkspaceChatOverlay />
</div>
```

Hide with CSS / `hidden` / `aria-hidden` + offscreen. **Forbidden:** `{overlayOpen && <WorkspaceChatOverlay />}` — that unmounts and aborts.

---

### 5.3 Module ids and agents (capability table)

Reuse / extend `AppModuleId` in `src/shared/data/constants/protocol-domain.ts`. Today: `storyteller`, `loop-creator`, `3d-canvas`, `2d-canvas`. **Add** `asset-exporter = 'asset-exporter'` (sidebar already links it). Values **must** equal the URL segment in `GlobalSidebar`.

Parse current module from `usePathname()`:

```
parts = pathname.split('/').filter(Boolean)
// ['{projectId}', '{module}', ...]   — there is no 'app' prefix in this repo's workspace URLs
```

Do **not** copy `ProjectSelectorDropdown`'s `/app/` branch; that comment is stale.

| `AppModuleId` | URL | Chat agent today | Overlay send |
|---|---|---|---|
| `storyteller` | `/storyteller` | `storyteller` via `/api/assistant/storyteller` | Yes. Body includes `projectId`, `episodeId`, `bibleSection`, `sessionId`, `modelName`. |
| `loop-creator` | `/loop-creator` | registry `moduleKey="loop-creator"` → `/api/loop-creator/assistant` | Yes when `isLoopCreatorEnabled()`. |
| `2d-canvas` | `/2d-canvas` | **none** (`world-building` has no `chatAgentId`) | **Watch only.** Send → dialog: this module has no chat agent. Do **not** invent a tile agent. |
| `3d-canvas` | `/3d-canvas` | none | Same: no send until a real `chatAgentId` exists. |
| `asset-exporter` | `/asset-exporter` | none | Same. |

`game-design` is a **canvas module key**, not a workspace sidebar route. Do not mint `moduleId: game-design` sessions from the overlay until there is a `/{projectId}/...` page. Do not confuse `storyteller-corkboard` / `character-web` canvas keys with `AppModuleId.Storyteller`.

---

### 5.4 Session aggregate (Action 33) — schema and API

**Table** `chat_sessions` (new Drizzle file `src/db/schema-parts/chat-sessions.ts`, export from `src/db/schema.ts`; SQL migration under `supabase/migrations/`).

Columns (names snake in SQL, camel in Drizzle):

| Column | Type | Rules |
|---|---|---|
| `id` | uuid pk default random | Session id. Also the Mastra thread suffix. |
| `project_id` | uuid not null fk `projects.id` on delete cascade | |
| `user_id` | text not null | Owner. List/delete filtered to this + projectScope. |
| `module_id` | text not null | `AppModuleId` value. **Immutable.** No PATCH. |
| `thread` | text not null | Set once at insert: `overlay:{id}`. |
| `resource` | text not null | `userId`. |
| `title` | text not null | Placeholder `New chat` until Action 38 or user rename. |
| `title_locked` | boolean not null default false | True after user rename — Action 38 must not overwrite. |
| `status` | text not null | Enum `ChatSessionStatus`: `idle` \| `streaming` \| `suspended`. Host-only. |
| `run_id` | text null | Optional Mastra/workflow run if you have one to observe. Assistant-ui turns usually **won't**. |
| `wire` | text not null | Enum `ChatSessionWire`: `aiSdk` (default). Do not write `sse` unless a session truly started on the frozen stream (Phase 5 overlay never does). |
| `created_at` / `updated_at` | timestamptz | |

Indexes: `(project_id, user_id, updated_at desc)`. RLS enabled; **API uses service role after `projectScope`**, same as other host tables. Do not query this table from the browser with the anon key.

**Do not** store messages in this table. Messages stay in Mastra `mastra_*` memory keyed by `thread`/`resource`.

**New memory helper** `overlayMemoryRef(session: { id: string; userId: string })` in `memory-ref.ts`:

```
thread: `overlay:${session.id}`
resource: session.userId
```

Assistant route: if body has `sessionId`, load the row, 404 if not owner, then `memory: overlayMemoryRef(row)`. If no `sessionId`, keep today's `memoryRef({ projectId, episodeId, userId })` so existing tests and leftover callers still work.

**API** (shared, not `domains/storyteller`):

| Method | Path | Does |
|---|---|---|
| `GET` | `/api/chat/sessions?projectId=` | List this user+project, newest first. |
| `POST` | `/api/chat/sessions` | Body `{ projectId, moduleId }`. Server fills thread/resource/title/status=idle. |
| `PATCH` | `/api/chat/sessions/{id}` | `{ title?, status?, runId? }`. **Reject `moduleId`.** If `title` present, set `title_locked=true`. |
| `DELETE` | `/api/chat/sessions/{id}` | Abort that session's client runtime (204 to client); delete row; do not delete other sessions. Optional: best-effort Mastra `deleteThread`. |
| `GET` | `/api/chat/sessions/{id}/messages` | Hydrate UI messages from Mastra memory for that thread. Used after refresh. |

Zod + register in `src/shared/openapi/register-shared-routes.ts` (or `src/shared/chat/core/io/openapi-routes.ts` imported from there). Then `npm run openapi:generate`. Do **not** add `/api/chat` to `scripts/openapi/route-coverage-omit.ts` unless the route is SSE — these are JSON CRUD.

Client IO: `src/shared/chat/core/io/chat-sessions.api.ts` using `buildUrl` / `joinUrlPath` from `@/shared/data/url-builder`. TanStack Query keys in `src/shared/chat/core/io/chat-sessions.keys.ts`. **Server list = Query, not Zustand.**

Zustand (`src/shared/chat/state/workspace-chat-ui-store.ts`) only: `overlayOpen`, `focusedSessionId`, `mismatchDialog`. Persist `overlayOpen` in localStorage if you want; never persist streams there.

Placeholder title constant: enum `ChatSessionCopy.PlaceholderTitle = 'New chat'`.

---

### 5.5 Overlay host (Action 34) — React tree

**New client files (all under `src/shared/chat/`, PascalCase UI under `ui/`):**

```
src/shared/chat/
  ui/WorkspaceChatOverlay/WorkspaceChatOverlay.tsx   # shell: list + thread + composer host
  ui/WorkspaceChatOverlay/WorkspaceChatToggle.tsx     # icon button
  ui/WorkspaceChatOverlay/WorkspaceChatSessionList.tsx
  ui/WorkspaceChatOverlay/WorkspaceChatMismatchDialog.tsx
  ui/WorkspaceChatOverlay/WorkspaceChatSessionRuntime.tsx  # one AssistantChat per live/focused session
  state/workspace-chat-ui-store.ts
  core/constants/chat-session.ts                      # ChatSessionStatus, ChatSessionWire, copy
  core/io/chat-sessions.api.ts
  core/io/chat-sessions.keys.ts
  overlay/module-chat-adapters.ts                     # types + registry object, no domain imports
```

**App composition root** (allowed to import domain barrels):

`src/app/(workspace)/[projectId]/WorkspaceChatLayer.tsx` (client). Imports `WorkspaceChatOverlay`. Registers adapters:

- Storyteller adapter from `@/domains/storyteller` barrel (export a `getStorytellerChatAdapter()` — mentions, `BeatDraftVerdictToolUI`, add-to-world callbacks, `writersRoomChatBody`, pending prompt from `useStorytellerUiStore`, model picker, `chatRenderers`, tour id).
- Loop-creator adapter from `@/domains/loop-creator` barrel if the flag is on.
- Default adapter: `AssistantChat` with `agentId` / `moduleKey` from the session's `moduleId` via a **workspace→canvas key** map. `storyteller` → `agentId="storyteller"`. `loop-creator` → `moduleKey="loop-creator"`. Modules with no agent: composer disabled.

`shared/chat` **must not** import `@/domains/*`. Adapters are passed in as props / context from `WorkspaceChatLayer`.

**Header toggle:** `GlobalHeader` — `MessageSquare` (lucide) next to Settings. Calls `useWorkspaceChatUiStore.getState().toggleOverlay()`. Do not put the overlay component inside the header (header is fine to remount; the overlay must live in the layout sibling).

**Storyteller column when overlay is on:** `StorytellerWritersRoom` must **not** mount a second `AssistantChat`. Replace the right `DomainSidebar` chat with an empty well **or** remove the column and let the overlay be the only Writers Room. Keep add-to-world / bible pending / generation activity working by moving those callbacks onto the storyteller **adapter** (they already live in `StorytellerWritersRoom` — lift the handlers to a provider that the adapter reads, or keep `StorytellerWritersRoom` mounted **without** `WritersRoomAssistantChat` as a headless host for those hooks). Headless host is the smaller diff: same file, drop the `AssistantChat` child, keep the store subscriptions.

**Loop creator:** same — `LoopChatSidebar` must not mount `AssistantChat` when overlay is on.

**Feature flag (rollout):** `FF_WORKSPACE_CHAT_OVERLAY` / `NEXT_PUBLIC_FF_WORKSPACE_CHAT_OVERLAY`. Off = today's mounts. On = overlay + no private copies. Add the key to **both** `.env.local.example` and `.env.local` (same names, no secrets). `FeatureFlag` enum in `src/shared/data/constants/feature-flags.ts` plus a client `isWorkspaceChatOverlayEnabled()` that reads the `NEXT_PUBLIC_` literal (see `isLoopCreatorEnabled`). Exit of Phase 5 is flag **on** in the intended environment, not a forever-off hide.

**z-index:** header is `z-[100]`. Overlay panel sits in the content column (`relative` already on the loader wrapper), right edge, similar width to writers-room (384). Do not cover the left `GlobalSidebar` (`z-50`). Do not portal to `document.body` unless you keep it inside the project layout (a body portal still survives navigation if the provider is in the layout — prefer layout sibling first).

**Reuse:** `DomainSidebar` is used for the in-page column. Overlay may use it **or** a fixed panel; do not install a new CSS framework. shadcn: `Button`, `Dialog` (`ConfirmDialog` for delete / mismatch), `Input` for rename. Run `/component-audit` mentally: these already exist.

---

### 5.6 Stream survival (Action 35)

**SPA navigation (must pass):** keep every `WorkspaceChatSessionRuntime` whose `status === streaming` **mounted** (CSS-hide if unfocused). Also keep the focused session mounted even if idle (so the user sees history). Idle unfocused sessions **may** unmount and remount from `GET .../messages`.

**Forbidden:** one `AssistantChat` whose `key={focusedSessionId}` — switching key destroys the previous `useChat` and aborts.

**Pattern:**

```
for (session of sessions) {
  if (session.id === focusedId || session.status === streaming) {
    <WorkspaceChatSessionRuntime
      key={session.id}           // stable per session, never the route
      session={session}
      visible={session.id === focusedId}
    />
  }
}
```

Pass `useChat({ id: session.id, transport })` so AI-SDK does not reuse one Chat across sessions.

**Hide overlay:** `visible=false` on the panel; runtimes stay.

**Full page refresh:** `GET /api/chat/sessions` → render list. For each row with `status=streaming`, **PATCH to `idle`** unless you actually have a durable `runId` you can `observe` (assistant-ui `handleChatStream` does not publish a reconnectable run). Hydrate messages via `GET .../messages`. Never auto-send.

**History adapter:** overlay must **not** use `writers-room-${projectId}` sessionStorage as source of truth. `load()` = host messages endpoint. `append()` can no-op (server memory is written by `handleChatStream`). Optional: keep sessionStorage as a cache keyed by `overlay-${sessionId}` only.

**Do not** call `chat.stop()` in a `useEffect` cleanup that runs on pathname change. Pathname must not be a dependency that remounts runtimes.

**Abort:** only (1) user Stop, (2) delete that session, (3) leaving the **project** layout (`projectId` change). Changing `projectId` **does** remount `[projectId]/layout.tsx` — that is correct; sessions are per project.

---

### 5.7 Module lock (Action 36)

Pure function (unit-test this; no React):

```
canSendToSession(session.moduleId, currentModuleId, moduleHasAgent) →
  | { ok: true }
  | { ok: false, reason: ModuleMismatch }
  | { ok: false, reason: ModuleHasNoAgent }
```

Composer `onSend`: if not ok, **do not** call `sendMessage`. Open `ConfirmDialog`:

- Mismatch: title “Start a new chat for {current module}?” Confirm → `POST` session with `moduleId: current`, focus it, then send the buffered text into the **new** session. Cancel → discard or keep text in the box. Old session **untouched** (still streaming).
- No agent: “This page has no chat agent.” Only OK. Do not create a session.

Watching: transcript + Stop (if streaming) still work on a mismatched session. Only **send** (and pending-prompt inject) is blocked.

Pending bible prompts (`useStorytellerUiStore.pendingChatPrompt`): if focused session is not storyteller, do **not** inject into a canvas session. Either focus/create a storyteller session or no-op. Never swap tools on one thread.

---

### 5.8 Session list (Action 37)

Inside the overlay, Cursor-shaped:

- List of this project's sessions (title, module badge, relative time).
- Spinner / pulse if `status === streaming` **or** the local runtime reports `useChat` submitted/streaming (trust local runtime over a stale row; PATCH status on turn start/end).
- Click row → `focusedSessionId = id` (does not stop others).
- Pencil → inline rename → PATCH title (`title_locked=true`).
- Trash → `ConfirmDialog` → DELETE (abort that runtime only).
- “New chat” → POST with **current** moduleId if that module has an agent; else disable with the no-agent copy.

Do not build a second list in `StorytellerWritersRoom` or `LoopChatSidebar`.

---

### 5.9 Cheap title (Action 38)

After first **user** message of a session, if `!title_locked` and title is still the placeholder:

Fire-and-forget `complete()` from `@/shared/ai/gateway`:

- `scope`: `projectScope` from the session
- `feature`: add `LlmFeature.ChatSessionTitle = 'chat.session-title'`
- `model`: `TEXT_GEN_FAST_MODEL` (`src/shared/agent-kernel/models.ts`) — **not** `resolveRoleModel('chat')`, not Author, not critic
- `prompt`: first user text, capped (~200 chars)
- `system`: “Title this chat in 6 words or fewer. No quotes.”
- Max tokens: keep the prompt tiny; do not attach tools

`await complete` **after** `sendMessage` has started, or `void titleSession(id)` from the route that records the first user message. The chat stream response must not `await` the title.

PATCH title only if still placeholder and not locked. Failures: leave placeholder, session usable. User rename wins forever (`title_locked`).

`meteredCall` wraps **Mastra `agent.generate`**. Title is not an agent turn — use **`complete()`**, which already records `llm_calls`. That satisfies “through the gateway.”

---

### 5.10 Assistant route changes (touch with care)

`src/app/api/assistant/[agentId]/route.ts`:

1. Parse `sessionId` from body (`AssistantChatBodyKey.SessionId`).
2. If present: `tryProjectScope`, load `chat_sessions`, 404 if missing/wrong user/wrong project; pass `memory: { thread: row.thread, resource: row.resource }`; PATCH status `streaming` at start and `idle`/`suspended` when the stream ends (best-effort; client also PATCHes).
3. If absent: today's `memoryRef` — do not break `memory-ref.test.ts`.
4. Still `withGatewayContext({ scope })` when projectScope exists.
5. Do not merge in SSE emitters. Do not add `commit_beat`.

Loop-creator assistant route: same `sessionId` memory bind if that route has its own memory today — read the file, do not guess. Keep its wire.

---

### 5.11 Tests (no Playwright)

| Test file | Asserts |
|---|---|
| `src/shared/chat/core/__tests__/chat-session-policy.test.ts` | `canSendToSession` matrix: match/mismatch/no-agent. |
| `src/shared/chat/core/__tests__/overlay-memory-ref.test.ts` | Two session ids → two threads; does not equal `memoryRef(...)`. |
| `src/shared/agent-kernel/mastra/__tests__/memory-ref.test.ts` | **Still passes** — do not retarget existing doors to overlay refs. |
| `src/shared/chat/core/io/__tests__/chat-sessions.api.test.ts` | PATCH cannot change moduleId (Zod). |
| `src/app/api/chat/sessions/__tests__/chat-sessions-route.test.ts` | User B GET/DELETE → 404; create sets module once. |
| `src/shared/chat/ui/WorkspaceChatOverlay/__tests__/workspace-chat-overlay-visibility.test.ts` | Overlay component stays in tree when `overlayOpen=false` (query by test id, `hidden`). |
| `src/domains/storyteller/ui/StorytellerLayout/panels/__tests__/writers-room-single-chat.test.ts` | When overlay flag on, `WritersRoomAssistantChat` / `AssistantChat` is not rendered from Writers Room. |
| Title unit | Failure path leaves placeholder; locked title not overwritten. |

Live-tier optional: `*.e2e.test.ts` against a **scratch** project — list/create/404. Not Playwright.

---

### 5.12 Quality gates while implementing

One extract / file at a time. After each touched `src/**` file: `npm run qualitygate:file -- <path>`. After new `src/app/api/**/route.ts`: `npm run openapi:generate` and `npm run openapi:check`. No `eslint-disable`. No `as` assertions (`as const` only). No cross-domain imports. No Playwright. No browser. Flag off until the unit tests above exist.

---

### 5.13 Constraints (print this next to the keyboard)

- Overlay + types in `@/shared/chat`. Domains do not import each other. Shared does not import domains.
- `AppModuleId` is the module enum. URL segment = enum value.
- Title = `complete()` + `LlmFeature.ChatSessionTitle` + `TEXT_GEN_FAST_MODEL`. Fire-and-forget.
- Delete aborts **that** session only.
- Do not steal a storyteller stream into a 2d-canvas thread.
- Do not add `commit_beat`.
- Do not merge `ChatFrameType` SSE with `handleChatStream`.
- Do not change `memoryRef()` format for existing doors.
- Do not mount `AssistantChat` on module `page.tsx` files.
- Do not `{open && <Overlay/>}`.
- Do not auto-POST after refresh.
- Do not invent agents for 2d-canvas / 3d-canvas / asset-exporter.
- No Playwright as a Phase 5 exit (`evaluation.md` §9.1).

**Exit.** Flag on. Leave storyteller mid-stream, open 2d-canvas, overlay still streams (SPA). Toggle hide does not abort. Refresh restores the list and hydrates messages; a streaming row becomes idle without a second billed start. Send from 2d-canvas while a storyteller session is focused → mismatch dialog (or no-agent dialog); storyteller stream untouched. Two storyteller or storyteller+loop sessions can stream together. First message titles unless rename won. `npm run qualitygate:file` clean on every touched file. `openapi:check` clean for the new JSON routes.

---

## Phase 6 — Tests only (unit +15%, Playwright on four surfaces)

No product features. No new agents, overlays, workflows, or settings tabs. This phase is a **coverage campaign** plus a **browser campaign** on pages that already exist.

**Not 100% unit tests.** Today: ~341 Vitest files under `src/` vs ~2083 production `src` files. Capture a baseline on day one with `npm run test:coverage` (`coverage/coverage-summary.json` → `total.statements.pct`). **Exit: statements ≥ baseline × 1.15** (fifteen percent *relative*, not +15 percentage points, not 100%). Same direction for lines; branches are not the gate. Record the two numbers (baseline, target) in the PR that starts the phase.

**Not a rewrite of evals.** `eval:scorer-fixture` / `eval:agent-contract` stay Phase 0–2. Live `*.e2e.test.ts` (Vitest, scratch project, no browser) stay as they are. Phase 6 Playwright does **not** replace those.

**Four Playwright surfaces** (happy / error / edge on each). Follow `e2e/` as it already works: specs in `e2e/scenarios/<feature>.spec.ts`, actions in `e2e/fixtures/`, labels/selectors/timeouts as **enums** in `e2e/constants/`, login via `setupAuthenticatedPage`, throwaway project via `createStoryProject` (or a sibling helper on `/projects`). No hard-coded UUIDs. No logging in as a real human. Operator runs `npm run test:e2e`. OpenRouter **insufficient credits** (402) → stop the suite, tell the operator, do not retry (same as smoke). Pin any live Writers Room chat to GLM (`zai-coding-plan:glm-5.2`) unless the spec is **stubbed** (empty-turn pattern). Stub paid image/3D providers in Playwright unless the row says **live**.

**Already shipped (do not duplicate; extend):**

| Spec | What it covers |
|---|---|
| `e2e/scenarios/storyteller-chat.spec.ts` | Hello → working status → any reply |
| `e2e/scenarios/storyteller.spec.ts` | Fresh project, bible via chat + Add to world, character in cast |
| `e2e/scenarios/storyteller-empty-turn.spec.ts` | Stubbed empty model turn → notice, not silence |
| `e2e/scenarios/storyteller-draft.spec.ts` | Draft locked with 0 beats; Script/Novel; generate-next; regenerate; ghost Tab/Esc (ghost stubbed) |
| `e2e/scenarios/storyteller-smoke.script.ts` | Non-Playwright API smoke (`npm run test:e2e smoke`) |

**Missing entirely:** `world-canvas.spec.ts`, `asset-exporter.spec.ts`, `projects.spec.ts`, `settings.spec.ts`. Storyteller still lacks error/edge beyond empty-turn and the beats gate.

**House rules for new tests.** No `eslint-disable`. Magic strings → enums in `e2e/constants/` (already true for storyteller). Unit tests: no `as` assertions, no domain→domain imports. Prefer testing `core/` / `services/` / policy functions over mounting 400-line layouts. Do not add Playwright to `test:unit` / precommit (too slow). Optional CI job; operator-run locally.

**Track:** Actions **49–51**. Tables below are the backlog. Close a row by landing the test, not by writing more spec.

### 6.1 Unit tests — scenarios to cover

Path: **H** happy · **E** error · **G** edge. **Have** = a focused unit file already exists (may still need the named case). Prefer the listed target; split if the file would exceed 400 lines.

| ID | Area | Scenario | Path | Target | Have |
|---|---|---|---|---|---|
| UT-ST-01 | Storyteller persist | Approve with `sequence` 1,2,3; uniqueness `(episodeId, sequence)` | H | beat persist / Action 2 helper | partial |
| UT-ST-02 | Storyteller persist | Save miss fails the run (not `{ saved: false }` success) | E | same | no |
| UT-ST-03 | Storyteller persist | Duplicate sequence rejected | E | same | no |
| UT-ST-04 | Beat-draft lint | Mechanically broken beat → Author retry once → skip critics | H | beat-draft workflow deps (inject) | partial |
| UT-ST-05 | Beat-draft lint | Unbounded `.dountil()` cannot run | G | workflow graph unit | no |
| UT-ST-06 | Author-truth | Twist / author-truth absent from Author context | H | context assembly | partial |
| UT-ST-07 | Author-truth | Planner still receives author-truth | H | same | partial |
| UT-ST-08 | Verdict | Kill → zero persist / no `commit_beat` | H | workflow + persist | partial |
| UT-ST-09 | Verdict | Resume with Revise carries summary+draft; no silent approve | H | resume helper | partial |
| UT-ST-10 | Manuscript | `manuscriptGenerateDisabled(0)` true; `>0` false | H | manuscript helpers | yes |
| UT-ST-11 | Manuscript | Ghost complete does not call beat-draft / critics | H | `complete-script-ghost` | partial |
| UT-ST-12 | Manuscript | Generate-section with zero beats → `ZeroBeats` error | E | generate-section service | partial |
| UT-ST-13 | Manuscript | Script vs Novel format fixtures (slugline vs chapter) | H | skill / format checks | partial |
| UT-ST-14 | Artifact-draft | Bible card approve persists; kill writes nothing | H | `generate-artifact-draft` | partial |
| UT-ST-15 | Chat body | `writersRoomChatBody` omits empty episode; includes `bibleSection` | G | `writers-room-tool-helpers` | yes |
| UT-ST-16 | Add to world | Tool args commit; wrap-up prose does not | H | `strip-assistant-bible-chat-chrome` | yes |
| UT-ST-17 | Voice | Function-word collapse on two same-mouth fixtures | H | voice extractor / s10 | yes |
| UT-ST-18 | Voice | Script cue vs novel quote extractors on a mixed page | G | extractors | partial |
| UT-ST-19 | Prompt registry | UI inventory fails if prompts hide in generate buttons | H | `generate-prompt-inventory` | yes |
| UT-ST-20 | Memory | `memoryRef` isolates projects; empty episode uses `_` | H | `memory-ref.test.ts` | yes |
| UT-ST-21 | Memory | Overlay ref ≠ storyteller ref (skip until Phase 5) | G | `overlay-memory-ref` | no |
| UT-2D-01 | Tile generate | Checkpoint before provider create; retry does not second-buy | H | `generate-tile-run` | yes |
| UT-2D-02 | Tile generate | Persist failure after paid create does not retry create | E | same | yes |
| UT-2D-03 | Tile generate | Invalid coords / missing projectId rejected before provider | E | payload schema | partial |
| UT-2D-04 | World DTO | List/create query Zod; bad uuid 400 | E | `world.dto` | yes |
| UT-2D-05 | Repaint | Stroke add/clear; empty strokes no-op apply | H/G | `useWorldUiStore` / repaint | partial |
| UT-2D-06 | Repaint | Provider 402 / timeout → error, not a fake success tile | E | repaint-run-status | partial |
| UT-2D-07 | Select mode | Box geometry; save-asset URL only when blob ok | H/E | select-mode tests | partial |
| UT-2D-08 | Upscale | Provider wire; missing key fails closed | E | `upscale-provider-wire` | yes |
| UT-2D-09 | RLE / world types | Encode/decode round-trip; empty grid | H/G | `rle` / `world-types` | yes |
| UT-2D-10 | Settings API | `probeProvider` ok vs `{ ok: false, error }` | H/E | `settings.api` | no |
| UT-2D-11 | Settings API | `fetchProviders` network throw | E | same | no |
| UT-EX-01 | Meshy I2-3D | Checkpoint: retry after create waits on task id | H | meshy checkpoint test | yes |
| UT-EX-02 | Meshy SSE | Parse progress; malformed chunk ignored | H/G | `parse-meshy-sse` | yes |
| UT-EX-03 | Hyper3D | Missing subscription key throws named error | E | `run-hyper3d-generation` | no |
| UT-EX-04 | Remesh | Checkpoint / no double create | H | remesh checkpoint | yes |
| UT-EX-05 | Empty copy | `resolveNoModelDescription` idle / generating / recover | H | `asset-exporter-panel` | yes |
| UT-EX-06 | Filename | `readAssetModelFilename` missing/invalid jsonb | E/G | filename helper | yes |
| UT-EX-07 | Resume | `decide-resume-run` aborted vs live | H/E | `decide-resume-run` | yes |
| UT-EX-08 | Contracts | Generation metadata parse; unknown provider | E | `generation-metadata` | yes |
| UT-EX-09 | Prepare image | Bad URL / missing asset | E | `prepare-image-url` | yes |
| UT-WS-01 | Projects schema | Create `{ name, masterPrompt? }`; empty name fails Zod | H/E | `workspace-project-schema` | no |
| UT-WS-02 | Projects mapper | snake `master_prompt` and camel `masterPrompt` both map | G | same | partial |
| UT-WS-03 | Filter/sort | Search miss; sort newest/oldest/name | H/G | `filterAndSortProjects` | no |
| UT-WS-04 | Delete | Confirm deletes; cancel does not | H/E | extract from `useProjectSelection` | no |
| UT-WS-05 | Rename | Trim; unchanged name no PATCH; failed rename false | H/E | workspace-project-store | no |
| UT-SH-01 | Gateway | Unknown model does not record priced `$0` | E | gateway record | yes |
| UT-SH-02 | Gateway | `complete()` records feature + outcome on throw | E | `complete` tests | partial |
| UT-SH-03 | Auth | `getSession()` banned on server paths | H | identity / lint inventory | yes |
| UT-SH-04 | ProjectScope | User B cannot mint scope for A's project | E | `project-scope.test.ts` | yes |
| UT-SH-05 | Chat policy | `canSendToSession` match / mismatch / no-agent (skip until Phase 5) | H/E | `chat-session-policy` | no |
| UT-SH-06 | URL builder | `buildUrl` / `joinUrlPath` encoding | H | `url-builder` | partial |
| UT-SH-07 | Jobs | Missing submission nonce → 400 / does not compile | E | submission-nonce | yes |
| UT-RT-01 | Assistant route | Invalid body 400; unknown agent 404; no project 403 | E | extract parse from route | partial |
| UT-RT-02 | Assistant route | Known vs unknown `modelName` | H/E | same | partial |
| UT-RT-03 | Chat sessions | PATCH cannot change `moduleId` (skip until Phase 5) | E | chat-sessions Zod | no |
| UT-RT-04 | Storyteller PATCH | Allowlist: body cannot reparent beat | E | beat/episode PATCH Zod | partial |
| UT-RT-05 | OpenAPI | New `route.ts` in spec or omit list | H | `openapi:check` | yes |

**How to pick what to write first.** Run `npm run test:coverage:open`. Sort uncovered files by size under `src/domains/storyteller/services`, `src/domains/2d-canvas/tasks`, `src/domains/3d-asset-exporter/tasks`, `src/shared/workspace`, `src/app/api/**`. Fill **E** and **G** rows before a seventh happy-path on a file that is already green. Stop when the ratchet hits 1.15×.

### 6.2 E2E (Playwright) — scenarios to cover

Live = real model or real provider. Stub = `page.route` like empty-turn / ghost complete. All rows: `setupAuthenticatedPage` unless the row is unauthenticated.

| ID | Spec | Scenario | Path | Live | Have |
|---|---|---|---|---|---|
| E2E-ST-01 | `storyteller-chat.spec.ts` | Hello → working → non-empty reply | H | GLM | **yes** |
| E2E-ST-02 | `storyteller.spec.ts` | Create project, bible + Add to world, character in sidebar | H | GLM | **yes** |
| E2E-ST-03 | `storyteller-empty-turn.spec.ts` | Empty assistant frames → notice, not blank thread | G | stub | **yes** |
| E2E-ST-04 | `storyteller-draft.spec.ts` | Generate next disabled / locked with 0 beats | E | no | **yes** |
| E2E-ST-05 | `storyteller-draft.spec.ts` | Script ↔ Novel restyles editor | H | no | **yes** |
| E2E-ST-06 | `storyteller-draft.spec.ts` | Generate next → Approve → manuscript non-empty | H | yes | **yes** |
| E2E-ST-07 | `storyteller-draft.spec.ts` | Regenerate section changes text | H | yes | **yes** |
| E2E-ST-08 | `storyteller-draft.spec.ts` | Ghost Tab accepts; Esc dismisses | H | stub | **yes** |
| E2E-ST-09 | `storyteller-verdict.spec.ts` | Beat generate → Kill → board unchanged | H | yes | no |
| E2E-ST-10 | `storyteller-verdict.spec.ts` | Beat generate → Revise → still pending, not committed | H | yes | no |
| E2E-ST-11 | `storyteller-chat.spec.ts` | Send while streaming → Stop visible; no double send | G | GLM | no |
| E2E-ST-12 | `storyteller-auth.spec.ts` | Logged-out storyteller → login, not a working room | E | no | no |
| E2E-ST-13 | `storyteller-auth.spec.ts` | Forged project id → cannot load another user's bible | E | no | no |
| E2E-ST-14 | `storyteller-episodes.spec.ts` | Create / select episode; Draft still gated until beats | H/E | no | no |
| E2E-ST-15 | `storyteller-credits.spec.ts` | Stub assistant POST 402 → UI error; **do not retry** | E | stub 402 | no |
| E2E-ST-16 | `storyteller.spec.ts` | Add to world cancel leaves bible empty | E | GLM | no |
| E2E-2D-01 | `world-canvas.spec.ts` | Open `/{id}/2d-canvas`; canvas chrome visible | H | no | no |
| E2E-2D-02 | `world-canvas.spec.ts` | Empty world: no tiles, generate control present | G | no | no |
| E2E-2D-03 | `world-canvas.spec.ts` | Generate with stubbed 200 → tile or progress then image | H | stub tile API | no |
| E2E-2D-04 | `world-canvas.spec.ts` | Generate stubbed 4xx → error, no fake tile | E | stub | no |
| E2E-2D-05 | `world-canvas.spec.ts` | Generate stubbed 402 → error, no retry loop | E | stub | no |
| E2E-2D-06 | `world-canvas.spec.ts` | Navigate away mid-job → no crash; return consistent | G | stub | no |
| E2E-2D-07 | `world-canvas.spec.ts` | Select-mode toolbar hidden until mode on | G | no | no |
| E2E-EX-01 | `asset-exporter.spec.ts` | Open exporter; empty “No Asset Selected” | G | no | no |
| E2E-EX-02 | `asset-exporter.spec.ts` | Upload / pick 2D asset → editor shows it | H | stub upload | no |
| E2E-EX-03 | `asset-exporter.spec.ts` | Generate with no asset → disabled or error, no Meshy | E | no | no |
| E2E-EX-04 | `asset-exporter.spec.ts` | Generate stubbed success → preview; recover copy clears | H | stub Trigger/Meshy | no |
| E2E-EX-05 | `asset-exporter.spec.ts` | Provider error stub → error copy, idle description | E | stub | no |
| E2E-EX-06 | `asset-exporter.spec.ts` | Recover path when task id set and not generating | G | stub | no |
| E2E-PR-01 | `projects.spec.ts` | `/projects`: empty name keeps Create disabled | G | no | no |
| E2E-PR-02 | `projects.spec.ts` | Create named project → card; open → storyteller | H | no | no |
| E2E-PR-03 | `projects.spec.ts` | Rapid submit does not create two (disabled while creating) | G | no | no |
| E2E-PR-04 | `projects.spec.ts` | Search no match → empty-search copy | G | no | no |
| E2E-PR-05 | `projects.spec.ts` | Delete confirm removes card; cancel keeps it | H/E | no | no |
| E2E-PR-06 | `projects.spec.ts` | Unauthenticated `/projects` → login | E | no | no |
| E2E-PR-07 | `projects.spec.ts` | Create API 500 stub → error, stay on page | E | stub | no |
| E2E-SE-01 | `settings.spec.ts` | Header Settings opens dialog | H | no | no |
| E2E-SE-02 | `settings.spec.ts` | Rename project; selector shows new name | H | no | no |
| E2E-SE-03 | `settings.spec.ts` | Empty / whitespace name → Save disabled, no PATCH | G | no | no |
| E2E-SE-04 | `settings.spec.ts` | Rename API fail → error toast, old name remains | E | stub | no |
| E2E-SE-05 | `settings.spec.ts` | Provider Test stub ok vs fail | H/E | stub probe | no |
| E2E-SE-06 | `settings.spec.ts` | MCP keys: name required; revoke confirm | H/E | stub | no |
| E2E-SE-07 | `settings.spec.ts` | Close dialog (X / Esc); page still usable | G | no | no |

**Credit / spend.** Live GLM rows share the smoke pin and the 402 hard stop. Do not add a second live model. Tile and Meshy rows are **stubbed**.

**Playwright plumbing (once, Action 49).** Enums in `e2e/constants/world-canvas.ts`, `asset-exporter.ts`, `projects.ts`, `settings.ts`. Fixtures: `world-canvas-fixtures.ts`, `asset-exporter-fixtures.ts`, `projects-fixtures.ts`. Reuse `setupAuthenticatedPage`. Do not use `e2e/config.ts` default `TEST_PROJECT_ID` UUID.

### 6.3 Constraints

- Phase 6 does not implement overlay chat (Phase 5) or new compiler work. Rows that need Phase 5 (`UT-ST-21`, `UT-SH-05`, `UT-RT-03`) skip until that code exists.
- No Playwright in `npm run test:unit` / `precommit`.
- No browser MCP. No `curl localhost:3000` to check behaviour.
- No 100% coverage mandate. Stop at 1.15× statements.
- `dangerouslyIgnoreUnhandledErrors` stays `false`. New tests must not swallow rejections.

**Exit.** Baseline and target written down. `total.statements.pct` ≥ target on `npm run test:coverage`. Every **Have = no** E2E row in §6.2 is a spec that exists and passes when the operator runs `npm run test:e2e` (stubs where Live = stub/no). Existing storyteller specs still pass. OpenRouter 402 during live rows → stop, do not flake-retry.

---

## What I would not do, even later, as specified

| Opus item | Instead |
|---|---|
| Action 10 as `commit` mode + `commit_beat` tool | Host persists after Approve |
| Action 14 five scopes as floor | Three now; two by ablation |
| Action 16 `continuity-sweep` + `autonomous-episode` as “showable” | `fix-inconsistencies` is the sweep; autonomy is Phase 4 |
| Action 27 regex-injection P0 | Account guardrails yes; regex no |
| Action 28 after the full floor is built | Constraint from Phase 0 |
| Serial `1 → 3 → 2 → … → 30` | Platform ∥ Storyteller per phase |

---

## Action → phase index

| # | Title | Phase |
|---:|---|---|
| 1 | Identity and ownership | 0 |
| 2 | Atomic persist | 0 |
| 3 | Run trace | 0 |
| 4 | CI + pinned tsx | 0 |
| 5 | ESLint compose, ratchet that can fail | 1 |
| 6 | Cost ledger total | 0 first cut, 1 complete |
| 7 | Named eval tiers | 0 name/honesty, 2 live |
| 8 | Unhandled errors + paid checkpoints | 1 |
| 9 | One entry, one mutation policy | 0 |
| 10 | Three modes with `commit_beat` | **Cut** (withhold writes in Plan; host commits) |
| 11 | Eight tools | 1 `brainstorm` only; rest with need |
| 12 | Four-layer canon | 1 partition, 4 ledger |
| 13 | Finding / BeatPlan contracts | 1 |
| 14 | One critic, five scopes | 1 keep three; 4 extra scopes |
| 15 | Catalog disclosed | 2 |
| 16 | Three workflows (heavy / light / sweep) | 3 Draft manuscript + `artifact-draft`; no showcase autonomy |
| 17 | Martin / tone / Humanizer | 2 (always-on class) |
| 18 | Trace-contract tests | 0 |
| 19 | Deterministic linter | 1 |
| 20 | Golden set | 2 |
| 21 | Judge calibration | 2 start, 3 complete |
| 22 | Ablation harness | 2 |
| 23 | Quality gate + $/quality | 2 honest cost, 3 gate |
| 24 | `promote_rule` | 4 |
| 25 | Model pins | 4 |
| 26 | Artifact matrix | 3 |
| 27 | Guardrails | 0 account; 2 `masterPrompt`; **not** regex P0 |
| 28 | Latency | **0 reconcile + every phase budget** |
| 29 | Prompt registry | 3 |
| 30 | Chat verdict wire | 0 (pixels later, unverified); 3 Draft-tab pixels |
| 31 | Memory bind/bound/expire | 1 bind+bound, 3 expire |
| 32 | Voice fingerprints | 3 |
| 33 | Chat session aggregate | 5 |
| 34 | Overlay host, one component | 5 |
| 35 | Stream survives navigation and refresh | 5 |
| 36 | Module lock + new-session dialog | 5 |
| 37 | Session list (Cursor-shaped) | 5 |
| 38 | Cheap session title | 5 |
| 49 | E2E fixtures + new specs (four surfaces) | 6 |
| 50 | Unit coverage +15% relative (table 6.1) | 6 |
| 51 | Playwright happy/error/edge backlog (table 6.2) | 6 |

Overview-only items with no action id: constants functions incentive → Phase 2; `toLegacyAsset` dropped thumbnail → with the next 2D/3D contract touch in Phase 1; bible-tools / model-config size → extract when those files are next edited, not a phase gate. Appendix B (RLS tests, drizzle-kit drift, optimistic lock, …) stays unphased — those ids moved to **39–48** so they do not collide with Phase 5. Phase 6 tests are **49–51**.

---

## How to use this

1. Phase 0 is one engineering slice (platform + storyteller in the same PR series). It is security + persist + CI + eval honesty. No new agent.
2. Phase 1 is still zero new agents. Kitchen picture: [learning-materials.md](./learning-materials.md) Part 2A.
3. Phase 2 is the first writing-quality change (skills + Humanizer). Latency is the kill switch.
4. Phase 3 is the Draft manuscript (Script / Novel) plus bible/characters on the cheap workflow. Same critic shape, cheaper budget on cards. The navigator already has the tab.
5. Phase 4 is a backlog with promotion tests, not a roadmap sprint.
6. Phase 5 is the workspace overlay chat (Actions 33–38). After 0–4. Not a lettered insert before Humanizer. The Phase 5 section in this file is the handover: current files, why the stream dies, schema, mount tree, adapter rules, tests. Tickets in `actions.md` are step lists for a smaller agent.
7. Phase 6 is tests only (Actions 49–51). Unit statements × 1.15 vs a captured baseline. Playwright on storyteller (extend), 2d-canvas, 3d exporter, projects, settings — happy / error / edge. Tables in this file are the backlog.

When later editing these files, this file still wins on: regex-injection is not P0, latency is a Phase 0 constraint, three critics not five, host owns commit, overlay chat is **Phase 5**, ids 1–32 stay mapped, 33–38 are the overlay, **49–51 are tests (Phase 6)**. `target-architecture.md`, `actions.md`, `evaluation.md`, `diagrams.md`, `overview.md` §8, and `learning-materials.md` now state that same contract.
