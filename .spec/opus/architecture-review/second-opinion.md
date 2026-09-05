# Nomos — Second opinion

**Subject:** `.spec/opus/architecture-review/` (`overview.md`, `target-architecture.md`, `evaluation.md`, `actions.md`, `diagrams.md`, `learning-materials.md`).
**Audit base (the spec’s):** `refactor` @ `b409539`. This document does not re-probe those measurements.
**Comparators:** [InkOS](https://github.com/Narcooo/inkos), [Vela](https://github.com/heider-x/vela), [StoryCraftr](https://github.com/raestrada/storycraftr), [novel-writing](https://github.com/wgwtest/novel-writing), plus the coding-agent harnesses this repo already copies — [Cursor](https://cursor.com) and [Claude Code](https://code.claude.com/docs/en/how-claude-code-works).
**Deliverable:** analysis only.
**Build order:** [phases.md](./phases.md) — platform + storyteller tracks (0–4), overlay chat as Phase 5, tests as Phase 6.

---

## Verdict

**Split it.**

| Object | Call |
|---|---|
| Current-state audit (`overview.md`) | **Approve.** The thesis is load-bearing. The P0/P1 defects are real. Ship them this week, independent of any writing redesign. |
| Target (`target-architecture.md` + 32 actions) | **Approve the honest floor.** The previous “middle” draft is retired. One chat agent, three critic scopes, host persist, Humanizer after verdict, `artifact-draft` as a cheaper sibling, latency as Phase 0. This file is the rationale that produced that rewrite. |

The one sentence to keep from the spec:

> The host owns truth; the model owns language.

The correction: **host-owned truth is the settled world after the beat**, not a `Finding[]` from five inspectors. Prove each inspector earns its tokens the same way the spec already demands extras earn theirs.

---

## 1. What the current-state audit got right

Do not rebuild these. Do not wait for beat-forge to fix them.

**Thesis.** Three failure modes recur: a gate that cannot fail is not a gate; a measurement that is undefined cannot be trusted; a capability that is described but not wired is not a feature. That is the correct diagnosis of SPEC-12 through SPEC-16.

**Keep, do not regress**

- Single billing seam (`recordLlmCall`), fire-and-forget, unpriced models preserved as visible ignorance.
- Durable editorial `suspend` on the beat-draft workflow.
- Plan/build via tool *visibility*, not a polite system prompt.
- 3D Asset Exporter contracts pilot (schema → mapper → domain type, `safeParse` on junk JSONB).
- Ownership 404 rather than 403 on job reads.
- Metric hard caps holding (no file >800, no complexity >25).

**P0/P1 that are still true if the measurements hold**

| ID | Finding | Why it outranks craft |
|---|---|---|
| Auth | `requireAuth` uses `getSession()` (local JWT decode), not `getUser()`. `/api/complete-token` unauthenticated. `/api/trigger/token` issues read tokens for caller-supplied `runIds`. PATCH spreads on beats/characters reparent rows. | Confused deputy. Fix this week. |
| Evals | `evals/run.ts` scores `example.referenceOutput`. Gate is real; it guards a fixture. Pre-commit proves an eval *ran*, not that comparison *passed*. | A green quality gate that cannot see the agent is a product lie. |
| Persist | `persistBeat` can return `{ saved: false }` while the workflow succeeds. Sequence defaults to `1`. | Torn state. InkOS’s whole reliability story is “this cannot happen.” |
| CI | No `.github/`. Gates are local and optional. `npx tsx` unpinned. | Enforcement that does not run is a comment. |
| Cost | `usage` not `totalUsage` on multi-step generates; embedding tokens from a module global; `/api/assistant` never sets gateway context. | Every later “$ per beat” is a floor. |
| Reachability | Muse `wildcards` missing from the tool schema. `@mention` catalog dispatches nothing. `resumeChatWorkflow` is defined and never called. 120s auto-approve on the verdict. | Features that exist on a slide. |
| Memory | `lastMessages: 10` declared; production SSE never passes `memory: { thread, resource }`. | Same declared-versus-effective pattern as the ratchet. |
| ESLint | Flat-config last-write-wins silently dropped the cross-domain ban. Blast radius currently zero. | Cheap to restore; untested effective config will bite later. |

These tickets do not belong in a 32-action writing-system program. Auth does not depend on a typed run trace. Calling `resumeChatWorkflow` is not Action 30 in Track B.

---

## 2. Brilliant parts of the *target* — keep these ideas

These are not taste. They are the ideas worth stealing for any agentic writing backend.

| Idea | Why it is actually good | Do not dilute |
|---|---|---|
| Prose as a compiled artifact | Findings as diagnostics; revision as fix; verdict as code review. Matches novel-writing’s review format and ESLint’s 0/1/2 exit contract. | Apply compilation to **world state** too, not only to critic output. |
| Dramatic irony as retrieval permission | Author drafting a POV beat gets story facts + that character’s knowledge, never author truth. Same reasoning as RLS. | Layers as prompt partitions are a start. Layers as unqueryable blobs are a slogan. You still need the ledger *when cognition fails*, not as a floor table. |
| Four eval tiers, named as a safety property | If the agent did not run, the output may not be called agent quality. Splitting fixture / contract / calibration / live is how you stop lying. | Build Tier 1 on the **existing** workflow. Do not wait for five new scopes. |
| Ablation as the growth rule | The 7-critic / 11-tool draft was rejected for being unspecified by measurement. Adult instinct. | The floor itself is currently exempt from ablation. That exemption is how over-build sneaks back in. |
| Tools withheld, not refused | AgentController omitting mutating tools beats a prompt that says please don’t. Identical to Cursor Plan mode and Claude Code Plan. | Then do **not** give the model `commit_beat`. Human verdict is the only commit trigger. |
| Style-fidelity on the **diff** | Machines clear findings by deleting the vivid material. Scoring the revision, not the text, is the right critic. | Keep this even if you cut to three scopes. |
| Memory must not carry story truth | A remembered fact bypasses four-layer permission. Bound chat memory; canon goes through `read_canon`. | Bind thread+resource on the live SSE path first. |
| Gateway vs narrative contract | OpenRouter can pin models, cap USD, demand ZDR. It cannot know which invented fact is a secret. Two owners. | Do not put regex prompt-injection on fiction. Dialogue will trip it. Cap and delimit `masterPrompt` in app code. |
| Deterministic checks before any critic | `tsc` before code review. Causal graph and setup/payoff **already exist** offline. | Wire them into the draft path. Do not invent new judges first. |
| Martin-as-structure, user-as-tone | A comic-noir project should not be scored for failing to sound like Westeros. The old pack concatenated psychology + anti-slop into every draft and fought `masterPrompt`. | Measure the existing pack (on vs off) **before** moving psychology or vendoring Humanizer. |
| Literal `search_manuscript` | Plants and self-repetition are string problems. | Embedding search is a later candidate. Vela’s million-word RAG is a different product. |
| Editorial suspend as a latency feature | It splits one Vercel window into two. Removing the gate to “simplify” blows the budget. | Latency is a **constraint on the floor**, not Action 28 after the floor is fully specified. |

---

## 3. Stupid, oversold, or dangerous in the *retired* middle draft

These subsections critique the previous `target-architecture.md` (“middle”). The rewrite now in
that file **is** the honest floor this section asked for. Kept here so the rationale is not lost.

Ranked by blast radius, not by how clever the writeup is.

### 3.1 The floor is still the over-built draft

Rejected: 7 critics, 11 tools, 6 workflows.
Kept: 5 critic scopes, 8 tools, 3 workflows, 10 skills, Humanizer, 4 canon layers, 3 controller modes, a bible matrix.

That is not “middle.” That is a second product. The GRRM pack that already drafts every beat has **never been ablated** because evals score frozen strings. Building five new inspectors before measuring the three you have is the exact failure the ablation rule was written to prevent.

**Honest floor:** existing beat-draft + 3 critics + atomic persist + layer-partitioned context + real eval. Ablate **up** to 5 scopes.

### 3.2 Compiler of diagnostics, not of state

This is the domain miss.

InkOS’s actual compiler is not a `Finding[]`. It is: write in a chapter workspace, validate body + foreshadowing + runtime snapshot, then **atomically commit**. Failure cannot yield “state advanced, prose missing.” Foreshadowing is a Zod state machine (`open / progressing / deferred / resolved`). There is a self-check table before the write and a settlement table after.

Nomos can still complete a run with `saved: false`. `continuity-sweep` is critic fan-out, not settlement. The `setups` table already exists and nothing queries it; live data lives in `setupsPayoffs` jsonb.

**First-class `AfterBeatState`:** positions, injuries, objects held, open plants, who owns the next decision. Commit prose + state + trace + cost in one transaction. That is the compiler. Critics are optional linters on top.

### 3.3 Dual orchestration: Controller modes + workflow stages

Writer talks to Conductor (`read / draft / commit`). Pipeline is one `run_beat_draft_workflow` tool. If the workflow owns persist after human resume, `commit_beat` is a footgun. If the model owns persist, you recreated `autoApprove: true` in a new costume.

Cursor / Claude Code: the **harness** applies the patch after permissions; the model proposes. Plan mode withholds write tools. The user (or an explicit auto mode with a *separate* permission classifier) is the commit authority.

**Host owns commit.** Model proposes a draft. Human — or a declared autonomous queue whose verdicts wait — is the only commit. Controller modes are for chat exploration, not for the compiler.

The manuscript still needs a page. InkOS writes in a chapter workspace. Cursor writes in the file. Nomos’s PhaseNavigator already says Premise → Beats → Draft, and Draft is a Courier `contentEditable` with a selection-rewrite menu. That is not a compiler surface. Do not invent a second chat to paper over it. Spec the well (`target-architecture.md` §7.5): ghost complete, section generate, Script vs Novel as format skills.

### 3.4 Four-layer canon without a ledger

[novel-writing §4](https://github.com/wgwtest/novel-writing/blob/main/novel-writing/references/story-outline-and-causal-summary.md) is a **document convention** for outlines (story facts / character knowledge / author truth / reveal boundary). The spec treats it as queryable permissioned data, then defers the character-knowledge table to §13 while making layer-scoped retrieval a P1 floor item.

**Phase 1:** partition the prompt (author-truth block never reaches Author). **Phase 2:** per-beat knowledge rows when cognition actually fails on golden beats.

### 3.5 POV-leak as “the single best check”

Proper-noun lookup against author-truth-only rows catches “Arya said the word R’hllor before anyone taught her.” It misses paraphrase, implication, and metaphor — which is how secrets leak. High precision, low recall. Fine as a cheap filter. Not the George vibe. Irony lives in the retrieval rule and in settled knowledge.

### 3.6 Humanizer as the de-slop pass

35 Wikipedia AI-cleanup patterns for encyclopedic prose. The spec then suppresses dashes, fragments, aphorisms — the load-bearing fiction patterns. You already have a fiction anti-slop skill. This is a large integration for a list you mostly turn off.

Keep the **claim-check** (no fact delta on names, numbers, quotes). Keep a small always-on machine-tell list. Do not vendor Humanizer until an ablation beats the existing pack.

### 3.7 Action 26: bible through beat-forge

A faction card is reference data. A beat is generated prose. Running plan + critics + editorial suspend on a character sheet copies the compiler metaphor onto the wrong artifact.

InkOS: architect writes bible once; chapter pipeline is separate.
StoryCraftr: worldbuilding commands ≠ chapter commands.
Cursor: you do not run the full PR review bot on every config-string edit.

Typed contracts + a continuity check on bible writes. Not five scopes. Not de-slop.

### 3.8 Model pins as architecture

§11 writes Kimi K3 / GLM 5.2 into the design, then notes the Kimi ranking is the one number **not checked against the repo**. Role pins (`resolveRoleModel`) are architecture. Specific vendors are an ablation result.

### 3.9 Further cuts

- **Voice fingerprints as four prompt fields.** InkOS `style analyze` extracts sentence-length distribution, word frequency, rhythm, plus a guide. Four adjectives plus three sample lines is a prompt snippet. Function-word stylometry needs a minimum token count per speaker; a 300-word beat with six lines will not separate anyone. Gate the metric on extractor tests.
- **`autonomous-episode` as a “durable showcase.”** “Showable” is a slide criterion. That is how Muse shipped unreachable.
- **Regex prompt-injection as P0.** ZDR and spend ceilings are real account controls. A regex filter on unpublished fiction false-positives on military “ignore that order.” Delimit `masterPrompt`, cap it, put hard rules *after* it.
- **32-action syllabus as architecture.** `learning-materials.md` is a good teaching doc. It is not a build sequence.
- **Latency as Action 28.** Five parallel GLM critics plus Kimi draft/revise/de-slop will miss `GENERATION_STUCK_TIMEOUT_MS` (180s) and the disagreeing `maxDuration`. InkOS default is **one** auto-revise. Copy that budget.

---

## 4. How AI novel systems actually work

This is a **game narrative factory** (beats, bible, then 2D/3D), not a novelist IDE. That makes structured beats and Law of Motion *more* justified than in Vela. It does not justify five parallel critics on every beat before measuring whether three already catch the defects.

| System | Loop owner | Truth / state | Quality loop | Steal | Skip |
|---|---|---|---|---|---|
| [InkOS](https://github.com/Narcooo/inkos) (AGPL — adapt, do not vendor) | Host. Chat agent proposes; InkOS confirms, retrieves, atomically persists. Do not infer completion from model speech. `compose` is local, no LLM. | Chapter workspace: body + foreshadowing + runtime snapshot, then atomic commit. Zod state machine on plants. Self-check before write, settlement after. | Write → audit → at most one auto-revise. Style fingerprints from real text. | Atomic workspace, state settlement, compose-without-LLM, confirm before heavy writes, per-agent model routing. | 37 unstructured audit dimensions, daemon-write as default, AGPL code. |
| [Vela](https://github.com/heider-x/vela) | Human in an IDE. AI is a side panel. Streaming chapter, stop anytime. Local-first, BYOK. | Worldbuilding + character profiles with cross-chapter dynamic state. Local RAG for setting chunks. | Optional Rewrite → Refine → Review. Not forced on every save. | Interruptible streaming, task-typed model routing, usage panel. | Million-word RAG as a floor item. Nomos already has a bible; search it literally first. |
| [StoryCraftr](https://github.com/raestrada/storycraftr) | Human drives a CLI. Explicit verbs: outline / worldbuilding / chapter. | Project files + embeddings. Outline first, then chapters from synopses. No runtime knowledge ledger. | Almost none. Generate and hope. | Explicit verbs instead of one omnipotent chat. | Missing critic, missing state, missing atomic persist. |
| [novel-writing](https://github.com/wgwtest/novel-writing) (MIT — the spec’s catalog) | Human + Codex skill. **Stage selection first** (plan / draft / review). Progressive disclosure. Project-local rules override the skill. | Four information layers are an **outline discipline**, not a database. LOD L0–L4. Prose outranks cards. Future prose excluded unless a continuity dependency asks. | Structured findings. Checker exits 0/1/2. No multi-agent wall. No automatic rewrite loop. | Finding contract, four-layer *information order*, LOD, hard rules (naked entry, access limits, embodied dialogue, style protection), project-rule override. | Treating the ten reference files as five always-on critic agents. Cognition tables are for high-conflict scenes, not every beat. |

None of the four run five isolated critic agents on every chapter as the default path. None vendor Wikipedia AI-cleanup as the fiction de-slopper. None promote critic findings to standing law without a human.

---

## 5. Cursor and Claude Code — the missing comparator

This repo already *is* a Cursor / Claude Code harness for software (`.agents/execute/`, `.cursor/rules`, skills, hooks, Plan → Approve → Build, `fabro-verify`). The Storyteller target should be **parity with that harness**, translated to narrative — not a five-inspector CI matrix that Cursor would never run on its own diffs.

Sources: [How Claude Code works](https://code.claude.com/docs/en/how-claude-code-works); Claude Code permission modes (Plan withholds writes; Auto uses a **separate** classifier that does not see the main model’s prose); Cursor Agent / Plan / Ask; this workspace’s own rules (tools withheld by mode, skills on demand, hooks as deterministic gates, user owns `git commit`).

### 5.1 The coding-agent loop, mapped

Claude Code’s documented loop is three phases that blend: **gather context → take action → verify results**. The harness — not the model — owns tools, context assembly, permissions, checkpoints, and the execution environment. Cursor is the same machine with an IDE skin: Agent loop, Plan mode, rules, skills, MCP, subagents, hooks.

| Coding-agent primitive | What it actually does | Honest Nomos equivalent | What the target over-copies |
|---|---|---|---|
| One conductor talks to the user | Single agent. Subagents are isolated workers that **return a summary**; their 60k of reads never enter the parent. | One chat agent. Isolated critic *when* a critic is justified. | Five always-on critic scopes on every beat, plus Conductor modes that duplicate the workflow. |
| Plan mode withholds write tools | Cursor Plan / Claude Code Plan: explore and propose, **no source edits**. User approves, then execution. | Existing `AgentController` plan/build. Editorial `suspend`. | A third `commit` mode that hands `commit_beat` to the model. |
| Files are source of truth | Transcript is conversation. Compaction may drop early instructions, so standing law lives in `CLAUDE.md` / `.cursor/rules`, not in chat memory. Git is the world state. | Beats + bible + `AfterBeatState` in Postgres. Memory is conversational only (the spec already says this). | Four-layer “canon” as a retrieval speech without a settlement write. |
| Deterministic verify before model review | After an edit, the harness surfaces **type errors / tests / lints**. Bugbot and security-review are **on-demand subagents**, not the default loop. | `run_prose_check` + causal graph + setups table **in the draft path**. Live judges only on release. | Five GLM critics as the floor; deterministic checks described as brilliant then scheduled behind the critic wall. |
| Skills: index always, body on invoke | Claude sees skill **descriptions** at session start; full `SKILL.md` loads only when used. | Ten catalog names at L1 (~1.2k tokens). Bodies on `forbiddenMistakes` / stage match. | Six bodies on **every** beat. That is concatenation, which is what the spec just accused `grrm-author` of. |
| Hooks are deterministic | Pre-tool deny, post-edit lint, commit gates. No LLM in the hook. This repo: `guard-commit.sh`, `guard-agent-artifacts.sh`. | Schema validation, uniqueness on `(episodeId, sequence)`, atomic persist, claim-check on de-slop. | `promote_rule` and Humanizer as if they were hooks. They are model passes. |
| Permission classifier ≠ main model | Claude Code Auto: a background classifier sees **user request + tool call**, not the main model’s jailbreak prose. | Gateway allowlists + app-layer “masterPrompt never governs facts.” | Regex prompt-injection on fiction; `masterPrompt` last in an undifferentiated block. |
| Checkpoints, not faith | Claude snapshots files before edits; rewind is Esc Esc. Cursor has composer checkpoints. Git is the durable log. | Workflow snapshots + `AfterBeatState`. Kill emits zero persist. | Soft `{ saved: false }` success. |
| User in the loop | Interrupt mid-turn (Esc). Steer with a queued message. Commit is a user (or explicit auto) action. Claude does not infer “done” from its own speech — it re-runs tests. | Editorial suspend with draft visible. `resumeChatWorkflow` actually called. No 120s auto-approve. | `autoApprove: true` on `POST /chat`. Autonomous showcase that skips the gate to keep moving. |
| Context is layered and lazy | Claude Code: static system prompt, memoized git/project context, on-demand skills, subagent firewall, auto-compact. MCP tool defs deferred until used. | Task / Near / Far retrieval. Critic isolation **if** the critic reads far more than it returns. | Loading six skill bodies plus five critic contexts as the default beat cost. |
| Subagents are expensive and rare | Cursor `explore` / `bugbot` / `security-review` fire when the **user or a rule** asks, or when the task is isolation-shaped. | `cognition` on a deceived-POV beat; `continuity-sweep` on an episode that already has settled state. | `continuity-sweep` + `autonomous-episode` as “three workflows you can show.” Showable is a slide criterion. |

### 5.2 Anthropic’s own warning, applied

Anthropic’s published agent design (workflows vs agents; evaluator-optimizer) says: use a draft → critique → revise **workflow** when evaluation criteria are clear; do not start with a multi-agent society. For code, the clear criteria are tests and linters. For this product, the clear criteria are Law of Motion fields, causal graph, plant/payoff table, claim-check, and a Finding schema.

Five parameterized critic *agents* on every beat is the coding equivalent of spawning Bugbot + security-review + complexity-review + style-review + API-review on every 20-line patch. Cursor does not do that. Claude Code does not do that. This repo’s own execute loop does not do that: it runs **deterministic** `qualitygate:file` after an extract, and optional review skills when asked.

Evaluator-optimizer **is** `beat-forge`. The mistake is stuffing the evaluator slot with five LLMs before the cheap evaluators (the ones that already live in `evals/structural/` and `consistency-service.ts`) are in the path.

### 5.3 What this repo already copied — and then forgot to reuse

The Storyteller target reinvented a worse version of machinery that already sits in `.agents/` and `.cursor/`:

| Already in this repo (coding) | Missing in Storyteller target |
|---|---|
| Plan subagent → human Approve & build → implement | Chat can skip the verdict by URL |
| Skills progressive disclosure | GRRM skills concatenated unconditionally *and* the target still loads six catalog bodies per beat |
| Hooks that **deny** (artifacts, `--no-verify`) | Persist can succeed-soft |
| `qualitygate:file` as tsc+eslint+metrics, no model | Critics before the free linter |
| User owns git commit; no `--no-verify` | Model-visible `commit_beat` |
| Subagents only when isolation pays (`does it read far more than it returns?`) | Five scopes as floor |
| Eval: a gate must be able to fail | `eval:gate` scores the answer key |

Parity means: **the writing harness is the coding harness with different tools and a different source of truth.** Not a second philosophy.

### 5.4 Concrete translations (do these; they are not new agents)

1. **`CLAUDE.md` → project rules + `masterPrompt` with precedence.** Standing law in a bounded, versioned artifact. User tone in a delimited, length-capped block that cannot override canon, layer scoping, or permission modes. Hard rules packed *after* user text so they win. Same lesson as “put persistent rules in CLAUDE.md, not in the conversation.”
2. **Plan mode → existing Controller + existing suspend.** Do not add a `commit` mode. After human Approve, **code** commits. After Kill, **code** persists nothing.
3. **Lint-on-edit → `run_prose_check` in the draft path.** Move `s1-causal-graph`, the setups table, POV-noun filter, hygiene, here. This is Cursor reading TypeScript diagnostics after `StrReplace`.
4. **On-demand review subagent → extra critic scopes.** `cognition` / `dialogue` / `style-fidelity` fire when the plan flags them or when the writer asks, the way `/review` and Bugbot fire. Isolation still applies: they read far, return `Finding[]`.
5. **Checkpoints → atomic beat transaction + rewind.** InkOS snapshots; Claude snapshots files. A failed persist is a failed run. Sequence is a uniqueness constraint, not a default of `1`.
6. **Do not infer done from speech.** InkOS: “execution results are tool results and files, not the model’s oral claim.” Claude: re-run tests. Nomos: trace has `persist.commit` or the run is not complete. Today’s `{ saved: false }` + success violates this in the same way a coding agent saying “tests passed” without running them would.
7. **Permission classifier.** If you ever auto-approve, the approver must not be the same model that wants the tool. Claude Code Auto already does this. `autoApprove: true` hard-coded in `chat-post-handler.ts` is the anti-pattern.
8. **Context economics.** Skill index cheap; bodies expensive; MCP-like tool defs deferred; critic context firewalled; compact conversation memory; never let recalled facts bypass `read_canon`.

---

## 6. Honest floor vs proposed floor

The **Honest floor** column is what `target-architecture.md` now specifies. The **Proposed “middle”** column is the draft this opinion rejected.

| Piece | Proposed “middle” (retired) | Honest floor (now the target) | Promote when |
|---|---|---|---|
| Entry point | One Conductor, three modes, eight tools | Collapse to one chat route. Kill `autoApprove`. Call `resumeChatWorkflow`. Same mutation policy on every URL. | Modes if chat exploration actually writes without a workflow. |
| Compiler | `beat-forge`: plan → lint → 5 critics → verdict → de-slop → commit | Existing beat-draft + deterministic checks in-path + atomic persist of draft+critiques+trace+cost+**state** | Extra scopes when golden-set defect classes survive the three critics. |
| Canon | Four queryable layers + voice fingerprints | Prompt partitions: Author never receives author-truth. Optional register + sample lines on the character card. | Knowledge ledger when POV-leak/cognition fails on paraphrases the partition cannot catch. |
| World state | Continuity critic + later object ledger | `AfterBeatState` row, Zod-validated, committed with the beat. Live `setups` table (it already exists). | Object-identity ledger when golden-set shows duplication. |
| Critics | 1 agent × 5 scopes, always | Keep the three that already run. | `cognition` after a deceived-POV golden beat exists; `dialogue` / style-on-diff when those classes dominate live failures. |
| Skills | 10 at L1, 6 bodies every beat | Disclose bodies on `plan.forbiddenMistakes`, not on every call. Index is cheap; keep it. | Full always-on L2 only if ablation shows the index alone is not enough. |
| De-slop | Humanizer, 35 patterns, 3 classes | Always-on class (20–24, #7) after verdict; claim-check in code; keep `anti-slop` until Humanizer wins on `s8`/`s9` | Fiction-adjusted / dash-fragment classes if `masterPrompt` asks or ablation beats noise |
| Evals | Four tiers + GRRM rubric + stylometry | Rename today’s gate to `eval:scorer-fixture`. Tier 1 trace tests on **current** workflow. One live pack-on vs pack-off run. | Voice stylometry after extractor tests + min-token floor. |
| Showcase | `continuity-sweep` + `autonomous-episode` | Neither. Demo the compiler committing atomically with a trace. | Fan-out after an episode has settled state. Autonomy after verdicts can queue. |

---

## 7. Sequence I would actually run

Canonical now: [phases.md](./phases.md). Coding-agent order, not syllabus order: **fix what is dangerous, make the loop visible, then change the loop.**

The week table below is the same work, grouped. Execute by phase, with platform ∥ storyteller in each.

| Week | Work | Why |
|---|---|---|
| 0 | `getUser()` identity; PATCH allowlists; auth on `complete-token`; owned Trigger tokens. Call `resumeChatWorkflow`. Drop 120s auto-approve. Persist `sequence`; fail the run on save miss. | Security and the half-wired verdict are independent of craft. Users can already hit them. Cursor would not ship a Plan-mode approve button that hits a no-op. |
| 1 | Typed run trace on the **existing** workflow. Trace-contract tests: one dispatch, critics overlap, kill emits no persist. CI on a pinned toolchain. | Makes “agentic” falsifiable. Free. Writable today via `BeatDraftDeps`. This is “re-run the tests,” not a new critic. |
| 2 | Cost: `totalUsage` not last-step; gateway context on `/api/assistant`; kill the embedding global. Rename eval commands. Pack-on vs pack-off live ablation. | Every later quality number is a lie until the ledger and the eval name tell the truth. |
| 3 | `AfterBeatState` + live `setups` table + author-truth partition on Author context. Deterministic checks in the draft path. | InkOS lesson + Cursor lint-on-edit. Continuity becomes data. |
| Later | Extra critic scopes, four-layer tables, `promote_rule`, role pins — each behind an ablation that beats noise. Humanizer always-on class is Phase 2, not “later.” | The spec already wrote this rule. Apply it to extras, not to the three critics. |

---

## 8. What I am not claiming

- That the current-state P0s are independently re-verified here. They are the spec’s measurements; treat them as the worklist unless a later probe contradicts them.
- That InkOS’s 37-dimension auditor or Vela’s local RAG should be imported. They should not.
- That “GRRM-level” is automatable. The spec is honest about this (`evaluation.md` §8). Absolute literary quality stays human. Defects and regressions do not.
- That one Conductor is wrong. It is right. The extra Conductor *modes that can commit* are wrong.

---

## 9. Bottom line

The audit of `b409539` is a top-tier finding list. The ideas worth keeping: irony as retrieval permission; eval tiers as a safety property; style-fidelity on the diff; host-owned truth as **settled world state**.

`target-architecture.md` is now the coding-agent harness with different tools: **one chat agent, tools withheld by Plan mode, rows as truth, deterministic verify in the loop, human commit, three isolated reviewers, skills disclosed not concatenated.** World-state settlement is in the transaction. Extra critics grow by ablation. Regex prompt-injection is not P0. Latency (180s / one auto-revise) binds every phase.

That is the system that can ship. [phases.md](./phases.md) is how to get there.