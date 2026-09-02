# Nomos — Phased plan

**End state** is still: one chat agent, planner, author (incl. Humanizer after verdict), one critic × 3 scopes (more scopes only by ablation), Muse as `brainstorm`, three workflows (`beat-draft`, `artifact-draft`, `fix-inconsistencies`), catalog skills at L1 / bodies on match.

**This file** is how to get there without a 32-action serial chain. Two tracks run in each phase:

| Track | What it is | Why it is in the same plan |
|---|---|---|
| **Platform** | Auth, CI, cost, gates, jobs, contracts — the whole app | The opus audit’s P0s are mostly here. They are the strongest part of `actions.md`. Storyteller quality numbers are lies until this track is honest. |
| **Storyteller** | Beat loop, skills, Humanizer, other artifacts | The writing system. Starts small; same agents you have today until Phase 2. |

Do not start a later phase until the previous **Exit** is green. Loop Creator and 3D Canvas stay out of scope except where a shared file (gateway, auth, CI, eval harness) is touched.

Action numbers in parentheses are ids from `actions.md`. They are **mapped**, not executed in opus order.

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
| Deterministic lint **in** beat-draft: causal graph, live `setups` table (kill jsonb duplicate), hygiene, POV-noun filter | 19, 12 (partition only) |
| Author-truth never in Author context (prompt partition, not a ledger table yet) | 12 |
| Bind `memory: { thread, resource }` on live SSE; one key helper `(projectId, episodeId, userId)`; bound `lastMessages` including MCP | 31 (bind + bound; expiry can wait) |
| Muse `wildcards` on the tool schema + forward. Delete dead wrappers. Do not build the `@mention` specialist roster | 5.1, 11 (`brainstorm` only) |
| Finding schema on **existing** critics (location + quote required) if not already | 13 |

**Exit.** A mechanically broken beat returns to Author with $0 critic spend. Author cannot see the twist. Cross-domain import probe fails closed. A retried paid task does not create a second Meshy/tile generation. Trace tests red if a critic is deleted.

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

## Phase 3 — Same shape, other artifacts

| Work | Actions / findings |
|---|---|
| `artifact-draft` (or a `type` on one workflow): character, bible section, premise — schema + 1–2 scopes + existing `SectionPendingOverlay`. **No Humanizer** | 26 |
| Prompt registry: generate buttons stop holding prose; hash joins eval artifact | 29 |
| `fix-inconsistencies` stays the sweep; do not rebuild as five beat critics | 16 (keep, don’t add showcase twin) |
| Final episode compile: heavy beat path + **one** Humanizer pass on compiled prose | 16, 17 |
| Memory TTL / prune on migrated `mastra_*` tables | 31 (expiry) |
| Judge calibration, pairwise, GRRM rubric on **plans**, verbosity control vs de-slop | 21, 23 |
| Voice fingerprints + extractor tests + min-token floor (stylometry is free only if the extractor is honest) | 32 |

**Exit.** A faction that contradicts world logic is a `Finding` and does not commit. Beat traces still show **three** critic spans, not five. Generate controls contain no prompt paragraphs.

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
| 16 | Three workflows (heavy / light / sweep) | 3 `artifact-draft`; no showcase autonomy |
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
| 30 | Chat verdict wire | 0 (pixels later, unverified) |
| 31 | Memory bind/bound/expire | 1 bind+bound, 3 expire |
| 32 | Voice fingerprints | 3 |

Overview-only items with no action id: constants functions incentive → Phase 2; `toLegacyAsset` dropped thumbnail → with the next 2D/3D contract touch in Phase 1; bible-tools / model-config size → extract when those files are next edited, not a phase gate.

---

## How to use this

1. Phase 0 is one engineering slice (platform + storyteller in the same PR series). It is security + persist + CI + eval honesty. No new agent.
2. Phase 1 is still zero new agents.
3. Phase 2 is the first writing-quality change (skills + Humanizer). Latency is the kill switch.
4. Phase 3 is bible/characters/final-draft. Same shape, cheaper budget.
5. Phase 4 is a backlog with promotion tests, not a roadmap sprint.

When later editing these files, this file still wins on: regex-injection is not P0, latency is a Phase 0 constraint, three critics not five, host owns commit, all 32 ids stay mapped (none silently dropped). `target-architecture.md`, `actions.md`, `evaluation.md`, `diagrams.md`, `overview.md` §8, and `learning-materials.md` now state that same contract.
