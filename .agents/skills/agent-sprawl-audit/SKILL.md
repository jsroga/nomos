---
name: agent-sprawl-audit
description: Inventory agents, tools, and orchestration sprawl before simplification — counts, import graph, deletion candidates, and Wave 0 compile blockers. Run BEFORE deleting council/judges or consolidating tools.
---

# Agent Sprawl Audit

**Read-only reconnaissance** before reshaping a domain's agent layer (especially **storyteller**). Extra context:

> {{user_input}}

Do **not** delete files in this skill — produce an audit the plan or developer can execute.

## Step 1 — Scope the module

Default: `storyteller`. If user names another module, replace paths below.

```bash
MOD=storyteller
echo "=== agents ==="
find "src/domains/$MOD/agents" -name '*.ts' 2>/dev/null | sort
find "src/domains/$MOD" -name '*Agent*.ts' | sort

echo "=== tools ==="
find "src/domains/$MOD/agents/tools" -name '*.ts' 2>/dev/null | sort
grep -rc 'createTool' "src/domains/$MOD/agents/tools/" 2>/dev/null | grep -v ':0$'

echo "=== orchestration ==="
find "src/domains/$MOD/agents/orchestration" -name '*.ts' 2>/dev/null | sort

echo "=== largest files ==="
find "src/domains/$MOD" -name '*.ts' -o -name '*.tsx' | xargs wc -l 2>/dev/null | sort -rn | head -12
```

## Step 2 — Count the sprawl

Fill a table:

| Metric | Count | Notes |
| --- | --- | --- |
| Agent class files | | `*Agent*.ts` |
| Council / judge folders | | `agents/council/`, `agents/judges/` |
| Orchestration files | | workflows, graphs, planners |
| `createTool` definitions | | per file |
| Tools exported from `tools/index.ts` | | list ids |
| Broken imports (git WIP) | | deleted tool files still imported? |

Run compile signal:

```bash
node scripts/fabro-verify.mjs 2>&1 | head -80
git status --short "src/domains/$MOD/"
```

## Step 3 — Import graph (who calls whom)

```bash
MOD=storyteller
rg -n "from '@/domains/$MOD/agents/council" src/ tests/
rg -n "from '@/domains/$MOD/agents/judges" src/ tests/
rg -n "orchestration/WritersRoomGraph|StoryWorkflow|StorytellerPlanner" src/
rg -n "from '@/domains/$MOD/agents/tools'" src/domains/$MOD/ | head -40
rg -n "from '@/domains/$MOD/server'" src/app/api src/mcp/
```

List **external blast radius**: API routes, MCP, Trigger tasks, eval harnesses, e2e scripts.

## Step 4 — Classify each agent

For every agent file, one line:

| Agent | Role today | Verdict | Rationale |
| --- | --- | --- | --- |
| e.g. `GardenerAgent` | prose polish council | **DELETE** | replaced by single author + prose critic |
| e.g. `BeatPlanner` | (missing) | **CREATE** | beat JSON only, no prose |

Verdicts: **KEEP**, **MERGE**, **REPLACE**, **DELETE**, **CREATE**.

Target direction (from project goals): **~5–6 agents, ~10 tools**, StoryForge-aligned — one author, beat planner, 3 narrow critics, optional thin chat adapter.

## Step 5 — Tool budget draft

List **keep** tools (~10 max) with stable snake_case ids:

- beat CRUD, character CRUD, episode CRUD, bible read/write, continuity check, **one** workflow entry tool

List **delete** tools with grep pattern to confirm zero referrers before removal.

Flag every `z.any()` in agent/workflow files — must go with orchestration cleanup.

## Step 6 — Deletion order recommendation

Always recommend:

1. **Wave 0** — make tree compile (rewire `StorytellerAgent`, `server.ts`, `agents/index.ts`)
2. **Wave 1** — create replacements (author, critics, planner, workflow)
3. **Wave 2** — grep checkpoints → delete council/judges/old orchestration
4. **Wave 3** — eval/e2e alignment

Include exact grep commands per checkpoint (e.g. `rg 'agents/council' src/ --glob '!docs/**'` → 0 hits).

## Step 7 — Deliverable

Post a markdown audit:

- Summary counts (before → target)
- Broken WIP list (P0)
- Keep/delete/create tables
- Import rewiring hotspots (top 10 files)
- Recommended minimum first increment (3–5 bullets)

Then stop — hand off to plan or `/mastra-workflow` for design.
