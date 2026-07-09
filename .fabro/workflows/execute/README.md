# Execute workflow — UI & artifacts

## Agent sharing (Fabro + Cursor + Claude)

**The prompt file is the agent.** Stage bodies live once in **`.agents/execute/`**.

| Runner | Loads prompts via |
| --- | --- |
| **Fabro** | `workflow.fabro` → `prompt="@../../../.agents/execute/<stage>.md"` |
| **Cursor** | `.cursor/agents/<adapter>.md` → `Read` `.agents/execute/<stage>.md` |
| **Claude Code** | `.claude/agents/<adapter>.md` → `Read` `.agents/execute/<stage>.md` |

**Thin adapters** (`.cursor/agents/`, `.claude/agents/`) hold YAML frontmatter (`name`, `description`, `model`) + a pointer to the matching `.agents/execute/` file. **Do not duplicate prompt content in adapters** — it will drift.

**Configuration diagram** (goals entry, stage agents, skills aggregate): [.agents/CONFIGURATION.md](../../../.agents/CONFIGURATION.md).

Agents may optionally use **`.local/tmp/{session-id}/`** for throwaway recon artifacts (gitignored) — see `.agents/execute/partials/session-scratch.md`.

**Quality backlog (many gate failures):** `.local/quality-backlog.md` via `npm run qualitygate:capture` — fix one-by-one, rescan every **5** steps — see `.agents/execute/partials/quality-backlog.md` (included in Implement).

| Stage | Prompt (`.agents/execute/`) | Cursor adapter | Claude adapter | Artifact |
| --- | --- | --- | --- | --- |
| Scope | `scope.md` | `scope-runner.md` | `scope-runner.md` | `.local/findings/scope.md` |
| Clarify Prep | `clarify-prep.md` | `clarify-facilitator.md` | `clarify-facilitator.md` | `CLARIFY.md`, `DECISIONS.md` |
| Plan | `plan.md` | `plan-author.md` | `plan-author.md` | `PLAN.md`, `STRUCTURE.md` |
| Implement | `implement.md` | `developer.md` | `developer.md` | code changes |
| Retro | `retro.md` | `retro-author.md` | `retro-author.md` | `RETRO.md` |

Legacy path `.fabro/workflows/execute/prompts/` is retired — see `prompts/README.md`.

**Data flow:** Scope → Clarify only (`.local/findings/scope.md`). Plan does **not** read
Scope output — it discovers the codebase via spot-checks + human's Clarify choice.

**Depth targets (quality bar):**

| Stage | Agent-heavy module (e.g. storyteller) | Typical module |
| --- | --- | --- |
| Scope (`.local/findings/scope.md`) | **≥120 lines** — subsystem map, 8–12 tensions, 5–7 Clarify axes | **≥60 lines** |
| Plan (`PLAN.md`) | **35–55 items**, **≥500 lines** — spot-check evidence, rewiring matrix, deletion order, risk register | **15–25 items**, **≥200 lines** |

Shallow scope or plan output should be treated as a failed stage — re-run or iterate at Verification **[I]**.

Interactive IDE path: `/execute` skill → spawns Cursor subagent → subagent `Read`s
prompt → executes. Sandboxed path: `fabro run …` reads prompt directly.

## Where to find things in the Fabro web UI

Run detail: `http://127.0.0.1:32276/runs/<run-id>`

| What you want | Where in UI |
| --- | --- |
| **Clarify** / **Verification** decisions | **Bottom dock** (interview controls) while the run is blocked; also listed under **Stages** |
| **Retro** output | **Stages** → click **Retro** → Thread view (markdown) |
| **PLAN.md**, **CLARIFY.md**, **DECISIONS.md**, **RETRO.md** | Repo root on disk; or **Plan** stage → Thread; **Files Changed** only if sandbox git-checkpoints (Docker/Dayona) |
| Token spend | **Billing** tab |
| Graph with agent labels | Sidebar **Graph Source** or workflow graph on run page |

Fabro does **not** support custom tabs named "Verification" or "Retro" next to Sandbox / Files Changed. Those steps appear as **named stages** in the graph and Stages list, plus the **dock** for human gates.

