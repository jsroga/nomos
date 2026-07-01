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

1. **Clarify** (before Plan): `[A]` defaults · `[B]` first increment · `[C]` full migration · `[F]` custom (freeform) · `[R]` re-assess (freeform)
2. **Verification** (after Plan): `[B]` approve & build · `[P]` plan only · `[I]` iterate (freeform) · `[X]` abort

No `human.default_choice` — gates fail closed until you answer ([human-in-the-loop](https://docs.fabro.sh/workflows/human-in-the-loop)).

## Artifacts

| File | Written by |
| --- | --- |
| `findings/assess.md` | Assess |
| `CLARIFY.md` | Clarify Prep |
| `DECISIONS.md` | Plan (updates with human choices) |
| `PLAN.md` | Plan (Architect) |
| `UX.md` | UX Designer (build path only) |
| `RETRO.md` | Retro |

## Local sandbox vs Files Changed

**Local** provider runs in your working tree. **Files Changed** shows git checkpoints from the run; untracked files (`?? PLAN.md`) may show as **0 files changed**. Open artifacts from disk or the stage Thread view. For diff UI, use **Docker** or **Daytona** sandbox.
