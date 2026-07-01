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

## Human gates in this workflow

Fabro shows the **preceding stage's final response** in the dock — not repo files.
Gate labels and button text must be self-contained; never "read X.md".

1. **Clarify** (before Plan): Clarify Prep's final response has the full decision
   table. Buttons: `[A]` staged · `[B]` minimal first step · `[C]` full blueprint
   · `[F]` custom (freeform) · `[R]` re-assess
2. **Verification** (after Plan): `[B]` approve & build · `[P]` plan only ·
   `[I]` iterate (freeform) · `[X]` abort

No `human.default_choice` — gates fail closed until you answer ([human-in-the-loop](https://docs.fabro.sh/workflows/human-in-the-loop)).

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

## Developer skills

Skills in `.fabro/skills/` are auto-discovered. The **Implement** stage has
`permissions="full"` and its prompt instructs the agent to call `use_skill` for
`refactor`, `write-tests`, `services-audit`, `trigger-dev`, etc. You should see
skill activations in the stage's **skills** projection in the Fabro UI.

## Build path routing

- **`plan.has_ui_surface=yes`** (set by Plan Author `context_updates`) → Bootstrap →
  **UX Designer** → Implement.
- **`plan.has_ui_surface=no`** (typical backend cleanup) → Bootstrap → **Implement**
  (skips UX Designer).
- **Bootstrap failure** → `setup_fail` shell stage with a clear error → Exit (does
  not continue to Implement).

## Browser / screenshots

Build path only, after e2e: **UI Screenshot** uses Playwright **CLI** (`npx playwright
screenshot`) post-bootstrap — run-level Playwright MCP is disabled to avoid ~30s
startup delay on plan-path agents before `npm ci`.

## Docker image

`[environments.plan-docker.image]` uses **`docker = "node:22-bookworm-slim"`** (cache
key includes Node) plus `../../docker/plan-sandbox.Dockerfile` for git. Do not rely
on the default `buildpack-deps:noble` snapshot — it has no npm.

## Local sandbox vs Files Changed

**Local** provider runs in your working tree. **Files Changed** shows git checkpoints from the run; untracked files (`?? PLAN.md`) may show as **0 files changed**. Open artifacts from disk or the stage Thread view. For diff UI, use **Docker** or **Daytona** sandbox.

## Reusable across modules ([variables](https://docs.fabro.sh/workflows/variables))

Parameterized via `[run.inputs] module`. The `goal` and prompts use `{{ inputs.module }}`.

```bash
fabro run .fabro/workflows/plan/workflow.toml               # interior-designer (default)
fabro run .fabro/workflows/plan/workflow.toml -I module=storyteller
fabro run .fabro/workflows/plan/workflow.toml -I module=chat
```

The `scope` shell script reads `FABRO_INPUT_MODULE` (default `storyteller`).

## Model resilience ([fallbacks](https://docs.fabro.sh/execution/failures))

`codex` + `gpt-5.4` share one usage-limited OpenAI account. `[run.model].fallbacks = ["anthropic", "openai"]` makes Fabro switch to Anthropic on `usage_limit_reached`.

## Child runs — deliberate non-goal

Not used. Single linear pipeline for one module.

## Docker bootstrap (build path only)

Clone-based Docker has no `node_modules`. **[B] Approve & build** runs **Bootstrap** first (`npm ci` + Playwright install). Commit and push before running. **[P] Plan only** skips bootstrap.
