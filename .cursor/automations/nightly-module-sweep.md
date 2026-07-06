# Automation draft — nightly module sweep

Always-on cloud agent that iterates every `src/domains/*` module through the Fabro `execute` sandbox overnight and opens one PR per module that produced changes. Materialize via the Automations editor: open the Agents Window, run `/automate`, and paste the YAML draft below.

## Behavior

Runs on a cron schedule (02:00 daily by default). For each folder under `src/domains/`:

1. Launch `fabro run .fabro/workflows/execute/workflow.toml -I module=<folder> --environment execute-docker`.
2. Use the `fabro` MCP (`fabro mcp start`) to poll run status and capture the run id.
3. On success, `fabro pr create <run-id>` opens a PR from the `fabro/run/<run-id>` branch.
4. On failure or `retro` with no changes, log to the run summary and skip.

The Verification gate's safe timeout default is `retro` (plan-only) — **never auto-builds** unattended. To actually build overnight, pass `--auto-approve` explicitly in the prompt (operator opt-in). Without it, the sweep produces plans (`PLAN.md` / `STRUCTURE.md`) only.

## YAML draft (wire payload for `open_automation`)

```yaml
name: "Nightly module sweep"
description: "Iterate src/domains/* through the Fabro execute sandbox overnight; open a PR per module with changes."
workflow:
  triggers:
    - cron:
        cron: "0 2 * * *"
  actions:
    - prComment: {}
  prompts:
    - |
      For each folder F under src/domains/, run:
      `fabro run .fabro/workflows/execute/workflow.toml -I module=F --environment execute-docker`
      Use the fabro MCP to poll run status. On success with code changes, run
      `fabro pr create <run-id>` and comment the PR URL. Skip modules whose retro
      reports no changes. Do NOT pass --auto-approve unless the operator enabled
      overnight builds (the Verification gate defaults to plan-only on timeout).
  model: ""
  agentOptions:
    skipInstall: false
  memoryEnabled: false
gitConfig:
  repo: "<owner/repo>"
  branch: "main"
```

## To finish in the editor

- Set `gitConfig.repo` to the actual `owner/repo`.
- Adjust the cron expression if 02:00 local isn't the right window.
- Confirm Cloud compute in the Cloud Agent dashboard.
- If overnight builds are desired, add `--auto-approve` to the prompt as an explicit operator choice.