## Human gates in this workflow ([interviews](https://docs.fabro.sh/human-tools/interviews) · [human-in-the-loop](https://docs.fabro.sh/workflows/human-in-the-loop))

Fabro shows the **preceding stage's final response** in the dock — not repo files.
Gate labels and button text must be self-contained; never "read X.md".

Each `hexagon` gate infers `multiple_choice` from its edge labels; the `[K] Label`
prefixes are the keyboard accelerators. Edges with `freeform=true` add a free-text
fallback (routed to `human.gate.text`).

1. **Clarify** (before Plan): Clarify Prep's final response has the **module-specific**
   scope table (from `.local/findings/scope.md`). Dock buttons are generic **[A] [B] [C]**
   · **[F]** custom · **[R]** re-scope — the prep summary defines what A/B/C mean
   for **this** module. Do not commit `CLARIFY.md` / `DECISIONS.md` (stale files
   poison Docker clones).
2. **Verification** (after Plan): **[A]** approve & build · **[B]** plan only ·
   **[I]** iterate (freeform notes only — not "A" from Clarify) · **[X]** abort

**Timeout defaults (`human.default_choice`).** Every gate has a 24h `timeout` plus a
safe default so it never hangs indefinitely:

| Gate | On timeout → | Why |
| --- | --- | --- |
| clarify | `plan` (recommended [A] scope) | keeps planning moving |
| verification | `retro` (plan-only) | **never auto-builds** unattended |

**Fail closed.** Per the docs, `Interrupted`/`Skipped` answers never fall through to
an approval edge. Each gate has an explicit `condition="outcome=failed"` → **Exit**
route so an unanswered/disconnected gate ends cleanly instead of silently stuck.
Auto-approve (`--auto-approve`) on Clarify picks edge **`[A]`** only (the literal graph
label — **not** your module-specific meaning). It does **not** substitute for the
Clarify Prep dock brief. **Do not use `--auto-approve` on runs where you need to read
or review Clarify options** — use it only for unattended Verification → build after
you have already chosen scope manually, or accept that Clarify will auto-pick `[A]`
without showing module-specific A/B/C text in the dock buttons.

Clarify Prep **must** still emit the full 3-question + A/B/C table every time (see
`clarify-prep.md`).

## Artifacts

| File | Written by |
| --- | --- |
| `.local/findings/scope.md` | Scope (Clarify input only — Plan does not read this; target **≥120 lines** for agent-heavy modules) |
| `CLARIFY.md`, `DECISIONS.md` | Clarify Prep |
| `PLAN.md` | Plan (Architect — agent-heavy runs target **≥500 lines**, 35–55 numbered items) |
| `RETRO.md` | Retro (evidence-based — git diff verified) |
## Developer skills ([skills](https://docs.fabro.sh/agents/skills))

**20 skills** live in **`.agents/skills/*/SKILL.md`** (canonical). **`.fabro/skills`** is a symlink → `.agents/skills/` for sandbox `{git_root}` discovery. **Cursor** and **Claude Code** use symlinks under `.cursor/skills/` and `.claude/skills/`. See [`.agents/skills/README.md`](../../../.agents/skills/README.md).

The **Implement** stage has `permissions="full"` + a `use_skill` table in `.agents/execute/implement.md`.

**Gotcha for sandboxed runs (why you saw `skills 0/0`):** Fabro runs skill
**discovery on the local server**, not inside the sandbox. It searches, in order:

```
~/.fabro/skills            → resolves to the Mac home (LOCAL)
{git_root}/.fabro/skills   → symlink to .agents/skills/ in the sandbox clone
{git_root}/skills
```

For a Docker/Daytona run the `{git_root}` path is a **container** path that doesn't
exist on the Mac, so the committed project skills are never found — discovery returns
`[]` and the agent shows `0/0`. The only reliably-scanned dir is the **global** one.

**Fix (local, one-time):** copy canonical skills into the global dir as **real files**
(not a symlink). Fabro's skill discovery glob is symlink-safe — it does **not**
descend into a `~/.fabro/skills` symlink, so a symlinked dir shows `0/0` even though
the `SKILL.md` files are visible on disk:

```bash
rm -rf ~/.fabro/skills                          # remove old symlink (if present)
mkdir -p ~/.fabro/skills
cp -R .agents/skills/. ~/.fabro/skills/         # run from the repo root
```

