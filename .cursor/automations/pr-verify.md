# Automation draft — PR verify + eval (opt-in)

**Not active until materialized.** Requires Cursor Cloud Agents + `/automate`. Paste the YAML below into the Automations editor when ready.

Always-on cloud agent that runs the dark-factory verify gates on every PR and comments a summary. Materialize via the Automations editor: open the Agents Window, run `/automate`, and paste the YAML draft below, or use `cursor-app-control.open_automation` with `prefillWorkflowData`.

## Behavior

On pull-request open (and on new pushes), a cloud agent checks out the PR branch and runs:

1. `node scripts/fabro-verify.mjs` — module-scoped typecheck + lint (reads module from `PLAN.md`; falls back to changed-file scope).
2. `npm run test:unit` — vitest.
3. `npm run eval -- --samples=3` — Mastra scorers on the 12 golden examples (only when the PR touches `src/domains/storyteller/` or `evals/`).
4. `npx knip` — dead code (non-blocking).

Post a single PR comment with a pass/fail table + eval deltas vs `evals/results/latest.json` baseline. Do not push, do not force anything. Computer-use is not needed for this automation.

## YAML draft (wire payload for `open_automation`)

```yaml
name: "PR verify + eval"
description: "Run fabro-verify, unit tests, and a 3-sample eval on PRs; comment a summary."
workflow:
  triggers:
    - git:
        pullRequest:
          action: GIT_PULL_REQUEST_ACTION_OPENED
    - git:
        pullRequest:
          action: GIT_PULL_REQUEST_ACTION_PUSHED
  actions:
    - prComment: {}
  prompts:
    - |
      Check out the PR branch. Run `node scripts/fabro-verify.mjs`, then `npm run test:unit`,
      then `npm run eval -- --samples=3` (only if the diff touches src/domains/storyteller/
      or evals/), then `npx knip` (non-blocking). Post ONE PR comment with a pass/fail table
      and eval score deltas vs evals/results/latest.json. Do not push or amend.
  model: ""
  agentOptions:
    skipInstall: false
  memoryEnabled: false
gitConfig:
  repo: "<owner/repo>"
  branch: "main"
ignoreDraftPrs: true
```

## To finish in the editor

- Set `gitConfig.repo` to the actual `owner/repo`.
- Confirm Cloud compute in the Cloud Agent dashboard.
