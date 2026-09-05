# Nomos — Target Architecture: The Prose Compiler

Design only. No implementation. Baselined on `refactor` @ `b409539`.
**Build order:** [phases.md](./phases.md). **Review of the prior middle draft:** [second-opinion.md](./second-opinion.md).

An agentic writing system for Storyteller on Mastra v1. Craft taxonomy from
[novel-writing](https://github.com/wgwtest/novel-writing). Loop from Cursor / Claude Code.
World-state compiler from [InkOS](https://github.com/Narcooo/inkos) (adapt ideas, AGPL — do not
vendor). Voice from the existing `masterPrompt` UI. Humanizer after the editorial verdict.

This is the **honest floor**: the smallest system that uses the catalog, carries Martin as
*structure*, lets the user set *tone*, and can ship under the chat timeout. Growth past this
floor is an ablation result.

---

## 0. What the previous target got wrong

**Job-title draft.** Eleven roles. Renaming `requireAuth` does not create a boundary.

**Over-built “middle.”** Seven critics, then five; eleven tools; four then three permission
modes including a model-visible `commit_beat`; six then three “showable” workflows including a
durable showcase. Ablation was invented to stop this, then the floor was exempted from it.

**Under-built draft.** Cut cognition/dialogue *and* parked the George split in an appendix.

This document keeps the ideas that reduce work (one parameterized critic, tools withheld not
refused, plan in code, ablation as the growth rule, Martin-as-structure / user-as-tone) and
sets the floor to what already runs plus host-owned truth:

| Piece | Count | What it is |
|---|---|---|
| Loop agent | 1 | **`storyteller`** — the only agent the writer talks to |
| Producer agents | 2 | **Planner** (structure + `psychology`), **Author** (draft, revise, Humanizer pass) |
| Critic agent | 1 | One agent, **three** scopes in parallel: `continuity` · `prose` · `stakes`. `cognition` / `dialogue` are Phase 4 scopes, not new Agent classes |
| Muse | 2 internals | `brainstorm` + ranker. Not a chat personality |
| Workflows | 3 | `beat-draft-workflow` (heavy) · `artifact-draft` (light) · `fix-inconsistencies` (sweep) |
| Skills | 10 + 3 | Catalog L1 always; L2 on match. `psychology` at Planner. Humanizer always-on class at de-slop. `anti-slop` until ablation wins |
| Canon | 4 layers | Prompt **partition** first. Tables/ledger only if the partition fails |
| Voice UI | 0 new | Existing sidebar MASTER PROMPT + episode prompt |
| Draft surface | 1 tab | Existing PhaseNavigator **Draft** (`Phase.WRITING`). Medium well + Cursor ghost-text. Modes: Script / Novel |

**Cut.** Action 10 as `read / draft / commit` with `commit_beat` in the model’s tools. Host
persists after Approve. Kill emits zero persist.

**Not P0.** Regex prompt-injection at OpenRouter. Fiction dialogue trips it. Account guardrails
(ZDR, `limit_usd`, `allowed_models`) stay P0. `masterPrompt` is delimited and capped in app code.

---

## 1. Two ideas carry the whole design

### 1.1 Prose is a compiled artifact — and so is world state

> The manuscript is the source tree. Canon is the type system. Critics emit located diagnostics.
> Revision is `build → test → fix`. The editorial verdict is code review. The de-slop pass is
> the last compiler stage: it may change cadence and diction, not facts.

The compile **unit** is the beat transaction: draft + critiques + trace + cost +
**`AfterBeatState`** (positions, injuries, objects held, open plants, who owns the next
decision). InkOS’s chapter workspace is this idea: body + foreshadowing + runtime snapshot,
then one atomic commit. A run that reports success with `{ saved: false }` is not a compiler.

The `setups` table already exists and nothing queries it. Live plant/payoff data sits in
`beats.setupsPayoffs` jsonb — **and that jsonb also packs Law of Motion fields**
(`actionTaken`, `consequence`, `storyStateChange`). Phase 1 dual-writes plants into
`setups` and leaves the jsonb in place. Deleting the jsonb is a later extract, after
action fields have their own column or table.

### 1.2 The floor is chosen; everything above it earns its place

The floor is the pipeline that **already exists** on `refactor` (planner, author, three
critics, durable suspend) plus host work: atomic persist, author-truth partition, deterministic
lint in-path, Humanizer after verdict, one mutation policy on every chat URL.

Five critic scopes, four-layer *tables*, `autonomousAuthor`, embedding search, and
`promote_rule` are Phase 4. Turn a candidate off, re-run the golden set, keep it only if quality
drops by more than the noise floor. Evaluation (`evaluation.md`) is how that rule stays honest.

---

## 2. The honest floor

```
Writer
  ├─ storyteller (chat) — bible, premise, beats, verdict
  └─ Draft tab — manuscript (Script | Novel)
        ghost complete · regenerate this section · generate next
        │
        └─ workflows (code owns persist)
              ├─ beat-draft-workflow     heavy (section generate)
              ├─ artifact-draft          light (character, bible section, premise)
              └─ fix-inconsistencies     sweep
```

**Writer journey (already in the navigator).** Premise (Ozymandias + 10-point) → Beats (Cork Board text cards) → Draft (manuscript). Cork Board must not draft scripts (`CORK_BOARD_GENERATE_BEATS_PROMPT` already forbids `run_beat_draft_workflow`). Draft is where bible + premise + beats become pages.

**Permission.** Plan-mode withholds mutating *chat* tools (existing `AgentController`). The
compiler does not expose `commit_beat` to the model. After human Approve, **code** writes.
Same as Cursor Plan → user approve → apply.

**Latency (binds every phase).** One source for `GENERATION_STUCK_TIMEOUT_MS` (180s), route
`maxDuration`, and the author timeout. InkOS default is **one** auto-revise — copy that budget.
The editorial suspend splits one Vercel window into two; do not remove it. Do not add critic
scopes or a Humanizer pass that makes the first window miss 180s.

---

## 3. The critic: one agent, three scopes

A critic is not a personality. It is the same agent, given a different `ProblemType` scope,
run in `.parallel()`. Floor scopes map onto what already ships:

| Scope | Looks for | Today |
|---|---|---|
| `continuity` | contradictions against canon, chapter-interface breaks | `continuityCritic` |
| `prose` | diction, embodiment, machine tells in the draft | `proseCritic` |
| `stakes` | causal spine, decision ownership, Law of Motion on the page | `stakesCritic` |

`cognition` (author-truth leak, unequal knowledge) and `dialogue` (transcript-like talk) load
as extra **scopes** when golden-set defects of that class survive these three. Isolation still
applies: a critic that reads far more than it returns is a subagent; its 60k never enters the
chat agent.

**`style-fidelity` on the revise diff** is a critic *job* during `.dountil()`, not a fourth
always-on wall. It catches machines clearing findings by deleting vivid material.

### 3.1 The Finding contract

Copied from `revision-checklist.md`, enforced by `structuredOutput`, used by model critics and
the deterministic checker:

```ts
type Finding = {
  location: { beatId: string; paragraph: number; quote: string }
  problemType: ProblemType
  whatHappensNow: string
  whyItFails: string
  revisionDirection: string
  severity: Severity            // error blocks persist; warning does not
  promoteToProjectRule: boolean
}
```

A finding without a location and a verbatim quote is rejected. “The pacing is a bit stiff” is
unrepresentable. A critic never rewrites: diagnosis and repair stay separate.

---

## 4. Tools (chat agent)

Mutating persist is **absent**, not refused. Chat may propose; workflows commit.

| Tool | Purpose |
|---|---|
| `read_canon` / `read_world_bible` | Layer-partitioned retrieval |
| `read_manuscript` / list beats | Prose by beat or range |
| `search_manuscript` | Literal search — plants, self-repetition, name collisions. Embedding search is Phase 4 |
| `run_prose_check` | Deterministic linter. Returns `Finding[]` |
| `brainstorm` | Existing Muse + ranker; `wildcards` on the schema and forwarded |
| `run_beat_draft_workflow` / artifact / fix-inconsistencies | Dispatch. Not a personality |
| existing manage_* | CRUD the writer already has, behind Plan-mode visibility |

`commit_beat` is not a model tool. `promote_rule` is Phase 4.

---

## 5. Canon: four layers, three depths

### 5.1 Four layers — document convention, then retrieval permission

From `story-outline-and-causal-summary.md` §4. Phase 1 is a **prompt partition**. Phase 4 is a
ledger if the partition misses paraphrases.

| Layer | Contains | Who may retrieve it |
|---|---|---|
| **Story facts** | Pre-story state and events that occur | Everyone |
| **Character knowledge** | What each character observes, infers, misunderstands or conceals | Scoped per character |
| **Author truth** | The hidden mechanism | Planner and continuity/cognition only |
| **Reveal boundary** | What the audience may confirm by the end of this arc | Planner, those scopes, editorial gate |

> **The Author drafting a POV beat gets story facts plus that character’s knowledge, and is
> not given author truth.**

Dramatic irony is a retrieval permission, not a prompt that says “write with dramatic irony.”

POV-noun lookup against author-truth-only rows is a cheap filter (high precision, low recall).
It is not “the single best check.” Secrets leak by paraphrase.

### 5.2 Three retrieval depths

| Depth | Content | Default |
|---|---|---|
| **Task** | This beat’s plan and brief, bible, timeline, project rules, **`masterPrompt`** | Always |
| **Near** | Full prose for this beat and neighbours | Revising language or continuity |
| **Far** | Chapter cards — compressed structure | When structure is the question |

Prose outranks cards. Future prose is excluded unless a declared continuity dependency asks.
L4 (unrelated future prose) stays excluded.

### 5.3 Voice — `masterPrompt`, not a new UI

`masterPrompt` already exists on `projects` and `episodes`, edited as **MASTER PROMPT** (left
sidebar) and **EPISODE PROMPT** (premise). No Voice tab.

**Today:** chat assembly appends it last as `=== MASTER PROMPT ===`. Beat-draft Author does
**not** receive it. Episode prompt is saved and mostly unused in assembly. GRRM skills
concatenate into every draft and fight the field.

**Target:** project prompt, then episode overlay if set. Authoritative for register, tense,
person, cadence, banned phrasings. Never for canon facts, layer scoping, or permission.
Delimited, length-capped, hard rules packed **after** it. Empty = craft floor, neutral
register. Humanizer’s writing sample = this prompt + 2–3 accepted beats.

Character voice **fingerprints** (register, sample lines) are Phase 3. Stylometry needs an
extractor with its own tests and a min-token floor per speaker.

---

## 6. Skills

The [novel-writing](https://github.com/wgwtest/novel-writing) package is ~1.2k tokens at L1
(name + description × 10). Bodies are expensive. Disclosure is the cost model. Loading six
bodies on every beat is concatenation — the defect `compose-instructions.ts` already has.

| Level | Content | Loaded |
|---|---|---|
| 1 | `name` + `description` for every catalog skill | always |
| 2 | Skill body | when a scope, stage, or `forbiddenMistakes` entry matches |
| 3 | Deep reference; scripts **run** rather than read | when a finding needs it |

**Always-on by owner (not the whole catalog):**

| Skill | Owner |
|---|---|
| `psychology` | Planner (after pack-on vs pack-off ablation) |
| Humanizer always-on class (patterns 20–24, #7) | Author de-slop, after verdict |
| `anti-slop` | Keep until that ablation says Humanizer wins, then delete |

**L2 on match:** `planning`, `scene-causality-and-agency`, `revision-checklist`,
`style-fidelity`, `cognition-layers-and-language`, `dialogue-and-behavior`,
`story-outline-and-causal-summary`, `character-introductions`, `scene-and-structure`,
`realism-constraints`.

Adapt, do not vendor. Hygiene that tests Chinese quotation balance gets rewritten. Taxonomy,
Finding format, four-layer *information order*, hard rules transfer.

Humanizer [blader/humanizer](https://github.com/blader/humanizer) is MIT. **Always-on class
only** until `s8`/`s9` beat noise. Dashes, fragments, sayings stay **off** unless `masterPrompt`
asks for plain register. Claim-check is **code**: names, numbers, dates, quotes unchanged.

---

## 7. Three workflows

### 7.1 `beat-draft-workflow` — heavy (beats, final episode compile)

```
plan ─▶ concreteness + Law of Motion ─▶ draft (Author + masterPrompt)
         ─▶ run_prose_check (free; errors → draft)
         ─▶ critics ×3 parallel
         ─▶ ⏸ editorial verdict (no timeout, no default approve)
              approve │ revise ↺ (max one auto-revise) │ kill
         ─▶ Humanizer (always-on class, sample = masterPrompt + accepted beats)
         ─▶ claim-check (code)
         ─▶ host persist: draft + critiques + trace + cost + AfterBeatState
```

Deterministic checks before any critic. Intermediate state in step outputs, not the chat
window. Kill persists nothing. Soft `{ saved: false }` while the workflow succeeds is forbidden.

### 7.2 `artifact-draft` — light (character, bible section, premise)

Same **shape**, cheaper **budget**: typed input → 1–2 critic scopes (`continuity` /
`causality` or `cognition`) → existing `SectionPendingOverlay` → persist. **No Humanizer.**
**No Law of Motion.** A faction that contradicts world logic is a `Finding`.

Generate buttons stop holding prompt paragraphs (prompt registry, Phase 3).

### 7.3 `fix-inconsistencies` — the sweep

Already: assemble → structural scan → agentic scan → propose → suspend → apply. Keep it.
Do not rebuild as five beat critics. **No Humanizer** (it patches facts).

`autonomousAuthor` stays flagged off until verdicts can queue. A loop that sets
`autoApprove: true` to keep moving is forbidden.

### 7.4 Chat surface

Existing Writers Room chat — **one** conversation UI, later lifted to the project overlay (§7.6). No second *kind* of chat. Verdict stays on the `questions` frame.

| Decision | Behaviour |
|---|---|
| **Progress** | One line from the trace: `Planning` → `Drafting` → `Critics` → `Revising` |
| **Verdict** | Summary + draft + Approve / Revise / Kill. `resumeChatWorkflow` is **called** |
| **Revise note** | Inline text on Revise |
| **Timeout** | None. Drop `timeout: 120` and `defaultOption: 'approve'` |
| **Critiques** | Debug toggle only |
| **Voice** | Existing MASTER PROMPT / EPISODE PROMPT. No extra Voice tab |
| **Where it lives** | **Phase 5:** the General Chat Window in the *project* shell, not a child of `StorytellerLayout`. Until then, today's Writers Room mount is the interim. Overlay, multi-session, module lock: `target-architecture.md` §7.6 |

The **Draft tab** is the manuscript, not a chat panel. Specified next.

### 7.5 Manuscript surface — Premise → Beats → Draft

The PhaseNavigator already names three steps: **Premise**, **Beats**, **Draft** (`Phase.PREMISE` → `BREAKING` → `WRITING`). Draft unlocks when the beat board has at least one card (`storytellerAdvanceablePhase`). That is the product. The compiler in §7.1 is how a *section* of the manuscript is produced. It is not a substitute for the page.

**Today.** `StorytellerTab.Script` mounts `ScriptEditor`: a Courier `contentEditable`, placeholder “Start writing your screenplay…”, selection Expand / Condense / Rewrite via `POST /api/storyteller/script/edit`. CSS classes for slugline / character / parenthetical exist and are unused. There is no generate-from-canon, no ghost completion, no “next section,” no Novel mode. Cork Board copy forbids drafting scripts. `episodes.scriptContent` is the persist column. Chat may call `run_beat_draft_workflow`; the Draft tab does not.

**Job of the page.** Type into a quiet well. Ask the Author to continue or redo a bounded section. Keep what you typed. The model proposes; the host writes `scriptContent` on debounce and still only persists a *compiler* beat after Approve.

#### Modes

One episode-level mode, default **Script**. Not a Voice settings UI. `masterPrompt` still owns register; mode owns **page geometry**.

| Mode | Unit | What the Author is taught (non-AI craft, packed as a format skill) |
|---|---|---|
| **Script** | Scene (slugline → action → dialogue) | Studio/TV format a human screenwriter already uses: `INT./EXT. LOCATION – DAY/NIGHT`; action in present tense, camera-visible only; CHARACTER CUE in caps; parentheticals rare; dialogue; no markdown headings; ~one page per minute. Fountain/studio layout, not a novel with sluglines glued on. |
| **Novel** | Scene or chapter (prose paragraphs) | Novel craft: chapter or `***` break, not `CUT TO:`; default past tense unless `masterPrompt` says otherwise; viewpoint owns sensory access; dialogue with attribution beats, not centered CUES; interiority allowed; paragraphs, not dual-dialogue columns. |

Switching mode restyles the well (Courier vs a readable serif, Medium column) and swaps the format skill on the next Author call. It does not rewrite accepted pages unless the writer asks to regenerate.

#### Cursor-style autocomplete

Ghost text at the caret, same habit as the IDE: Tab accepts, Esc dismisses, typing through rejects. Trigger on pause or an explicit Continue. Context for that completion: partitioned bible + this episode’s premise + the beat cards that cover this span + manuscript *before* the caret. Same Author agent as the compiler; format skill from the mode. Ghost insert is not Approve and not a workflow persist.

#### Medium-minimal chrome

Centered reading column (~65–75ch). Novel: serif, generous leading. Script: Courier Prime (already on the tab). Persistent controls: mode toggle, **Generate next**, **Regenerate this section**. Selection toolbar already on the tab (Expand / Condense / Rewrite) stays, quieter. No critic dump, no tool log, no second chat column in the well.

| Command | Bound | Does |
|---|---|---|
| **Regenerate this section** | Current scene (slugline → next slugline) or chapter (`***` / heading → next) | Runs the heavy workflow on that span. Verdict still Approve / Revise / Kill. Replace only that span. |
| **Generate next** | After the last complete section, or empty page → first beat | Next uncovered beat (or beat range) becomes the next scene/chapter. Same workflow. Empty manuscript is allowed: first Generate next starts at beat 1. |
| **Ghost complete** | Caret | Token continuation, not a full critic pass. Cheap. |

Canon for every generate: world bible (partitioned) + episode premise + 10-point + the beat board. Do not ask the writer to paste those in. Do not generate Draft from chat-only memory while the beat board is empty — Beats stays the gate.

**Not this surface.** A `commit_beat` tool. A second *kind* of chat (the overlay in §7.6 is the same Writers Room, lifted). Humanizer on keystroke. Five critic scopes. Auto-running the heavy workflow on every pause (ghost text is the cheap path; the compiler is opt-in per section).

### 7.6 Workspace overlay chat — Phase 5

The compiler talks through **one** chat agent per session. The *window* is project chrome, not a storyteller-only panel.

| Rule | Behaviour |
|---|---|
| **One mount** | General Chat Window lives in `src/app/(workspace)/[projectId]/layout.tsx`. Module `page.tsx` files do not remount it |
| **Show / hide** | Icon in `GlobalHeader` or `GlobalSidebar`. Hidden is not unmounted |
| **Survive navigation** | storyteller → 2d-canvas (or any project module) does not abort an in-flight stream |
| **Survive refresh** | Session list reloads from the host; a `streaming` session is reattached |
| **Module lock** | `moduleId` is immutable. Watch any session from any module. **Send** only if `moduleId` matches the current module; else dialog to start a new session |
| **Many at once** | Several sessions may stream in the background (Cursor / Copilot) |
| **List** | In the same window: running indicator, switch, rename, delete |
| **Title** | Cheap metered model after the first user message; user rename wins |

`AssistantChat` in `@/shared/chat` is the implementation home. Storyteller verdict UI (`questions` frame, Action 30) still renders *inside* the session that owns that workflow — it does not become a second dock.

**Implement from [phases.md](./phases.md) Phase 5** (file list, schema, mount tree, `overlayMemoryRef`, tests) and `actions.md` 33–38. Do not invent a second overlay plan. 2d-canvas / 3d-canvas / asset-exporter have **no** chat agent today — watch-only, do not invent one.

**Not this phase.** Merging frozen `ChatFrameType` SSE with AI-SDK `handleChatStream`. That is a later host cleanup, not required to lift the window. Replaying the last user message after a full refresh (double bill). Changing `memoryRef()` for existing live doors.

---

## 8. The George vibe — structure, not tone

| Layer | Owner | Where |
|---|---|---|
| **Structure** — world, cast, reversals, consequence | Martin | Planner, before prose exists |
| **Tone** — register, cadence, diction | User `masterPrompt` | Author at drafting; Humanizer sample |
| **De-slop** — AI tells | Humanizer always-on class | After verdict, fact-frozen |

`psychology` at the Planner is character and plot construction. At the Author it only flavoured
how the beat read. Move it **after** a live pack-on vs pack-off ablation — that number does not
exist today because evals score `referenceOutput`.

Law of Motion remains a planner **gate** (`actionTaken`, `consequence`, `storyStateChange`).

---

## 9. Evaluation

`evaluation.md` is canonical. Summary:

| Tier | Proves | Runs |
|---|---|---|
| **0 Deterministic** | Schemas, POV-noun filter, Law of Motion, distributional shape | every commit |
| **1 Contract** | The right things were called, in the right order, persist on Approve, kill writes nothing | every commit |
| **2 Calibration** | The instrument works | on scorer change, nightly |
| **3 Live quality** | The writing is actually good | before a change ships |

Only Tier 3 may claim quality. Today’s `evals/run.ts` scores a frozen string. Name it
`eval:scorer-fixture`. Trace-contract tests on the **existing** three-critic workflow are Phase 0.

Trace assertions specific to this floor: three scopes dispatched and overlapping; Humanizer
after last revision and before persist; claim-check zero fact delta; Author context had no
author-truth row; `masterPrompt` present when set; every agent call carried thread + resource;
`brainstorm` reachable; kill emits no persist; window duration ≤ the single timeout source.

---

## 10. Models

Role pins through `resolveRoleModel`. Specific vendors are a Phase 4 ablation, not architecture.
`AGENT_MODEL_MATRIX` already pins author/chat toward Kimi and lists GLM. Five scopes on Opus is
unaffordable; on Haiku they were unreliable — **three** scopes on the cheap tool-calling tier
is the floor cost model.

OpenRouter **ZDR**, **`limit_usd`**, **`allowed_models`**: account P0. Do not enable
`person-name` / `address` redaction. Do not enable regex prompt-injection on unpublished
fiction. Gateway cannot express “masterPrompt may govern register but never canon.”

---

## 11. Mastra v1 mapping

| Design element | Mastra primitive |
|---|---|
| Chat loop | `storyteller` Agent, bounded `maxSteps` |
| Plan vs mutate (chat tools) | Existing `AgentController` — mutating persist **not** in the tool list |
| Critic isolation | One Agent, three workflow steps, own context, discarded on return |
| `beat-draft-workflow` | `createWorkflow` / `.parallel()` / `.dountil()` (max one revise) / `suspend` |
| `artifact-draft` | Same shape, matrix of scopes + budget |
| `fix-inconsistencies` | Already registered |
| Finding typing | `structuredOutput` |
| Humanizer | Author mode + skill, after resume, not a Surgeon agent |
| Episode autonomy | `createDurableAgent` + `goal` — Phase 4, queued verdicts |
| Script vs Novel | Format skill on Author (L2 on mode), not a new Agent class |
| Draft tab | Existing `Phase.WRITING` / `ScriptEditor` — Medium well + ghost complete; section generate calls `beat-draft-workflow` |

**Memory.** Key from `(projectId, episodeId, userId)`. Bound `lastMessages` on every path
including MCP. Expiry Phase 3. Recalled facts never bypass `read_canon`. Populate
`ContextBudgetSection.Memory`.

**One gate, one owner:**

| Decision | Mechanism |
|---|---|
| Is this draft good enough to keep? | Workflow `suspend` |
| May this chat agent mutate CRUD? | Controller tool visibility |
| Persist? | Host, after Approve |
| Has repair stopped helping? | `dountil` no-progress, max one auto-revise |
| Is the episode finished? | `goal` judge, Phase 4 |

---

## 12. Not built yet, and what would justify building it

See [phases.md](./phases.md) Phase 4. Short list: extra critic scopes, Humanizer
fiction-adjusted class, knowledge ledger, object-identity ledger, `promote_rule`, embedding
search, voice stylometry after extractor tests, Kimi/GLM pins after a live run,
`autonomousAuthor` with queued verdicts.

**Phase 5** is not in that ablation list. It is the workspace overlay chat (`§7.6`, Actions 33–38).

**Phase 6** is tests only (unit statements ×1.15, Playwright on storyteller / 2d-canvas / 3d exporter / projects / settings). Tables: [phases.md](./phases.md) §6.1–6.2.

---

## 13. Explicitly not proposed

- A second Mastra instance or Postgres store.
- Registering critic scopes on the Mastra instance as a user-facing roster.
- `@mention` specialists with no server router.
- A `commit_beat` tool on the chat agent.
- Regex prompt-injection as a product P0.
- Five critic scopes as the floor.
- `continuity-sweep` and `autonomous-episode` as “showable” extras (`fix-inconsistencies` is
  the sweep).
- Humanizer on bible cards or character sheets.
- A new Voice settings UI. (Draft mode Script/Novel is page geometry, not Voice.)
- Replacing the Draft tab with chat. The navigator already names it.
- Mounting a second chat tree on every module page (Phase 5 is one overlay).
- Sending a 2d-canvas prompt into a storyteller session without a new session (Phase 5 module lock).
- Any quality claim from a tier that did not invoke the agent.
- Leaving `masterPrompt` as chat-only decoration while GRRM skills own the beat.