Re-run the copy after you add or change a skill under **`.agents/skills/`**. After it,
`agent.skills.discovered` in the run events lists all 20 skills. This copy is
machine-local (not committed) — recreate it on a new machine.

## Build path routing

- **All increments** → Bootstrap (`npm ci`) → **Implement (codex)** → **Verify**
  (`fabro-verify.mjs` = module typecheck + lint + module UT, **then husky pre-commit parity**: architecture, docs, full unit tests, production build) → **Retro**.
- **Verify fix loop:** up to 3 retries back to Implement; then **ship anyway** to Retro
  (verify failure does not block PR).
- No UX Designer, Tester, E2E, Screenshot, or Preview stages in the simplified graph.
- **Assess** stage removed — Clarify Prep works from Scope output only.

## Docker image

`[environments.execute-docker.image]` uses **`docker = "node:22-bookworm"`** (has git +
node + npm). The `-slim` variant lacks git and fails Fabro's clone step. The Docker
provider ignores `image.dockerfile`, so the image must ship git itself.

For **preview**, use `[environments.execute-daytona]` (`--environment execute-daytona`) —
Daytona is the only provider that serves preview URLs.

## Build performance / optimizations

| Lever | Where | Effect |
| --- | --- | --- |
| Node heap `--max-old-space-size=6144` + 8GB/4cpu | `[environments.execute-docker].env`/`.resources` + `fabro-verify.mjs` | module-scoped `tsc` avoids full-repo OOM |
| `node scripts/fabro-verify.mjs` | `verify` shell + `implement.md` self-check | module-scoped tsc + ESLint; then **pre-commit parity** (architecture, docs, `test:unit`, `build`) — commit-ready handoff |
| `npm ci --prefer-offline --no-audit --no-fund` | Bootstrap script | skips audit/funding network calls |
| `grep`, not `rg` | assess/plan prompts | ripgrep isn't installed pre-Bootstrap |
| Read-before-write reminder | assess/clarify-prep prompts | avoids blocked `write_file` on pre-existing `.md` files |

**Not yet done — npm cache volume.** `npm ci` re-downloads deps each build run. A
persistent npm cache (Docker volume mounted at `/root/.npmcache` with
`npm_config_cache`) or a pre-baked image with `node_modules` would save ~2 min/run,
but the Docker provider here uses a clean clone with no volume mount configured.

## Local sandbox vs Files Changed

**Local** provider runs in your working tree. **Files Changed** shows git checkpoints from the run; untracked files (`?? PLAN.md`) may show as **0 files changed**. Open artifacts from disk or the stage Thread view. For diff UI, use **Docker** or **Daytona** sandbox.

## Context & fidelity ([context](https://docs.fabro.sh/execution/context))

Fidelity is tuned per-transition so each stage gets exactly the context it needs:

| Transition | Fidelity | Why |
| --- | --- | --- |
| `scope → assess` | `compact` | assess reuses the module file tree from scope's `command.output`; `summary:medium` can truncate a 120-line tree |
| build cluster (nodes) | `full` + `thread_id=build` | UX→Implement→Tester share one conversation |
| Fix loops (`*_gate → developer`) | `compact` | `full` gives **no preamble**, so the developer wouldn't see the failing typecheck/lint/test `command.output`; compact injects it |
| `Preview → developer` (revise) | `compact` | surfaces the reviewer's `human.gate.text` note |
| everything else | `summary:medium` (graph default) | lean preambles |

Fix loops: `verify` fails → **Implement (codex)** while `internal.node_visit_count < 4`
(1 initial + 3 fix turns). After that → **Retro** unconditionally (**ship anyway** —
verify failure does not block PR).

Routing reads context set by earlier stages: `outcome` (verify pass/fail),
`human.gate.*` (Clarify/Verification choices).

## Reusable across modules ([variables](https://docs.fabro.sh/workflows/variables))

**Module is required on every run** — there is no default in the workflow:

```bash
fabro run .fabro/workflows/execute/workflow.toml -I module=<domain-folder>
```

`<domain-folder>` is the name under `src/domains/` (e.g. `interior-designer`,
`storyteller`, `chat`). Special module inputs:

