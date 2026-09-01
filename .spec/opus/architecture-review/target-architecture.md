# Nomos — Target Architecture: The Prose Compiler

Design only. No implementation. Baselined on `refactor` @ `b409539`.

An agentic writing system for the Storyteller domain, built on Mastra v1, adapted from the
craft catalog in [wgwtest/novel-writing](https://github.com/wgwtest/novel-writing), and written
to produce **George R. R. Martin–level** longform prose on Kimi K3 / GLM 5.2.

This is the **middle**. Not eleven named job titles. Not the smallest system that can emit a
measurable beat. A showable harness whose extra pieces all come from the craft corpus or from
the GRRM layer that already lives in this repo.

---

## 0. What the previous drafts got wrong

**Job-title draft.** Eleven roles — Conductor, Librarian, Sentry, Cartographer — five of which
were new names for existing code. Renaming `requireAuth` does not create a boundary.

**Over-built draft.** Seven bespoke critic agents, eleven tools, four permission modes, six
workflows. Impressive on a slide, unspecified by measurement.

**Under-built draft.** One critic × three scopes, six tools, two modes, one workflow, four of
ten craft skills. That cut the showable surface *and* parked the George vibe in an appendix,
which was the wrong call: the vibe is a product requirement, and the
[novel-writing](https://github.com/wgwtest/novel-writing) catalog is cheap to keep because
progressive disclosure means a ten-skill index costs ~1k tokens, not 20k.

This draft keeps the ideas that reduce work (one parameterized critic, tools withheld not
refused, plan in code, ablation as the growth rule) and restores the pieces that make the
system *the writing system*: the full craft catalog, three showable workflows, five critic
scopes mapped onto that catalog, and the GRRM layer in the pipeline rather than after it.

---

## 1. Two ideas carry the whole design

### 1.1 Prose is a compiled artifact

> The manuscript is the source tree. Canon is the type system. Critics emit located diagnostics.
> Revision is `build → test → fix`. The editorial verdict is code review. The de-slop pass is
> the last compiler stage: it may change cadence and diction, not facts.

This is not a stretched metaphor. The reference skill already assumes it: its checker prints
`path:line: severity: rule_id: message` and exits `0` clean / `1` error / `2` tool-failure
(ESLint's contract); its review format requires Location, Problem type, What happens now, Why
it fails, Revision direction (a diagnostic with a fix-it hint); every finding asks *"Should
this become a project rule?"* (rule promotion). Project-local rules override the general skill,
the same precedence `CLAUDE.md` has over a generic system prompt.

### 1.2 The floor is chosen; everything above it earns its place

The floor in §2 is not a hypothesis. It is the smallest *showable* system that actually uses
the craft catalog and actually carries the George vibe end to end. Growth past that floor is an ablation
result: turn a candidate off, re-run the golden set, keep it only if quality drops by more
than the noise floor. Evaluation (§10) is how that rule stays honest.

---

## 2. The middle system

| Piece | Count | What it is |
|---|---|---|
| Loop agent | 1 | **Conductor** — the only agent the writer talks to |
| Producer agents | 2 | **Planner** (structure), **Author** (draft, revise, de-slop) |
| Critic agent | 1 | One agent, **run five times in parallel with a different scope** |
| Tools | 8 | `read_canon`, `read_manuscript`, `search_manuscript`, `run_prose_check`, `write_draft`, `brainstorm`, `commit_beat`, `promote_rule` |
| Permission modes | 3 | `read` · `draft` · `commit` |
| Workflows | 3 | `beat-forge` (the compiler) · `continuity-sweep` (episode scale) · `autonomous-episode` (durable showcase) |
| Craft skills | 10 + 2 | All ten [novel-writing](https://github.com/wgwtest/novel-writing) references at L1; six bodies at L2 on every beat, four more when the plan flags them; GRRM `psychology` **at the Planner**, [Humanizer](https://github.com/blader/humanizer) at the de-slop pass (§9) |
| Canon layers | 4 | story facts · character knowledge · author truth · reveal boundary — taken from `story-outline-and-causal-summary.md` §4 |

**Still deferred**, and each names the measurement that would promote it: a sixth and seventh
critic scope (`anchoring`, `realism`), a variant tournament, a canon-map projection, a
`canon-reconcile` job, a separate object-identity ledger. See §13.

---

## 3. The critic: one agent, five scopes

A critic is not a personality. It is **the same agent, given a different `ProblemType` scope
and a different craft skill**, run in `.parallel()`. Five scopes, each mapped onto a document
in the novel-writing package so the catalog is used rather than cited:

| Scope | Looks for | Skill body loaded (L2) |
|---|---|---|
| `continuity` | contradictions against canon, chapter-interface breaks | `scene-causality-and-agency` |
| `causality` | causal-spine breaks, decision ownership, viewpoint overreach | `scene-causality-and-agency` + `planning` |
| `cognition` | leaked author-truth, unequal knowledge, disclosure that changes a choice | `cognition-layers-and-language` |
| `dialogue` | transcript-like talk, decorative gestures, unearned exposition | `dialogue-and-behavior` |
| `style-fidelity` | voice flattened, concrete detail compressed to summary | `style-fidelity` |

`cognition` and `dialogue` are why this is the middle rather than the minimum. They are also
the two scopes that carry the most Martin-like failure modes: a character knowing the hidden
mechanism, and talk that explains instead of concealing.

Three properties matter more than the list.

**It runs in its own context.** A continuity check may read 60k tokens of adjacent chapters
and return 400 tokens of `Finding[]`. Inline, the Conductor would carry all 60k. The test for
a subagent is mechanical: *does it read far more than it returns?*

**`style-fidelity` runs on the diff, not the text.** Its job is to catch the revision loop
making prose worse the way machines make prose worse — clearing findings by deleting the
risky, vivid material. The craft file names this directly: *do not confuse compression with
improvement.*

**Scopes are added by ablation past five.** `anchoring` (`character-introductions`) and
`realism` (`realism-constraints`) are the next two candidates. They get a scope when golden-set
runs show defects of that class surviving these five.

### 3.1 The Finding contract

Copied from `revision-checklist.md`, enforced by `structuredOutput`, used by both model critics
and the deterministic checker so downstream code cannot tell which produced a finding:

```ts
type Finding = {
  location: { beatId: string; paragraph: number; quote: string } // verbatim quote, anchors it
  problemType: ProblemType      // closed enum from the checklist's 13 types
  whatHappensNow: string
  whyItFails: string
  revisionDirection: string
  severity: Severity            // error blocks commit; warning does not
  promoteToProjectRule: boolean
}
```

A finding without a location and a verbatim quote is rejected by the schema. "The pacing is a
bit stiff" is **unrepresentable**. A critic never rewrites: diagnosis and repair stay separate
so a failure has one attributable cause.

---

## 4. Tools

Eight. Each has one job. Mutating tools are absent from earlier modes rather than refused
inside them.

| Tool | Mode | Purpose |
|---|---|---|
| `read_canon` | read | Layer-scoped, budgeted canon retrieval (§6) |
| `read_manuscript` | read | Prose by beat or range |
| `search_manuscript` | read | Literal search — self-repetition, planted images, name collisions |
| `run_prose_check` | read | The deterministic linter. Returns `Finding[]`. **The "run the tests" tool** |
| `brainstorm` | read | Wires the existing Muse agents; `wildcards` is on the schema this time |
| `write_draft` | draft | Writes to the scratch draft — not canon |
| `commit_beat` | commit | Persists draft, trace, cost and canon delta in one transaction |
| `promote_rule` | commit | Turns an approved finding into a persistent project rule |

`brainstorm` is here because the Muse and Muse-ranker **already exist** and are unreachable
only because `wildcards` is missing from `RunBeatDraftInputSchema`. Wiring them is a schema
field and a forward, not a new agent. Absence from the minimum draft made the system look
smaller by hiding working code.

`search_manuscript` is here because the craft catalog's self-repetition and plant/payoff
checks are literal, not semantic. Embedding search is a later candidate, not a floor item.

---

## 5. Permission modes

Three, on the existing `AgentController`.

| Mode | Visible tools | Transitions to |
|---|---|---|
| `read` | the four read tools + `brainstorm` | `draft` |
| `draft` | those, plus `write_draft` | `commit` |
| `commit` | those, plus `commit_beat` and `promote_rule` | (terminal for the turn) |

Two modes was too coarse — a model that can `write_draft` during exploration will. Four modes
(explore / plan / draft / commit) duplicated the workflow stages in the controller. Three
matches the novel-writing stage split: planning, drafting, reviewing — and reviewing's
mutating half is `commit`.

The mutating tools are **absent from the model's tool list** in earlier modes, not
present-and-refused. Same principle as §6: withhold the capability.

---

## 6. Canon: four layers, three depths

### 6.1 The four layers — taken from the craft catalog, not invented here

`story-outline-and-causal-summary.md` §4 already splits information this way. Canon is not
one graph:

| Layer | Contains | Who may retrieve it |
|---|---|---|
| **Story facts** | Pre-story state and events that occur | Everyone |
| **Character knowledge** | What each character observes, infers, misunderstands or conceals, per beat | Scoped per character |
| **Author truth** | The hidden mechanism that keeps the story consistent | Planner and `cognition` / `continuity` scopes only |
| **Reveal boundary** | What the audience may confirm by the end of this arc | Planner, those two scopes, editorial gate |

> **The Author drafting a POV beat gets story facts plus that character's knowledge, and is
> not given author truth.**

That single rule is the structural half of the George vibe. Dramatic irony is a retrieval
permission, not a prompt that says "write with dramatic irony." Same reasoning as row-level
security: you do not ask the caller politely not to read another tenant's rows.

### 6.2 Three retrieval depths — adapted from the catalog's L0–L4

The catalog's five-level LOD is more than the floor needs. Collapse to three, keep the rules:

| Depth | Catalog analogue | Content | Default |
|---|---|---|---|
| **Task** | L0 + L1 | This beat's plan and brief, plus hard constraints: bible, timeline, project rules | Always |
| **Near** | L2 | Full prose for this beat and its neighbours | When revising language or continuity |
| **Far** | L3 | Chapter cards — compressed structure, not prose | When structure is the question |

L4 (cold zone / unrelated future prose) stays excluded. Two rules transfer verbatim: **prose
outranks cards** when they disagree; **future prose is excluded** unless a declared continuity
dependency requests it.

### 6.3 Voice fingerprints — the character card carries how they sound

The character layer currently answers *what this person knows*. It must also answer *how this
person talks*, because four separate prompt files demand distinct voices — `anti-slop`,
the storyteller skill, the Martin skill, and the prose critic — and nothing in the schema or the
scorer set can tell whether the demand was met. The `characters` row has no column for it
(`core-tables.ts:34-60`); a vestigial optional `voice` on a legacy update schema
(`action-character-schemas.ts:21`) maps to nothing.

A fingerprint is four small fields on the card: **register** (formal, blunt, evasive, ornate),
**sentence habit** (long subordinated clauses versus clipped fragments), a short **favoured and
forbidden lexicon**, and two or three **sample lines**. Nothing generative — a reference the
Author is handed and a scorer can check against.

It inherits the retrieval rule from §6.1 without amendment: **the Author drafting a scene gets
the fingerprints of characters present in that scene and no others.** A cast list of twenty
voices in the prompt is how voices blur; four is how they stay separate. The fingerprint is
story-facts-tier data, not author truth — a character's diction is observable, so nothing about
it needs hiding.

Measurement is deterministic and belongs to Tier 0. `self_repetition` already computes a
distinct-3-gram ratio across a beat set; the same computation run **across speakers instead of
across beats**, scored on the *closest* pair rather than the average, is a voice-convergence
metric that needs no judge. The prerequisite is a dialogue extractor: script output already
carries cue structure, but it is persisted as free prose in `beats.content` and
`episodes.scriptContent`, so per-speaker lines have to be parsed back out. That extractor is a
pure function and lives in `core/`. Action 32; evaluation detail in `evaluation.md` §3.7.

---

## 7. Skills: the whole catalog, paid for only when used

The [novel-writing](https://github.com/wgwtest/novel-writing) package is 1,218 lines across
ten reference documents (1,434 with the root `SKILL.md`). Injected naively into every critic
call that is ~15–20k tokens, mostly irrelevant. Progressive disclosure — the catalog's own
working pattern, steps 1–4 — is the fix:

| Level | Content | Loaded | Cost |
|---|---|---|---|
| 1 | `name` + `description` for every skill | always | ~100 tokens each, ~1.2k for the full catalog |
| 2 | The skill body | when a scope, stage, or `forbiddenMistakes` entry matches | ~2k, one skill |
| 3 | Deep reference sections; scripts **run** rather than read | when a specific finding needs it | 0 until used |

**All ten catalog skills sit at L1.** Cutting the catalog to four was a misunderstanding of
the cost model. The index is cheap; the bodies are expensive; disclosure is the whole point.

L2 owners and load triggers — the first six load on every beat, the last four only when the
plan flags them:

| Skill | Owner and trigger |
|---|---|
| `planning` | Planner, every beat; `causality` scope |
| `scene-causality-and-agency` | `continuity` and `causality` scopes |
| `cognition-layers-and-language` | `cognition` scope; Author when the beat's POV is being deceived |
| `dialogue-and-behavior` | `dialogue` scope |
| `style-fidelity` | `style-fidelity` scope, and the de-slop pass |
| `revision-checklist` | synthesis step before the editorial gate |
| `story-outline-and-causal-summary` | when the beat sits on an arc boundary |
| `character-introductions` | when the plan flags a first appearance |
| `scene-and-structure` | when the plan flags a chapter-shaped beat |
| `realism-constraints` | when the plan flags an institutional / bodily / crowd constraint |

**Adapt, do not vendor.** Hygiene checks that test Chinese quotation balance and `第N章`
titles get rewritten. The taxonomy, the Finding format, the four-layer canon, the hard rules
(naked character entry, access limits, embodied dialogue, style protection) transfer.

The convention already exists in this repo — `grrm-author` carries `skills/psychology/` and
`skills/anti-slop/` — but they compose unconditionally into every author call today. Disclosure
is one missing piece; **ownership is the other**, since §9 reassigns `psychology` to the Planner
and replaces `anti-slop` with Humanizer at the de-slop pass.

---

## 8. Three workflows you can show

### 8.1 `beat-forge` — the compiler, and the one that carries the de-slop pass

```
plan ─▶ [gate: concreteness + Law of Motion] ─▶ draft ─▶ run_prose_check (free)
                                                            │ errors → back to draft
                                                            ▼
                                                 critics ×5 (parallel, isolated)
                                                            │
                                                      synthesize
                                                            │
                                                ⏸ editorial verdict (suspend)
                                                            │
                                      approve │ revise ↺ │ kill
                                                            │
                                                 **de-slop pass**
                                                            │
                                                claim check ─▶ commit_beat
```

The parts doing real work:

**Deterministic checks run before any critic.** A draft with a mechanical defect costs zero
model calls. This is `tsc` before code review. The catalog's `check_manuscript_text.py` is the
shape; the rules get rewritten for this manuscript convention.

**Intermediate state lives in step outputs, not in a context window.** The plan, draft, five
critic reports, revision and de-slop pass never accumulate in the Conductor.

**The revision loop is `.dountil()` with three exits:** clean, budget spent, or **no
progress** (findings unchanged). The `style-fidelity` scope runs on each iteration's diff.

**The de-slop pass runs last and cannot change facts.** Voice is already in the draft — the
Author *is* the GRRM agent (§9.2) — so this stage is not where the vibe arrives. It removes
the machine tells that survived drafting and revision: banned phrases, labelled emotions,
purple compensation. It is an Author mode behind a frozen-claim check: it may re-order,
re-cadence and re-word; it may not add, drop or alter a fact. The ordering constraint runs one
way only — a de-slopper placed *before* the prose exists has nothing to clean, and one that
ignores the project's declared register flattens the voice the master prompt asked for. Hence:
tone at drafting, de-slop at the end, with `masterPrompt` as the de-slopper's reference (§9.3).

**The editorial verdict is a workflow `suspend`** — durable in Postgres, resumable from route,
Studio or script.

**Law of Motion is a planner gate, not a prompt.** Every beat plan must fill `actionTaken`,
`consequence`, `storyStateChange` as concrete fields — this already exists in
`src/mastra/agents/grrm-author/instructions.md`. Vague phrases ("tension rises") fail the
concreteness gate the way they do today in `PlanEvaluationSchema`.

### 8.2 `continuity-sweep` — episode scale, extending code that exists

`fix-inconsistencies` already does a project-scoped continuity pass. The target is that
workflow plus: layer-scoped `read_canon`, the `cognition` and `continuity` scopes in parallel
per beat, and a merged `Finding[]` the writer can approve as a batch. This is the diagram you
put on a slide — fan-out with isolated context, orchestrator cost independent of corpus size.

### 8.3 `autonomous-episode` — the durable-agent showcase

`storyteller-autonomous-author` already wraps `createDurableAgent` + `goal`. Keep it. The
hazard to close: a loop that sets `autoApprove: true` to keep moving recreates the defect
where the editorial gate is a property of the caller. Unattended operation is a **declared,
authorized mode** whose verdicts queue for later human resolution.

### 8.4 The chat surface — settled

The pipeline surfaces **entirely inside the existing chat component**, following the pattern
already shipping in `AssistantToolFallback`: a short status line always, structured detail only
when the debug toggle (`AssistantChatDetailsContext.showDetails`, flipped from the composer) is
on. No new panel, no new dialog.

| Decision | Behaviour |
|---|---|
| **Progress** | One line, updated in place: `Planning` → `Drafting` → `Critics` → `Revising`. Not a growing checklist |
| **Verdict prompt** | One-line summary plus the three buttons; the draft expands on click |
| **Revise note** | Choosing `Revise` reveals an inline text box; its content becomes the workflow `note` |
| **Timeout** | None. The gate waits indefinitely — no auto-approve |
| **Critiques** | Behind the debug toggle only |

Four of the five are **edits to wired code, not new components**. `emitVerdictGateIfSuspended`
(`stream-chunk-tool-result-wire.ts`) already emits the three options over the published
`questions` frame, `QuestionCard` already renders them, and the resume route already accepts
`additionalFeedback` and maps it to `note`. What must change:

1. **Connect the last mile.** `resumeChatWorkflow` in `chat-ui.api.ts` is defined and never
   called, so an answered verdict currently reaches nothing and the run stays suspended.
2. **Carry the summary and draft** in the emitted frame. It forwards neither today, so the
   decision would otherwise be made blind.
3. **Allow a note on a choice option**, which `single_choice` does not support — `freeText` is
   exposed only for `FREE_TEXT` in `useQuestionCardState`.
4. **Drop `timeout: 120` and `defaultOption: 'approve'`**, which today auto-approve an unseen
   draft two minutes after the prompt appears.

Only **progress** is genuinely new work, and it is not a UI problem: the pipeline is a single
`run_beat_draft_workflow` tool call, so the chat can only ever show one badge for the whole run
until the workflow emits step events outward. Those events are the same `role.dispatch` records
Action 3 specifies for the trace — the status line is a second reader of the trace, not a
parallel mechanism, so it arrives with the eval work rather than ahead of it.

---

## 9. The George vibe — structure, not tone

**Martin governs the planning layer; the user governs the voice.** This is the central
decision of this section, and it settles a conflict the earlier drafts carried.

The vibe is what makes the *story* Martin-like — a world with real political complexity, many
characters who want incompatible things, reversals that were planted rather than sprung,
consequence that lands on whoever earned it. None of that is prose style. It is all decided
before a sentence exists, which means it belongs to the **Planner**, and it is largely
checkable by machine (§9.1).

Prose **tone** is the user's. It comes from `masterPrompt`, an existing field on both the
projects and episodes tables, edited in the sidebar and already assembled into the system
context as a `=== MASTER PROMPT ===` block by `context-assembly-service.ts`. A project whose
master prompt asks for dry comic noir gets dry comic noir — structured like Martin, sounding
like the user asked (§9.2).

The final pass removes machine tells, using **Humanizer**, and takes the user's tone as its
reference so it cannot sand off the voice it was told to preserve (§9.3). The rubric that says
whether any of it worked is §9.4.

Three layers, three owners:

| Layer | Owner | Where |
|---|---|---|
| **Structure** — world, cast, reversals, consequence | Martin | Planner, before prose exists |
| **Tone** — register, cadence, diction | The user's `masterPrompt` | Author, at drafting |
| **De-slop** — AI tells | Humanizer | Late pass, fact-frozen |

The old model put Martin's *voice* in the drafting prompt and left tone unconfigurable. That
made every project sound the same and put the de-slop pass in direct conflict with the voice
pack — the de-slopper stripping the idiosyncrasies drafting had just paid for. Separating
structure from tone dissolves that: the de-slopper is no longer arguing with Martin, it is
enforcing "not machine-sounding" against a target the user declared.

### 9.1 Structure — the Martin layer, enforced by the harness, testable without a human

| Martin property | Enforced by | Catalog source |
|---|---|---|
| Strict limited-third POV | `povLimit` on the plan; `causality` flags viewpoint overreach | `scene-causality-and-agency` |
| Dramatic irony from unequal knowledge | Layer-scoped retrieval (§6.1); `cognition` scope | `cognition-layers-and-language` |
| Sensory, material concreteness | Deterministic concrete-noun density + `style-fidelity` on the diff | `style-fidelity` |
| Reveal discipline | Reveal boundary is declared data; confirming past it is a `Finding` | `story-outline-and-causal-summary` §4 |
| Motion over mood | Law of Motion fields on every plan; concreteness gate | existing `grrm-author` instructions |
| Characters who want incompatible things | `psychology` skill **at the Planner**; `causality` scope on the plan | `psychology`; `scene-causality-and-agency` |

These six are engineering. They can fail a test. They are the reason a George-level system is
buildable rather than hoped-for. None of them constrains how a sentence sounds.

**`psychology` moves from the Author to the Planner.** Its content — habits, denied desires,
blind contradictions, delayed cost — is character and plot construction, not prose texture. It
was only ever in the drafting prompt because the whole pack was concatenated there. At the
Planner it shapes what the beat *is*; at the Author it merely flavoured how it read.

### 9.2 Tone — the user's, from `masterPrompt`

**Start from what is true.** `beat-draft-default-deps.ts` routes both the `draft` and `revise`
steps through `statelessGrrmAuthor`, whose instructions `compose-instructions.ts` assembles by
unconditionally concatenating `skills/psychology/SKILL.md`, `skills/anti-slop/SKILL.md` and the
code-generated banned-phrase list. So a fixed Martin-flavoured pack is applied to every project,
on every draft and every revision, regardless of what the project asked for.

That is the defect. `masterPrompt` already reaches the same call through a different door —
`context-assembly-service.ts` resolves it from the project, bible or story plan and formats it
into the system context — so a project asking for a light comic register currently receives that
request *and* an unconditional instruction set pulling the other way, with no rule about which
wins.

The target inverts the priority:

| Input | Role |
|---|---|
| `masterPrompt` | **Authoritative** for register, cadence, diction, person and tense |
| `psychology` | Gone from drafting — it is a Planner input now (§9.1) |
| `anti-slop` | Gone from drafting — it is the de-slop pass, and Humanizer supersedes it (§9.3) |
| Base author instructions | Craft floor only: concrete nouns, motion over mood, no author-truth leakage |

What remains in the drafting prompt is the part that is true of *good prose in any register*.
Everything that encodes a particular taste moves out — up to the Planner if it is structural,
down to the de-slop pass if it is a defect filter.

**Scope of authority — the guardrail this promotion requires.** `masterPrompt` is user-authored
text interpolated raw into `buildSystemContextBlock`, unsanitized, uncapped, and placed **last**,
after every hard rule, in the same undifferentiated block. That is tolerable while it is framed
as reference context. Promoting it to authoritative is not, unless its authority is bounded:

| The master prompt governs | It never governs |
|---|---|
| Register, cadence, diction | What is true — canon facts |
| Person and tense | What a character knows — layer scoping (§6) |
| Vocabulary preferences and banned phrasings | What may be revealed — the reveal boundary |
| Which Humanizer pattern classes are suppressed (§9.3) | What may be written or committed — permission modes (§5) |
| | The entity-link requirements and structural floor |

Stated as one rule: **structure and facts outrank tone, always.** Without it, "the user sets the
tone" degrades into "the user sets everything", and the layer scoping that makes the dramatic
irony work is exactly what a stray instruction would dissolve. This is a domain rule and must be
enforced in the application — §11.1 explains why the gateway cannot do it for you.

**The per-project overlay** is then simply the master prompt doing its job, with absence as the
identity function: a project that sets nothing gets the craft floor and a neutral register,
not somebody else's voice.

### 9.3 De-slop — Humanizer, with the user's tone as the reference

The late pass uses [Humanizer](https://github.com/blader/humanizer): 35 patterns drawn from
Wikipedia's *Signs of AI writing*, maintained by WikiProject AI Cleanup, MIT-licensed and
distributed as plain Markdown, so it loads through the existing skill mechanism. It supersedes
the hand-grown `anti-slop-phrases.ts` list, which `evaluation.md` §3.6 already flags for
demotion as trivially overfit negative-corpus matching.

Two of its properties are why it is the right choice rather than merely an available one:

1. **It already states the claim check.** "A name, number, date, quote, citation, or other
   factual detail must come from the source or the writer." That is exactly the fact-freezing
   constraint this architecture specified independently — the pass may re-order, re-cadence and
   re-word, never add or alter a fact.
2. **It takes a writing sample as an override.** Given a sample, it follows that sample's
   rhythm, word choice and punctuation *instead of its default style rules*. That is the seam
   that makes it safe here: feed it the project's `masterPrompt` plus recently accepted beats,
   and it de-slops toward the user's declared voice rather than toward neutral encyclopedic
   prose.

**Not all 35 patterns apply to fiction, and applying them blindly would be a bug.** Several
target reference and technical writing: #14 strips em-dashes, #31 removes "forced punchlines and
fragments", #32 kills "formulaic sayings". A deliberate fragment and an aphorism are load-bearing
in the register this system exists to produce. The patterns therefore split three ways:

| Class | Examples | Treatment |
|---|---|---|
| **Always on** — machine tells in any register | #20 chatbot text, #21 knowledge-limit disclaimers, #22 agreeable tone, #23 filler, #24 stacked qualifiers, #7 overused AI words | Applied unconditionally |
| **Fiction-adjusted** — real defects, softer threshold | #1 inflated importance, #3 shallow -ing analysis, #4 sales language, #10 forced tricolons, #25 generic positive endings | Applied, calibrated against the project's accepted beats rather than a fixed rule |
| **Suppressed by default** — style, not defect | #14 dashes, #31 fragments, #32 sayings, #27 deeper truth, #33 fake-candid openings | Off unless the master prompt asks for plain register; the writing sample governs |

The disputed middle is settled by ablation, not argument — the harness in
`evals/experiments/wildcards-ab.ts` is the template, and `s8-slop-rate` plus `s9-self-repetition`
already measure the outcome.

### 9.4 How you know the vibe is present

The split changes what is measured, because the three layers make different claims and a single
"is this Martin?" score would now be answering the wrong question — a project that asked for
comic noir should *not* read like Martin, and penalising it for that would be a broken
instrument.

| Layer | Claim | Measured by |
|---|---|---|
| **Structure** | The story has Martin's properties | Pairwise judge on the **plan and beat** with the GRRM rubric: political consequence, withheld author-truth, cast interdependence, reversal planting, Law of Motion completeness |
| **Tone** | The prose matches what the user asked for | Fidelity of the draft to `masterPrompt` — a `style-fidelity` scorer whose reference is the declared register, not a fixed voice |
| **De-slop** | Machine tells are gone and no fact moved | `s8-slop-rate` and `s9-self-repetition` on the diff, plus a claim check that fails the pass if any name, number, date or quote changed |

All three are pairwise, position-counterbalanced, and judged by a family that is not the
author's. A vibe you cannot measure is a prompt.

**Voice distinctiveness sits underneath all three and is measured separately, for free.** It is
not a fourth layer of the George split — every register wants its characters to sound like
different people, so it is not the user's choice the way tone is, and it is not Martin's
signature the way withheld author-truth is. It is craft the whole system already demands in
four prompt files and checks nowhere. Because it is deterministic (§6.3) it runs at Tier 0 on
every commit rather than waiting for a judge, and it is a **precondition** for the structure
claim above: cast interdependence measured on a cast that all talks alike is measuring
nothing.

**The first measurement is still the one nobody has taken.** The existing pack — psychology and
anti-slop concatenated into every draft — has never had a number attached to it, because
`evals/run.ts` scored a frozen `referenceOutput`. Before moving anything, draft the golden set
twice: once as it ships today, once with the pack removed. That tells you what the current
arrangement is worth, and it is the control against which the split has to justify itself. One
eval run, and it is more informative than any new stage.

---

## 10. Evaluation — how you know any of this works

`evaluation.md` is the full treatment. Summary:

| Tier | Proves | Models | Cost | Runs |
|---|---|---|---|---|
| **0 · Deterministic** | Schemas, tools, POV-leak, Law of Motion, distributional shape, voice convergence | none | free | every commit |
| **1 · Contract** | The right things were called, in the right order | stubbed | free | every commit |
| **2 · Calibration** | The measuring instrument works | real | $ | on scorer change, nightly |
| **3 · Live quality** | The writing is actually good, including the GRRM rubric | real | $$ | before a change ships |

Only Tier 3 may claim quality, and only after Tier 2 passed. Today's `evals/run.ts` scores
`example.referenceOutput` — a frozen string — so no prompt, tool, model or voice-pack change
can move the number. That is the defect this section exists to kill, and it is why the GRRM
skills have shipped in every draft for months with no evidence either way.

**Trace-contract assertions that are specific to this floor:** five scopes dispatched and
overlapping; `style-fidelity` received a diff; the de-slop pass ran after the last revision and
before `commit_beat`, and the claim check found no fact delta; `read_canon` for the Author
contained no author-truth row and returned voice fingerprints only for characters present in
the scene; every agent call carried a thread and resource id, and no two projects produced the
same thread key; `brainstorm` is reachable when the plan asks for wildcards; a `kill` emits no
`persist.commit`.

**Ablation still decides growth past the floor.** The five scopes, the Planner's `psychology`
intake, the de-slop pass and `brainstorm` are each switchable, as is each disputed Humanizer
pattern class. If a piece cannot beat its noise floor on the structural rubric, that is a
packing problem, not a reason to drop the product requirement — fix the pack. The one ablation
that is overdue rather than speculative is the current unconditional pack itself (§9.4).

---

## 11. Models

| Role | Model | Rate per 1M | Why |
|---|---|---|---|
| Author (draft, revise, de-slop) | `moonshotai/kimi-k3` | $3 / $15 | 1M context; top-tier on creative-writing leaderboards (**verify the current standing before committing — this is the one number here not checked against the repo**). Prose is the product |
| Conductor, Planner, all critic scopes | `z-ai/glm-5.2` | ~$0.95 / $3 | 1M context, `reasoning_effort` high/xhigh, strong tool calling. Five scopes stay affordable |

**Half of this is already true.** `AGENT_MODEL_MATRIX` pins `author` and `chat` to
`moonshotai:kimi-k3`; `z-ai/glm-5.2` is in the catalog. The change is `planner` (currently
Opus) and `critic` (currently Haiku). Five scopes on Opus is unaffordable; on Haiku they are
unreliable.

Every model is a role pin through `resolveRoleModel(role)`. The trace records the **effective**
model after `enforceTextGenModelPolicy`, which already remaps some Anthropic text models to
Kimi.

Five critic scopes over ~20k tokens each on GLM 5.2 is roughly **$0.10 per beat** for the
critic wall. The Author's draft, revision and de-slop passes dominate — the right place for
the money.

### 11.1 Gateway guardrails — enforce policy at OpenRouter, not in userland

Every call already leaves through one `OPENROUTER_API_KEY`
(`models.ts` — "one key to rule them all"), which makes
[OpenRouter Guardrails](https://openrouter.ai/docs/guides/features/guardrails) the correct place
for the policies this repo currently enforces in application code or not at all. Guardrails are
workspace-scoped objects assigned to keys or members, provisioned through the Management API, and
they take effect **without a code change**.

| Policy | Guardrail field | Replaces |
|---|---|---|
| Model pins are procurement rules, not code | `allowed_models` / `ignored_models` | `enforceTextGenModelPolicy`, which today remaps Anthropic ids to Kimi in userland and logs a warning |
| Hard spend ceiling | `limit_usd` + `reset_interval` | Nothing — app-side accounting (Action 6) measures cost but cannot stop it |
| Unpublished IP must not be retained | `enforce_zdr_anthropic` / `_openai` / `_google` / `_other` | Nothing. For a product holding users' unpublished fiction this is closer to a requirement than a setting |
| Injection defence on user-authored text | `content_filter_builtins: [{slug: 'regex-prompt-injection', action: 'block'}]` | Nothing — `masterPrompt` is interpolated raw (§9.2) |

**Two cautions, both specific to this product.**

The built-in sensitive-info filters are **actively harmful here** if enabled indiscriminately.
`person-name` and `address` redaction would mangle character names and fictional places on every
call — the payload is invented people in invented locations, which is exactly what those filters
are built to catch. Use `secrets`, `credit-card` and `ssn`; leave the narrative-shaped slugs off.

More importantly: **gateway guardrails do not close the precedence gap in §9.2, and must not be
mistaken for it.** They govern the account and the transport — which models, how much money, what
gets retained, does this text look like an injection string. They cannot express "the master
prompt may govern register but never canon facts", cannot verify the de-slop claim check, and
cannot enforce author-truth layer scoping, since that is decided by which rows the app puts in the
prompt before OpenRouter sees anything. No regex knows which of your invented facts is a secret.

Two layers, two owners: **OpenRouter guards the account; the application guards the narrative
contract.** Adopting the first is cheap and worth doing now. It does not reduce the work of the
second.

---

## 12. Mastra v1 mapping

| Design element | Mastra primitive |
|---|---|
| Conductor loop | `Agent` with bounded `maxSteps` |
| Three permission modes | `AgentController` — `availableTools` per mode, `transitionsTo` between them |
| Critic isolation | One `Agent`, five workflow steps, own memory thread each, discarded on return |
| `beat-forge` | `createWorkflow` / `createStep`; `.parallel()` · `.dountil()` · `.branch()` |
| `continuity-sweep` | Same, fan-out per beat; extends `fix-inconsistencies` |
| Editorial verdict | Workflow `suspend` with `suspendSchema` / `resumeSchema` |
| Finding typing | `structuredOutput` — never `format`, never `z.any()` |
| Skills | Extend `src/mastra/agents/<id>/skills/` with on-demand resolution |
| De-slop pass | A second Author mode inside `beat-forge` — the GRRM agent is already registered and already drafts, so this adds a stage, not an agent |
| Episode autonomy | `createDurableAgent` + `goal` — already built |

**Memory stays small — and has to actually be applied.** `lastMessages: 10` is written in three
agent constructors and one shared helper, but the production chat never passes
`memory: { thread, resource }` to `agent.stream()`, so on the path users hit, the window is
configuration that nothing reads. Making it real requires three decisions that a `Memory`
constructor does not force you to make, and which the repository currently answers differently
in every place it answers them at all:

| Decision | Target | Today |
|---|---|---|
| **Key** | One helper deriving thread + resource from `(projectId, episodeId, userId)`, so the key is unique per tenant and Action 1's ownership check covers it | Unbound on the chat path; `episodeId ?? 'storyteller-autonomous'` — one shared name — on the autonomous route; a fresh `thread_${Date.now()}_${random}` per call in the CRUD helper |
| **Bound** | Ten messages, applied on every path including MCP | Declared in three constructors, exercised by one call site; `src/mcp/agent.ts:12` omits it entirely |
| **Expiry** | A message TTL and a per-thread cap, enforced by a scheduled task against tables a migration owns | Nothing. `PostgresStoreVNext` creates `mastra_*` at runtime, no migration names them, and the only `deleteThread` sits on a class with no instantiation site |

Canon still lives in Postgres and is reached through `read_canon`. That constraint is what makes
a small window affordable: **a remembered fact has bypassed the four-layer permission model**,
so memory carries conversational continuity and never story truth. The cost of what it does
carry becomes visible by populating `ContextBudgetSection.Memory`, which exists in
`token-budget.ts:31` and is never written, and recording recalled-message tokens as their own
field beside assembled-context tokens. Action 31.

**One gate, one owner:**

| Decision | Mechanism |
|---|---|
| Is this draft good enough to keep? | Workflow `suspend` |
| May this agent mutate anything? | `AgentController` mode |
| Has repair stopped helping? | `dountil` no-progress |
| Is the episode finished? | `goal` judge, bounded by `maxRuns` |

---

## 13. Not built yet, and what would justify building it

| Deferred | Build it when |
|---|---|
| `anchoring` critic scope | Golden-set first-appearance beats fail the introduction checklist after the five existing scopes |
| `realism` critic scope | Institutional / bodily / crowd beats score materially worse on Tier 3 |
| Variant tournament | Cost-per-quality shows N-variant selection beats one draft + revision + George |
| Character-knowledge ledger table | `cognition` cannot express per-beat state on the current `characters` row |
| Object and identity ledger | Golden-set runs show object-duplication defects |
| `canon-reconcile` | Measured drift between chapter cards and committed prose |
| Four permission modes | A leak shows three are insufficient |
| Embedding search | `search_manuscript` literal misses a class of plant/payoff the golden set cares about |
| Structured dialogue persistence | §6.3's extractor shows parsing dialogue back out of free prose is the fragile part |
| A voice **judge** rubric | The deterministic convergence metric flags a failure that needs explaining, not just detecting |
| Semantic recall on memory | The bounded window in §12 measurably loses context a run needed |

---

## 14. Explicitly not proposed

- A second Mastra instance or Postgres store.
- Registering critic scopes on the Mastra instance — they are workflow-internal.
- A separate "Surgeon" agent. Revision is an Author mode, so a beat keeps one voice.
- A banned-word slop list as a **gate**. Distributional metrics plus the anti-slop skill as a
  pass; `slop_rate` stays one signal among many.
- Model-committed canon. A model may propose a delta; validated code commits it.
- Any quality claim from a tier that did not invoke the agent.
- Leaving the George vibe as *only* a system prompt, which is what it is today: two skill
  bodies concatenated into the author's instructions, unmeasured. Voice stays in that prompt —
  that is the right place for it — but the vibe is also a retrieval rule, a critic scope, a
  planner gate, a de-slop stage, and a judged rubric.
- Rebuilding the GRRM author. It exists, it is registered, and it drafts every beat. The work
  is disclosure, a claim check, and a number — not a new agent.
