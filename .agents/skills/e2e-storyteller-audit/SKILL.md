---
name: e2e-storyteller-audit
description: Audit storyteller E2E tiers — Playwright smoke vs legacy e2e/agent scripts — and produce a keep/migrate/delete plan aligned with workflow + SSE contract. Run before deleting agent-core workspace tests or changing smoke scenarios.
---

# E2E Storyteller Audit

**Read-only** audit of storyteller end-to-end coverage. Extra context:

> {{user_input}}

Do **not** delete `e2e/` files in this skill — produce a tier map and migration plan.

**Read first:** `docs/TESTING.md`, `docs/internal/testing/e2e.md`, `e2e/scenarios/storyteller-smoke.script.ts`, `.agents/skills/sse-wire-contract/SKILL.md`.

## Step 1 — Inventory tiers

```bash
echo "=== Playwright scenarios ==="
ls -la e2e/scenarios/
rg -n "npm run test:e2e" package.json scripts/

echo "=== Legacy agent scripts ==="
find e2e/agent -name '*.ts' | sort

echo "=== Storyteller API touchpoints ==="
rg -l 'storyteller' e2e/ src/app/api/storyteller/
```

Fill:

| Tier | Location | Runner | CI? | Purpose today |
| --- | --- | --- | --- | --- |
| Playwright smoke | `e2e/scenarios/storyteller-smoke.script.ts` | `npm run test:e2e smoke` | No | SSE stream, actions, phases |
| Legacy agent | `e2e/agent/*.ts` | ad-hoc `tsx` | No | agent-core workspace, multi-agent |
| Unit colocated | `src/**/__tests__/**` | `npm run test:unit` | Yes | tools, domain logic |

## Step 2 — Classify each legacy script

For every file under `e2e/agent/`:

| File | Depends on | Still valid after GRRM cut? | Verdict |
| --- | --- | --- | --- |
| `verify-workspace.ts` | `agent-core/workspace`, skills | Likely **DELETE** or archive | council-era |
| `integration-full-flow.ts` | old orchestration | **MIGRATE** or delete | |
| `verify-multi-agent-conversation.ts` | council graph | **DELETE** | |
| `script-writer.ts` | | | |
| `verify-execution.ts` | | | |

Verdicts: **KEEP**, **MIGRATE** (into smoke or unit), **DELETE**, **DEFER**.

## Step 3 — SSE contract alignment

Cross-check smoke assertions against `/sse-wire-contract`:

```bash
rg -n "type:|SSEEvent|parseSSE" e2e/scenarios/storyteller-smoke.script.ts
rg -n "WORKFLOW|suspend|verdict" e2e/ src/app/api/storyteller/
```

List frame types the smoke test expects today vs what the workflow adapter will emit after migration.

Flag gaps:

- [ ] Workflow suspend / resume not covered
- [ ] New action types from beat workflow
- [ ] Auth cookie / project id env vars documented

## Step 4 — Propose target state

Recommend a **two-tier** storyteller E2E model:

1. **Smoke (Playwright)** — fast, HTTP/SSE only, no LLM quality assertions; runs against local dev or preview URL.
2. **Eval (Mastra scorers)** — prose quality offline via `/storyteller-eval-golden` — not Playwright.

Legacy `e2e/agent/*` should not duplicate smoke or eval. Prefer **one** smoke script + unit tests for tools/workflows.

## Step 5 — Migration waves

Always recommend:

1. **Wave 0** — document env vars (`TEST_BASE_URL`, `TEST_PROJECT_ID`, `TEST_AUTH_COOKIE`) in `docs/internal/testing/e2e.md`
2. **Wave 1** — extend smoke for new SSE frames (minimal)
3. **Wave 2** — delete or move legacy scripts; grep zero imports from CI/docs
4. **Wave 3** — optional Playwright workflow suspend fixture (only if product requires)

Include grep checkpoints:

```bash
rg 'e2e/agent' docs/ package.json scripts/ .github/
rg 'verify-workspace|integration-full-flow' src/ e2e/
```

## Step 6 — Deliverable

Post markdown:

- Tier table (current → target)
- Per-file verdicts for `e2e/agent/`
- Smoke gaps vs SSE contract
- Deletion order + env var checklist
- Minimum increment (e.g. "update smoke for `workflow_step` frame only")

Stop — hand off implementation to plan/developer; use `/write-tests` for new unit coverage.
