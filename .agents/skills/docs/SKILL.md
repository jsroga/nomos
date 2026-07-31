---
name: docs
description: Document a topic or change by updating the doc that already owns it — find the owner, edit in place, keep docs/README.md accurate. Use instead of writing a new markdown file.
---

# Docs

Fold new information into the documentation that already exists. A new file is a failure mode, not a deliverable: every extra doc splits the topic and the next reader finds the stale half.

Topic to document (from the user):

$ARGUMENTS

## 1. Decide whether this belongs in `docs/` at all

Ask who reads it next month.

| Reader | Home |
|---|---|
| A human onboarding or debugging later | `docs/` — continue below |
| Only this session (plans, audits, findings, migration notes) | `.local/` — stop, see `.cursor/rules/agent-artifacts.mdc` |
| A tool or agent (rules, prompts, skills) | `.cursor/rules/`, `.agents/` |

## 2. Find the owning doc

Read `docs/README.md` first — it indexes everything. Then search before concluding nothing fits:

```bash
rg -l "<topic keyword>" docs/
rg -n "^#{1,3} " docs/<candidate>.md    # section headings
```

Where topics normally live:

| Topic | Doc |
|---|---|
| System context, containers, data flow, third-party services | `docs/ARCHITECTURE.md` |
| Target module blueprint, layer rules, dependency direction | `docs/unified/ARCHITECTURE.md` |
| Migration plan toward that blueprint | `docs/unified/SPEC.md` |
| Agent kernel, model routing, Mastra primitives | `docs/internal/agents/agent-core.md` |
| A specific module's internals | `docs/internal/<module>.md` |
| Tracing, exporters, Sentry/OTel | `docs/OBSERVABILITY.md` |
| Test tiers, evals, golden sets | `docs/TESTING.md` |
| MCP tools, resources, auth | `docs/MCP_API.md` |
| An accepted design decision with alternatives | `docs/adr/<slug>.md` — one per decision, new file is correct here |

## 3. Update in place

- Add a section to the owning doc, or extend the section that already covers it.
- Replace superseded statements — do not append a contradicting paragraph and leave both.
- No changelog entries, no "Updated:" lines, no notes about which agent wrote it (`.cursor/rules/writing-style.mdc`).
- Verify every claim against code before writing it. Cite the resolver or call site (`` `src/shared/...` ``) so the next reader can check.
- Tables for enumerable facts; prose for the reasoning around them.

## 4. Only if genuinely unowned, create one

Justify it in your summary: name the docs you searched and why none fit. Then:

1. Create `docs/<NAME>.md` (or `docs/internal/<module>.md` for module internals).
2. Register it in the `docs/README.md` table with audience and purpose — an unindexed doc is invisible.

## 5. Close the loop

- Config files point at the doc, they do not duplicate it: `# Per-slot model pins: docs/internal/agents/agent-core.md § Model routing`.
- If the change was structural, `scripts/check-docs-updated.mjs` requires a `docs/` edit in the same commit — this satisfies it.
- Report which doc you updated and which section, not a summary of the content.