| `module=` | Scope |
| --- | --- |
| **`domains-catalog`** | All 9 modules under `src/domains/` — ideal trees + referrer sweep |
| **`src-root`** | Top-level `src/` folders vs §3 topology (`lib/`, `agent-core/` → `shared/`, etc.) |

Fabro renders `{{ inputs.module }}` only in **`goal` and
`prompt`** attributes ([docs](https://docs.fabro.sh/workflows/variables)) — not in
shell `script` or environment `env`. The **Scope** stage is therefore a prompt node
(`.agents/execute/scope.md`) so the module path is templated correctly.

### Domains catalog cleanup (ideal structure + all referrers)

Design **ideal folder trees** in `STRUCTURE.md`, plan **50–100 todos**, then on
approve move files and **update every file that references old paths** (not just
inside the module).

```bash
fabro run .fabro/workflows/execute/workflow.toml \
  -I module=domains-catalog
```

Deliverables: `STRUCTURE.md` (ideal trees + move map) → `PLAN.md` (moves + grep-driven
referrer todos) → optional implement Wave 1 (storyteller + full referrer sweep).

At **clarify**, pick **A** (structure for all modules; implement storyteller wave + referrers),
**B** (structure + plan only), or **C** (full catalog). Recommend **A**.

### src-root cleanup (top-level `src/` vs §3 topology)

Design **ideal top-level `src/` layout** in `STRUCTURE.md` (disposition table +
move map), plan **40–80 todos**, then on approve move legacy folders (`lib/`,
`agent-core/`, `hooks/`, …) into `shared/` / `domains/` with full referrer sweep.
**Plan stage uses `claude-fable-5` only** (no fallback).

```bash
fabro run .fabro/workflows/execute/workflow.toml \
  -I module=src-root \
  --label "planner=claude-fable-5"
```

Deliverables: `STRUCTURE.md` (src-root section) → `PLAN.md` (must include
`Fabro module: src-root` for verify) → optional Wave 1 implement (`shared/` stubs
+ highest-traffic `lib/`/`agent-core` re-exports).

At **clarify**, pick **A** (structure for all top-level folders; implement Wave 1), **B** (plan only),
or **C** (full src-root migration). Recommend **A**.

**Skills:** copy **`.agents/skills/`** to `~/.fabro/skills/` (real files, not symlink) —
see Developer skills section above.

## Merging when the run succeeds

Fabro checkpoints code on a managed branch `fabro/run/<run-id>` (pushed to origin
when `[run.run_branch].push = true`).

1. **Review** — Fabro UI → **Files Changed** (sandbox git diff) or the run's final
   branch on GitHub.
2. **Open a PR** (recommended):
   ```bash
   fabro pr create <run-id>
   ```
   Then review and merge on GitHub, or `fabro pr merge <run-id>` if the PR is linked.
3. **Manual merge** — fetch the run branch and merge locally:
   ```bash
   git fetch origin fabro/run/<run-id>
   git checkout main && git merge origin/fabro/run/<run-id>
   ```

Plan-only path (`[P]` at Verification) still produces `PLAN.md` / `DECISIONS.md` on
the run branch — merge those the same way if you want them on `main` without building.

## Model resilience ([fallbacks](https://docs.fabro.sh/execution/failures))

`codex` + `gpt-5.4` share one usage-limited OpenAI account. `[run.model].fallbacks = ["anthropic", "openai"]` makes Fabro switch to Anthropic on `usage_limit_reached`.

**Plan model policy:** Plan is **claude-fable-5 only** — no fallback to Opus, Sonnet,
or GPT. The `.planning` stylesheet sets the model (highest precedence), so
`[run.model].fallbacks` does not apply to Plan. Transient Anthropic errors get
`retry_policy=patient` + `max_retries=2`; if fable-5 still fails, the **whole run
aborts** (`plan → exit`) — no build, no Retro.

## Child runs — deliberate non-goal

Not used. Single linear pipeline for one module.

## Docker bootstrap (build path only)

Clone-based Docker has no `node_modules`. **[A] Approve & build** runs **Bootstrap** first (`npm ci` + Playwright install). Commit and push before running. **[B] Plan only** skips bootstrap.
