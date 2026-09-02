# Nomos — Evaluation and Test Architecture

How the Storyteller pipeline is tested, and how prose quality is measured. Companion to
`target-architecture.md`. Baselined on `refactor` @ `b409539`. **Build order:** [phases.md](./phases.md).
**Floor:** three critic scopes, Humanizer after verdict, host persist, 180s / one auto-revise.
Regex prompt-injection is not an eval or product P0; account guardrails (ZDR, spend, allowlist) are.

---

## 1. The problem this document solves

Today's headline eval is not measuring the agent. `evals/run.ts:211` sets the scored text to
`example.referenceOutput` — a frozen string from the dataset. The runner never invokes an agent,
so **no prompt, tool, model or orchestration change can move the score.** The gate above it is
well built, which makes the name actively dangerous: a green `eval:gate` is read as "the writing is
good" when it means "the fixtures still parse and the judge still agrees with itself."

That single defect explains the shape of everything below. The rule it produces:

> **A tier may only make the claim its inputs support. If the agent did not run, no output of the
> run may be called agent quality.**

There is a second, subtler problem. Most teams build exactly one eval tier — the expensive
model-judged one — and call it "evals". That tier is the slowest, costliest and least reliable of
the four, and it catches the fewest bugs per dollar. The value is inverted:

| Tier | Catches | Cost | When |
|---|---|---|---|
| **0 — Deterministic** | Most defects | $0 | Every commit, <5s |
| **1 — Contract (stubbed models)** | Every orchestration bug | $0 | Every commit, <30s |
| **2 — Scorer calibration** | Broken measurement | $ | On scorer/prompt change, nightly |
| **3 — Live quality** | Genuine quality regressions | $$ | Explicit, before a change ships |

Tiers 0 and 1 should catch the overwhelming majority of real failures. Tier 3 exists to answer one
question — *did this change make the writing worse?* — and it can only be trusted if Tier 2 has
proved the instrument works.

---

## 2. The four tiers

This taxonomy is canonical. `target-architecture.md` §9 summarises it; `actions.md` Track C
(Actions 18–23, 29, 32) is the work broken into tickets. Where they appear to disagree, this
document wins on measurement; `target-architecture.md` wins on the honest floor (three scopes,
host persist, Humanizer after verdict).

### Tier 0 — Deterministic, no model, every commit

Two families. **Harness correctness**: schemas reject malformed findings and plans; the linter
emits exactly the expected diagnostics on golden inputs; `read_canon` layer scoping holds.
**Prose properties**: everything in §3, which is the substantial part — including voice
convergence (§3.7), the one quality most people assume requires a judge and does not.

Runs in the unit suite. No network, no keys, no flakiness, no cost.

### Tier 1 — Contract tests with stubbed models, every commit

Drive the **real workflow** with injected deps returning canned structured output, and assert on
the run trace. This is where "did the right agents and tools fire" is answered (§4). It requires
no model and no network, so it belongs in the commit gate rather than in a nightly job.

The existing `BeatDraftDeps` injection seam already makes this possible — `createBeatDraftWorkflow(deps)`
is exactly the right shape, and the workflow tests already stub it.

### Tier 2 — Scorer calibration, on change and nightly

Model calls, but against **frozen inputs**. Answers *does the measuring instrument work* (§5), not
*is the writing good*. Skipping this tier is why eval suites lie: an uncalibrated scorer produces
numbers that move, and movement gets read as signal.

### Tier 3 — Live quality, explicit invocation only

The real pipeline, real models, a **scratch project** — never a real one. Generates, **persists
output and trace**, then scores. The only tier permitted a quality claim, and the only one that
may be named `agent-live-quality`.

