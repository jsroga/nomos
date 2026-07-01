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

## Browser / screenshots ([MCP](https://docs.fabro.sh/agents/mcp))

Build path only: after unit + e2e pass, the **UI Screenshot** stage uses the
**Playwright MCP** (`[run.agent.mcps.playwright]` in `workflow.toml`) to navigate
the running app and capture the changed `{{ inputs.module }}` screens into
`screenshots/`. It's **best-effort** — a single unconditional edge to Retro means
a browser/dev-server failure records the gap in `SCREENSHOTS.md` but never blocks
shipping. Works best on Docker/Daytona sandboxes (current env is Docker). The
agent calls `browser_install` on a fresh sandbox before capturing.

## Reusable across modules ([variables](https://docs.fabro.sh/workflows/variables))

Parameterized via `[run.inputs] module`. The `goal` and prompts use `{{ inputs.module }}`.

```bash
fabro run .fabro/workflows/plan/workflow.toml               # storyteller (default)
fabro run .fabro/workflows/plan/workflow.toml -I module=chat
```

The `scope` shell script cannot template (Fabro only templates `goal`/`prompt`), so it reads `FABRO_INPUT_MODULE` with a `storyteller` default; the Assess agent still gets the correct module via its prompt.

## Model resilience ([fallbacks](https://docs.fabro.sh/execution/failures))

`codex` + `gpt-5.4` share one usage-limited OpenAI account. `[run.model].fallbacks = ["anthropic", "openai"]` makes Fabro switch to Anthropic (credited) on `usage_limit_reached`, auto-picking the closest model per node. Agent stages use `retry_policy="patient"` so a transient limit retries + fails over instead of slipping through.

## Child runs ([docs](https://docs.fabro.sh/execution/child-runs)) — deliberate non-goal

Not used. This is a single linear pipeline for one module; child runs are for orchestrating *independent* runs. A future `plan-fleet` parent could spawn one `plan` child per domain in parallel (surfaced in the **Children** tab) — build only when planning all of `src/domains/*` at once.

## Local sandbox vs Files Changed

**Local** provider runs in your working tree. **Files Changed** shows git checkpoints from the run; untracked files (`?? PLAN.md`) may show as **0 files changed**. Open artifacts from disk or the stage Thread view. For diff UI, use **Docker** or **Daytona** sandbox.
