# Plan workflow — UI & artifacts

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
   scope table (from `findings/assess.md`). Dock buttons are generic **[A] Staged** ·
   **[B] Minimal** · **[C] Full** · **[F]** custom · **[R]** re-assess — the prep
   summary defines what A/B/C mean for **this** module. Do not commit `CLARIFY.md` /
   `DECISIONS.md` (stale files poison Docker clones).
2. **Verification** (after Plan): `[B]` approve & build · `[P]` plan only ·
   `[I]` iterate (freeform) · `[X]` abort
3. **Preview** (build path, UI increments only): `[A]` looks good · `[R]` revise
   (freeform, back to Implement) · `[S]` skip

**Timeout defaults (`human.default_choice`).** Every gate has a 24h `timeout` plus a
safe default so it never hangs indefinitely:

| Gate | On timeout → | Why |
| --- | --- | --- |
| Clarify | `plan` (recommended [A] scope) | keeps planning moving |
| Verification | `Retro` (plan-only) | **never auto-builds** unattended |
| Preview | `Retro` (finish) | no destructive action |

**Fail closed.** Per the docs, `Interrupted`/`Skipped` answers never fall through to
an approval edge. Each gate has an explicit `condition="outcome=failed"` → **Exit**
route so an unanswered/disconnected gate ends cleanly instead of silently stuck.
Auto-approve (`--auto-approve`) selects the first option (Clarify `[A]`,
Verification `[B]`) — an explicit operator choice, distinct from an unanswered prompt.

## Preview ([preview](https://docs.fabro.sh/human-tools/preview))

For UI increments the build path runs a **Dev server** stage (`npm run dev` on
port 3000, backgrounded) then pauses at the **Preview** gate so you can open the
running app before finishing.

Preview URLs **require the Daytona provider** — local/docker sandboxes cannot serve
previews (the gate still pauses for manual review, just without a URL). To actually
preview:

```bash
fabro run .fabro/workflows/plan/workflow.toml -I module=interior-designer \
  --environment plan-daytona --preserve-sandbox
# at the Preview gate:
fabro sandbox preview <run-id> 3000 --open     # or the Preview button in the web UI
```

`--preserve-sandbox` keeps the sandbox alive so preview URLs work after the run ends.

## Artifacts

| File | Written by |
| --- | --- |
| `findings/assess.md` | Assess |
| `CLARIFY.md` | Clarify Prep |
| `DECISIONS.md` | Plan (updates with human choices) |
| `PLAN.md` | Plan (Architect) |
| `UX.md` | UX Designer (build path only) |
| `screenshots/**`, `SCREENSHOTS.md` | UI Screenshot (build path only) |
| `RETRO.md` | Retro |
## Developer skills ([skills](https://docs.fabro.sh/agents/skills))

The 16 skills live in `.fabro/skills/*/SKILL.md` (valid YAML frontmatter) and the
**Implement** stage has `permissions="full"` + a `use_skill` table in its prompt.

**Gotcha for sandboxed runs (why you saw `skills 0/0`):** Fabro runs skill
**discovery on the local server**, not inside the sandbox. It searches, in order:

```
~/.fabro/skills            → resolves to the Mac home (LOCAL)
{git_root}/.fabro/skills   → resolves to the SANDBOX path /workspace/<repo>/.fabro/skills
{git_root}/skills
```

For a Docker/Daytona run the `{git_root}` path is a **container** path that doesn't
exist on the Mac, so the committed project skills are never found — discovery returns
`[]` and the agent shows `0/0`. The only reliably-scanned dir is the **global** one.

**Fix (local, one-time):** symlink the global dir at the repo skills so they're always
discovered:

```bash
ln -s "$PWD/.fabro/skills" ~/.fabro/skills   # run once from the repo root
```

`agent.skills.discovered` in the run events should then list all 16 skills. This
symlink is machine-local (not committed) — recreate it on a new machine.

## Build path routing

- **`plan.has_ui_surface=yes`** (set by Plan Author `context_updates`) → Bootstrap →
  **UX Designer** → Implement → verify → test → e2e → Screenshot → **Dev server** →
  **Preview** gate → Retro.
- **`plan.has_ui_surface=no`** (typical backend cleanup) → Bootstrap → **Implement**
  (skips UX Designer) → verify → test → e2e → Screenshot → Retro (skips Preview).
- **Bootstrap failure** → `setup_fail` shell stage with a clear error → Exit (does
  not continue to Implement).

## Browser / screenshots

Build path only, after e2e: **UI Screenshot** uses Playwright **CLI** (`npx playwright
screenshot`) post-bootstrap — run-level Playwright MCP is disabled to avoid ~30s
startup delay on plan-path agents before `npm ci`.

## Docker image

`[environments.plan-docker.image]` uses **`docker = "node:22-bookworm"`** (has git +
node + npm). The `-slim` variant lacks git and fails Fabro's clone step. The Docker
provider ignores `image.dockerfile`, so the image must ship git itself.

For **preview**, use `[environments.plan-daytona]` (`--environment plan-daytona`) —
Daytona is the only provider that serves preview URLs.

## Build performance / optimizations

| Lever | Where | Effect |
| --- | --- | --- |
| Node heap `--max-old-space-size=4096` + 6GB/4cpu | `[environments.plan-docker].env`/`.resources` + `verify` script | stops `tsc` OOM (~2GB default heap) |
| `npm ci --prefer-offline --no-audit --no-fund` | Bootstrap script | skips audit/funding network calls |
| Targeted typecheck (`npx tsc-files --noEmit` on `git diff` files) | developer self-check in `implement.md` | checks only changed files + type deps (respects tsconfig aliases); full `tsc` still runs in `verify` |
| Targeted lint (`eslint` on `git diff` files) | developer self-check in `implement.md` | avoids false failures from pre-existing errors in untouched modules; full lint still runs in `verify` |
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

Fix loops bail out with `condition="internal.node_visit_count < 4"` (the docs'
fixed-count-loop pattern) → **Retro** after repeated failures, so a stuck build
documents itself instead of hard-failing on `developer`'s `max_visits`.

Routing reads context set by earlier stages: `plan.has_ui_surface` (UX/Preview
routing), `outcome` (gate pass/fail), `human.gate.*` (Clarify/Verification choices).

## Reusable across modules ([variables](https://docs.fabro.sh/workflows/variables))

**Module is required on every run** — there is no default in the workflow:

```bash
fabro run .fabro/workflows/plan/workflow.toml -I module=<domain-folder>
```

`<domain-folder>` is the name under `src/domains/` (e.g. `interior-designer`,
`storyteller`, `chat`). Fabro renders `{{ inputs.module }}` only in **`goal` and
`prompt`** attributes ([docs](https://docs.fabro.sh/workflows/variables)) — not in
shell `script` or environment `env`. The **Scope** stage is therefore a prompt node
(`prompts/scope.md`) so the module path is templated correctly.

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

## Child runs — deliberate non-goal

Not used. Single linear pipeline for one module.

## Docker bootstrap (build path only)

Clone-based Docker has no `node_modules`. **[B] Approve & build** runs **Bootstrap** first (`npm ci` + Playwright install). Commit and push before running. **[P] Plan only** skips bootstrap.