**Naming is a safety property.** Three commands that cannot be confused:
`eval:scorer-fixture` (today's behaviour, honestly named), `eval:agent-contract` (Tier 1),
`eval:agent-live-quality` (Tier 3).

---

## 3. Deterministic narrative checks — the payoff for structured canon

This is the most valuable section in the document, and it exists **only because** the plan is a
schema and canon is layered. A design where canon is a blob of prose can do none of it.

Each check emits the same `Finding` shape a critic emits, so downstream code cannot tell whether a
finding came from a model or from code — and the cheap one runs first.

**Read this section as wiring, not invention.** Four of the eight checks below already exist in
some form — §3.2 and §3.3 are largely built, §3.6 has eight scorers shipping. Their problem is
placement, not absence: they run offline over dumped episodes, or inside a separate audit
workflow, rather than in the draft path where they would stop a defective beat before it costs a
model call. Two are genuinely new: §3.1, which the layered canon model makes possible for the
first time, and §3.7, which needs a dialogue extractor the repository does not have.

### 3.1 POV leak detection — the single best check in the system

**The question:** does this draft assert something the viewpoint character has no basis to know?

That is the classic failure the craft material names *author-omniscience leak*, and it is normally
a matter of editorial judgement. Here it is largely computable, because §6.3 of
`target-architecture.md` stores author truth and per-character knowledge as separate layers.

Two variants, and the distinction matters:

**Strictly deterministic (cheap, high precision, partial recall).** Match proper nouns and
canonical phrases in the draft against rows that exist **only** in the author-truth layer and not
in story facts or this POV's ledger. Catches literal leaks — naming the secret, using a true name
the character has not learned, referring to an event they did not witness. No model, milliseconds,
runs on every draft. It will not catch a leak that paraphrases.

**Model-assisted, deterministically checked (higher recall).** A cheap extraction pass lists the
propositions the passage asserts; **the matching against the ledger is code.** Only extraction
uses a model, and extraction quality is itself measurable against a golden set — so the check
degrades honestly rather than silently.

The important property: this is a **grounding check for narrative**, structurally the same as a
hallucination check for RAG, and it turns the system's most distinctive quality claim — real
dramatic irony — into a test rather than a hope.

### 3.2 Causal spine completeness — no model, and mostly already built

The craft material's test is *if removing one event would not change the next decision, the bridge
is missing.* The computable form is graph analysis over the `causalDependencies` column on the
`beats` table — and `evals/structural/s1-causal-graph.ts` **already does most of it**, reporting
`shareNonEmptyCausal`, `orphanCount` (a beat after the first with no dependency — an unmotivated
event), `forwardDependencyCount` (a beat depending on a *later* beat — impossible causality),
`multiDependencyCount`, `maxInDegree` and `plainChain` (a purely linear 1→2→3 spine, which is a
genuine weak-plot signal).

Two gaps, both small:

- It builds the in-degree map but **never reports zero-in-degree beats**. A beat nothing depends
  on, that is not the climax or resolution, is a **dropped thread** — the mirror image of
  `orphanCount` and the more interesting of the two. The data is already computed; only the
  reporting line is missing.
- It runs offline over a dumped episode. It is not wired into the pipeline as a pre-critic gate,
  which is where it would actually prevent a wasted model call.

### 3.3 Plant → payoff closure — no model, already built twice, on two schemas

This check exists **twice**, and neither implementation uses the table designed for it:

| Implementation | Method | Emits |
|---|---|---|
| `evals/structural/s3-setup-payoff.ts` | Lexicon phrase-matching over prose | `lateClimaxIntroductionCount` — an entity first mentioned late that carries the climax, i.e. a deus ex machina detector |
| `services/consistency-service.ts` | Graph check on the `beats.setupsPayoffs` jsonb | `MissingPayoff` and `OrphanedSetup`, already carrying severity, description, location and a suggested fix |

The second is close to the `Finding` shape already, which is a good sign for §3's premise.

**The finding here is schema duplication.** `src/db/schema-parts/core-tables.ts` declares a
`setups` table with `setupBeatId`, `payoffBeatId` and `isResolved` — and **nothing queries it**. It
is dead schema sitting beside a live jsonb representation of the same concept. Two
representations of one idea, one unused, is how the two drift and how a check silently starts
reading the wrong one. Pick the relational table, migrate the jsonb into it, and delete the loser;
`isResolved` plus a payoff window is strictly more queryable than a jsonb pair.

### 3.4 Object and identity consistency — no model

From the craft material's object audit: ownership before and after every transfer, whether two
similar objects are actually distinct, who knows about a transfer, what capability the object had
at the time. Report ownership changes with no transfer event, a capability used after it was lost,
and two entities sharing a name with different lineage — the *object duplication* failure mode.

### 3.5 Chapter interface continuity — no model

Beat N's exit state against beat N+1's entry state: positions, ongoing actions, injuries, objects
held, unresolved questions, who owns the next decision. A mismatch is a finding. This is a
structured-data diff, and it is the cheapest continuity check that exists.

### 3.6 Distributional prose metrics

Sentence-length variance, opening n-gram diversity, tricolon rate, concrete-noun density, adverb
rate, dialogue-to-narration ratio, hedge density, punctuation profile. Eight structural scorers
already exist in `evals/structural/`, including `self_repetition` — extend it across prior beats
rather than duplicating it.

**Calibrate against the project's own accepted beats**, so a signal means "unusual for this story"
rather than "unusual for English". A distinctive voice becomes the baseline instead of a
violation. Version every threshold with the corpus and judge model that produced it.

One existing scorer needs demoting: `slop_rate` matches a **negative-corpus phrase list**, which
is trivially overfit, false-positives whenever a listed phrase is the right phrase, and in a
project whose purpose is a distinctive voice penalizes deliberate style. Keep it as one signal
among many; never promote it to a gate.

### 3.7 Voice convergence — no model, and the highest-value check not yet written

Distinct character voice is required by four prompt files — `anti-slop/SKILL.md:30`, the
storyteller skill, the Martin skill, the prose critic — and measured by none of the eighteen
shipping scorers. `persona-fidelity` grades the **author's** persona against a requested style
string; `character_field_adherence` grades psychology fields. Neither looks at diction.

This is the failure mode readers notice first in long generated fiction: characters converge on
one articulate narrator. It is also, unusually, cheap to detect, because stylometry solved the
inverse problem long ago. Authorship attribution works on **function words** — *the*, *but*,
*of*, *would* — rather than vocabulary or topic, because they are unconscious habits that survive
paraphrase. Run the same statistics across speakers instead of across authors and convergence
falls out of the arithmetic.

Three design choices matter more than the specific metric:

1. **Score the closest pair, not the average.** One vivid character can carry a mean while three
   others are interchangeable. The minimum pairwise divergence in a scene is the honest number.
2. **Two measurements, not one.** *Distinctiveness* is speaker-versus-speaker. *Adherence* is
   speaker-versus-fingerprint — the register and lexicon recorded on the character card
   (`target-architecture.md` §6.3). A cast can be perfectly distinct from each other and all
   wrong relative to who they are supposed to be.
3. **Calibrate per project, as in §3.6.** Two siblings raised together *should* score closer than
   a knight and a maester. The threshold belongs to the corpus, not to English.

The prerequisite is extraction, and it is where the real work is. Dialogue is persisted as free
prose in `beats.content` and `episodes.scriptContent`; the planner emits a single `dialogueHook`
string (`beat-plan-schema.ts:15`), not attributed lines. Script output does carry cue structure —
the author is required to emit slugline, at most two action lines, then dialogue — so parsing is
possible without a model, but it must be tested against the awkward cases before its output is
trusted: interruptions, unattributed lines, and scenes where one speaker holds the floor. **An
extractor that silently drops half the lines produces a confident and meaningless score**, which
is worse than no scorer, so the extractor's own tests gate the metric's admission to the suite.

A judge rubric for voice stays deferred. The deterministic metric answers *whether* two
characters have collapsed; a judge would be needed only to explain *how*, and that is a question
worth paying for after the first one is answered. Action 32.

### 3.8 Hygiene — ported from the reference checker

Prompt leakage, markup leakage, adjacent near-duplicate paragraphs, unbalanced quotes, replacement
characters. Port the rules, not the file: the original targets a different manuscript convention.
Preserve its exit contract — `0` clean, `1` findings, `2` **the tool failed to run**.

### Why this ordering pays

Checks 3.2 through 3.5 are *literary* quality checks that need **no model at all**. Combined with
3.7 and 3.8 they run before the critic wall, so a draft with a dropped thread, an unresolved plant, a
contradicted object or a broken chapter interface is returned to the Author **without spending a
model call** — and the critics only ever see drafts that are already structurally sound.

This is also the cheapest large win available, precisely because so much of it is already written.
Moving existing checks from an offline scorer run into the draft path is a wiring change; it needs
no new model, no new agent and no new schema beyond resolving the §3.3 duplication.

---

## 4. Testing orchestration — proving the right agents and tools fired

The substrate is the run trace (`target-architecture.md` §2 layer 8): an append-only log of
`tool.call`, `tool.result`, `role.dispatch`, `role.result` (with usage), `gate.decision`,
`state.transition`, `persist.commit`, `skill.resolved` and `context.isolated`.

Every assertion below is a Tier 1 test — stubbed models, no network, runs on every commit.

**Status: none of this exists yet, and it is the first thing to build.** The `evals/` tree
contains no assertion over tool calls, dispatch or spans — the only matches for those terms are
two fixture JSON files, which are input data. Every shipping scorer grades **output text**: the
judge scorers under `src/shared/agent-kernel/scorers/` and the eight structural checks
(S1–S3, S5–S9) under `evals/structural/`. That is a complete measurement of *what was written*
and a zero measurement of *what ran*.

The consequence is specific: today the system's agentic claim is unfalsifiable. If the critics
silently stopped dispatching, if the planner were skipped, if a tool call were dropped in favour
of the model answering from its own head, **every existing scorer would still return a number**,
and a good number would be read as a healthy pipeline. Prose quality cannot distinguish an
orchestrated draft from a lucky single-shot one. Until §4.1 and §4.2 are wired, "agentic" is a
description of intent rather than a tested property.

This tier is also the cheapest one to build, because the seam already exists:
`createBeatDraftWorkflow(deps)` takes injected dependencies, and the workflow tests already stub
them. The missing piece is recording dispatch events and asserting on them — no model, no
network, no database.

### 4.1 Dispatch correctness

- One beat request emits **exactly one** workflow dispatch — not zero (the model answered from its
  own head) and not three (a retry loop).
- The critics dispatched **equal** the aids the plan declared. Not a superset. Floor is
  **three** overlapping scopes (`continuity`, `prose`, `stakes`).
- Plan precedes draft; deterministic checks precede critics; verdict precedes **host persist**.
- Critic spans **overlap in time** — proving `.parallel()` rather than sequential execution.

### 4.2 Absence of unnecessary work

Under-tested everywhere and worth as much as the positive cases:

- A greeting emits **zero** tool calls.
- A beat with no dialogue map dispatches no dialogue skill — assert on `skill.resolved`.
- Extra scopes (`cognition`, `dialogue`) emit **zero** dispatches unless the plan or a flag asks.
- A read-only question triggers no mutating chat CRUD.

### 4.2a Memory is bound, keyed and bounded

Three assertions, all stubbed and free, that exist because the current arrangement fails all
three (`overview.md` §5.6):

- **Every** agent call carries a thread id and a resource id. Today exactly one call site in
  `src/` does, and it is not the one users hit — so this assertion fails on the first run,
  which is the point of writing it.
- Two different projects, or two different users, never produce the same thread key. Assert on
  the derived key, not on a mock of the helper that derives it.
- No agent is constructed without a message bound, MCP included.

Prompt tokens attributable to recalled memory are recorded as their own field, separate from
assembled context. This is not a pass/fail assertion — it is a **tracked metric**, in the same
class as cost and wall-clock: recorded on every run, plotted over time, alarming only on a trend.
A conversation memory that grows quietly is the classic way a per-turn bill triples with no code
change and no failing test, and the only defence is a number someone can look at.

### 4.3 The right text flows through

The text handed to **host persist** is the **de-slopped revision**, not the original draft and not
the pre-de-slop intermediate. There is no `commit_beat` on the chat agent. Trivial to get wrong in a multi-step pipeline and invisible
without a trace.

### 4.4 Failure handling

- One critic throws → the run completes with a **partial** critique, flagged as partial.
- Persistence fails → the run **fails**. It never completes with `saved: false`.
- A `kill` verdict emits **zero** `persist.commit` events.
- The revision loop terminates on unchanged findings or after **one** auto-revise (InkOS), rather than consuming an unbounded budget.
- Suspend/resume round-trips: a resumed run reaches the same persist as an uninterrupted one.
- Client, route, and workflow timeouts share **one** source (`GENERATION_STUCK_TIMEOUT_MS` = 180s).

### 4.5 The two assertions the new architecture makes possible

**Context isolation is real.** A critic subagent's read volume never enters the chat agent's
context — asserted on measured token counts from `context.isolated` events, not on intent. This is
the property that makes the design work at novel length, so it deserves a test rather than a
diagram.

**Layer scoping is real.** A `read_canon` call scoped to a POV character returns **zero
author-truth rows** — asserted on the returned payload. A request for a character's knowledge as
of beat N excludes what they learn at beat N+1.

### 4.6 Anti-assertions — what these tests must never do

| Never | Because |
|---|---|
| Assert a prompt contains a phrase | Tests the wording, not the behaviour; breaks on every prompt edit |
| Assert that a mocked function was called, where the mock is the thing under test | Proves the test wired itself up |
| Assert model output equals a fixed string | Tests the model's determinism, which is not a property we have |
| Mock `requireAuth` and call the result an auth test | Proves nothing about the trust boundary |
| Assert on an English word list in generated prose | Measures vocabulary, not quality; breaks on style |

---

## 5. Scorer calibration — does the instrument work?

Tier 3 numbers are worthless until this tier passes. Three properties, each a gate on whether a
scorer is allowed to exist.

### 5.1 The noise floor

Run each scorer **N ≥ 5 times on identical input** and compute the standard deviation. That is the
floor.

> **Any measured difference smaller than 2× the noise floor is not a result.**

`SCORER_NOISE` exists today but is not bound to a judge model id, so the floor is not
reproducible across model versions — which makes every comparison against it unfalsifiable. Bind
it, and re-measure whenever the judge model changes.

### 5.2 The human-anchored golden set

Thirty to fifty beats the **author** has labelled — accepted, or defective with a named problem
type. This is ground truth, and it is the only thing that stops the system optimizing a proxy.

Every scorer must clear three bars:

| Bar | Test |
|---|---|
| **Discrimination** | Separates accepted from defective beats at some threshold |
| **Agreement** | Matches human labels meaningfully above chance |
| **Specificity** | Low false-positive rate on the *accepted* set — a scorer that flags good prose is worse than none |

**A scorer that cannot beat its noise floor, or cannot separate the golden set, is deleted rather
than tuned.** Tuning an instrument that does not discriminate produces a number that looks like a
measurement.

### 5.3 Inter-judge agreement

Run the same comparison through two judge families. Persistent disagreement means the **rubric is
ambiguous**, not that one model is wrong. Fix the rubric; do not average the noise away.

### 5.4 The three biases that do not average out

More samples fix random error. These are **systematic**, so more samples buy you a more confident
wrong answer.

| Bias | Symptom | Control |
|---|---|---|
| **Position** | The same pair, presented in the other order, produces the other winner | Counterbalance every comparison and record a flip as a tie (§6.2). Track the flip rate — a rising rate means the rubric is degrading |
| **Self-preference** | A judge scores its own family's prose higher | Judge family ≠ author family, enforced in configuration rather than by convention |
| **Verbosity** | Longer output wins regardless of quality | Report score against output length and check the correlation. A high correlation means you built a length detector |

The verbosity control matters here more than in most systems, because the de-slop pass changes
length without changing content — usually downward — and a judge that rewards length would
quietly push the whole system toward padding and score the scrub-down as a regression.

---

## 6. Pairwise comparison, not absolute scores

Absolute "rate this 1–10" from an LLM judge drifts with model version, prompt wording and position
in the context, and the drift is invisible because the scale never changes. Prefer pairwise.

The method, following established practice:

1. **A vs B on the same brief**, judged blind to which is baseline.
2. **Swap positions and re-run.** If the verdict flips, it is a tie — that is position bias, not
   preference, and counting it is how a suite manufactures wins.
3. **Require an evidence quote before each score**, so an unsupported judgement is malformed
   rather than merely wrong.
4. **Aggregate over many pairs** with Bradley-Terry or Elo, not by averaging raw scores.
5. **Two judge families**, never one, and never a judge from the same family as the author model.

Absolute scores keep exactly one job: tracking a single scorer against its own baseline over time,
where drift is bounded by §5.1's noise floor.

---

## 6A. Ablation — how the suite decides what grows past the floor

The **floor** is not ablatable as a deletion: **three** critic scopes that already run, the
novel-writing skill **index** (L1), host persist after Approve, and Humanizer always-on class
after the verdict (once Phase 2 lands). If the current GRRM pack loses a comparison, that is a
packing bug, not a product decision to drop structure.

Ablation decides **additions**: `cognition` / `dialogue` / `anchoring` / `realism` scopes, variant tournament, embedding
search, Muse-always-on.

One ablation is **diagnostic rather than gating** and should be run first: the drafting voice
pack itself. `beat-draft-default-deps.ts` has routed every draft and revision through
`statelessGrrmAuthor` — psychology, anti-slop, banned phrases — while `evals/run.ts` scored a
frozen `referenceOutput`, so the pack has never had a number attached to it. Drafting the
golden set with a plain author prompt is one run, and it tells you what the existing pack is
worth before anyone designs a new stage around it.

**The harness for this already exists and should be extended, not rebuilt.**
`evals/experiments/wildcards-ab.ts` runs a fixed set of briefs through the pipeline twice — sparks
off versus sparks on — scores both arms on `story-motion`, `magic` and `stakes-cost`, and
recommends flipping the default only when the king criterion improves and no gate scorer
regresses. That is precisely the procedure below, already written against this workflow. It calls
`createBeatDraftWorkflow(defaultBeatDraftDeps)` in-process, so it needs no HTTP layer and no
browser. The voice-pack ablation is the same harness with a different arm, and `s8-slop-rate`
plus `s9-self-repetition` already supply the de-slop measurement.

The procedure is one loop:

```
for each candidate C past the floor:
    score_on  = golden set, C enabled
    score_off = golden set, C disabled
    if (score_on − score_off) < noise floor:   do not add C
```

Switchable by configuration: each *candidate* scope, optional retrieval depth, brainstorm-always.

Three rules keep it honest:

1. **Report per defect class, not only total score.** Contribution is reported against the
   `ProblemType` enum.
2. **Same dataset, seed, judge id and hash discipline as §5.2.**
3. **Adding a fourth critic scope** requires an ablation showing defects of that class surviving
   the existing three. The GRRM rubric (consequence, embodiment, withheld truth, sensory density,
   Law of Motion) is a live-quality scorer, not an optional component.

This is also the specific defence against over-engineering an agent system, which is the failure
mode these designs are most prone to: the parts all sound useful, they are individually cheap, and
they are collectively expensive. An earlier draft of the target architecture proposed seven
critics, eleven tools and six workflows — not wrong because seven is too many, but wrong because
nobody had measured whether three was enough. The honest floor **is** those three. Five scopes
are a Phase 4 candidate, not a commit-gate assertion.

---

## 7. Regression discipline

A change to prompts, tools, model pins, skills or the workflow ships only when **all** hold:

1. Tier 0 and Tier 1 green.
2. No Tier 3 scorer regresses below baseline **by more than the noise floor**. A drop inside the
   floor is not a regression, and a gain inside the floor is not an improvement.
3. Cost per beat within a stated tolerance — a quality gain bought with a 4× cost increase is a
   decision, not a free win, and must surface as one.
4. The eval artifact is bound to the **exact tree**: the input hash must cover
   `src/mastra/agents/**/instructions.md`, the skill files, `evals/constants/thresholds.ts` and
   the model pins — and must detect deletions and renames, which `--diff-filter=ACMR` currently
   misses.
5. The artifact is **atomic and self-describing**: `passed` is written only after comparison, and
   a run without keys reports `skipped`, never `passed`.

Pre-commit verifies **the artifact**, it does not run models. Today it proves an eval *ran*, never
that it *passed*.

---

## 8. What cannot be automated

Stating this plainly is what makes the rest credible.

**Not automatable:**

- *Is this GRRM-level?* Absolute literary quality is a human judgement and will stay one.
- Whether a deliberate rule violation is brilliant or broken. The craft material is explicit that
  project rules override the general method; a system that cannot be overruled is a worse editor
  than a checklist.
- Whether the story is worth telling.
- Whether the voice pack succeeded. That is preference, not correctness.

**Automatable, and therefore mandatory:**

- Defects — every check in §3.
- Regressions — §7.
- Cost and attribution.
- Non-degradation of voice under revision — the Style Fidelity Critic on the diff.

> **Automate defect detection; reserve humans for preference.** The system's job is to make sure
> the author never spends attention on a fixable defect, so that all of their attention goes to
> the judgements only they can make.

---

## 9. What runs when

| Tier | Trigger | Network | Cost | Budget |
|---|---|---|---|---|
| 0 | Pre-commit, CI, every commit | No | $0 | < 5s |
| 1 | Pre-commit, CI, every commit | No | $0 | < 30s |
| 2 | Scorer, prompt, skill or model-pin change; nightly | Yes | $ | Minutes |
| 3 | Explicit, before a change ships; release gate | Yes | $$ | Minutes to hours |

Tiers 0 and 1 must stay fast enough that nobody is tempted to skip them — that is a design
constraint on the tests, not an aspiration.

### 9.1 Current phase: evals first, no browser tier

Browser testing is **out of scope for this phase**. No Playwright spec is a prerequisite for any
action now in flight, and no action should be blocked waiting for one.

This is a coherent boundary rather than a shortcut, because the whole near-term arc is verifiable
without a page. The workflow is dependency-injected, so Tier 1 drives it directly. The ablation
harness calls it in-process. The structural scorers read persisted output. Nothing in Tiers 0
through 3 needs a rendered DOM.

What follows from it:

| Consequence | Detail |
|---|---|
| **Backend-only work leads** | Anything that changes canon assembly, workflow stages, tools, critics or model pins verifies through Tiers 0–3 as they stand |
| **UI-dependent work defers** | The editorial-verdict card, per-finding selection, undo and in-tool progress have no acceptance path without a browser tier, so they wait rather than shipping unverified |
| **The gap is named, not hidden** | Deferred UI is listed as unverified work with the test that would cover it, per the project's verification rule |

The ordering also happens to be the honest one: a verdict card is only worth building once the
pipeline behind it is proven to dispatch what it claims, which is §4's job.

**Every gate must fail loudly when its tool fails.** A runner that infers success from the absence
of error lines reports green when the binary is missing, the config is invalid or the process is
signalled. Explicit `passed` / `failed` / `skipped` from process outcome and structured output,
with a timeout, and `skipped` never counts as `passed`.

---

## 10. Acceptance — when is this suite trustworthy?

The evidence a reviewer should demand before believing any quality claim this system makes:

| # | Claim | Proof |
|---|---|---|
| 1 | The eval measures the agent | A deliberately degraded agent output lowers the live-quality score and blocks the gate, while leaving the scorer-fixture score unchanged |
| 2 | The instrument works | Every shipped scorer has a published noise floor and separates the human golden set |
| 3 | Differences are real | No claimed improvement is smaller than 2× its noise floor |
| 4 | Orchestration is verified | Deleting a critic dispatch, a gate, or the layer scoping each turns a specific named test red |
| 5 | Absence is verified | A greeting produces zero tool calls; a no-dialogue beat loads no dialogue skill |
| 6 | Isolation is verified | Measured token counts prove a critic's reads never reached the chat agent |
| 7 | The artifact is honest | Editing an `instructions.md` invalidates it; a staged deletion is detected; a keyless run reports `skipped` |
| 8 | Cost is known | Run total reconciles against the sum of its trace events; an unpriced model blocks a paid run |
| 9 | The gate can fail | A missing binary, invalid config, signalled process and empty output with non-zero exit each produce red with a stated reason |
| 10 | Humans stay in the loop | Every automated finding is overridable, and an override can be promoted to a project rule |
