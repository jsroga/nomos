# `.agents/skills/` — shared project skills

**Single source of truth** for Fabro Developer `use_skill` skills and IDE slash commands (`/refactor`, `/write-tests`, …). Edit here only.

How skills connect to execute stages and runners: [../CONFIGURATION.md](../CONFIGURATION.md).

## Layout

Each skill is a folder with **`SKILL.md`** (YAML frontmatter + body):

```
.agents/skills/
  refactor/SKILL.md
  write-tests/SKILL.md
  debug/SKILL.md
  … (23 skills — see below)
  execute/SKILL.md          ← interactive /execute dark-factory loop (Cursor/Claude)
```

## Skill brainstorm & prioritization (2026-07)

Ideas evaluated for **this repo right now** (storyteller GRRM migration, Mastra workflows, Fabro execute):

| Idea | Value | Gap filled? | Verdict |
| --- | --- | --- | --- |
| **mastra-workflow** | High | No skill for v1 `createStep`, suspend, parallel critics, SSE bridge | ✅ **Built** |
| **agent-sprawl-audit** | High | Pre-delete inventory; failed run burned $ on broken tree | ✅ **Built** |
| **sse-wire-contract** | High | Published chat contract; one regression = product down | ✅ **Built** |
| **storyteller-eval-golden** | Med | `llm-eval` exists; golden set needs workflow-era examples | ✅ **Built** |
| **e2e-storyteller-audit** | Med | `e2e/agent/*` legacy vs Playwright smoke | ✅ **Built** |
| domain-barrel-audit | Med | Overlaps structure tests | Skip |
| fabro-verify-fix | Low | Documented in quality-gates | Skip |
| deletion-order-migration | Med | Subsumed by `agent-sprawl-audit` | Skip |
| storyforge-port-checklist | Med | Overlaps `mastra-workflow` + goals prompt | Skip |
| **craft-scorer-author** | Med | StoryForge scorers | ✅ **Built** |
| mastra-memory-tuning | Low | Not blocking simplification | Defer |
| action-hitl-bridge | Med | In `mastra-workflow` + `sse-wire-contract` | Skip |
| mcp-storyteller-surface | Low | Smaller blast radius | Defer |
| trigger-storyteller-jobs | Low | `trigger-dev` covers pattern | Skip |
| prompt-anti-slop | Med | `prompt-optimizer` exists | Skip |
| architecture-ratchet | Low | pre-commit `check-architecture` | Skip |
| knip-dead-code | Low | Generic hygiene | Skip |
| playwright-sse-fixtures | Med | Partially in `sse-wire-contract` | Partial |
| model-config-consolidate | Med | Plan item | Defer |
| eval-dashboard-triage | Low | Nice-to-have | Defer |

**First 3:** `mastra-workflow`, `agent-sprawl-audit`, `sse-wire-contract`.

**Next 3:** `storyteller-eval-golden`, `e2e-storyteller-audit`, `craft-scorer-author`.

## Who reads what

| Runner | Discovery path |
| --- | --- |
| **Fabro** (sandbox) | `{git_root}/.fabro/skills` → symlink `../.agents/skills` |
| **Fabro** (local server) | Copy to `~/.fabro/skills/` — see below |
| **Cursor** | `.cursor/skills/<name>/` → **symlink** to `.agents/skills/<name>/` |
| **Claude Code** | `.claude/skills/<name>/` → **symlink** to `.agents/skills/<name>/` |

Implement stage calls skills via **`use_skill`** (see `.agents/execute/implement.md`).

## Skill catalog (23)

| Skill | Use when |
| --- | --- |
| `accessibility-audit` | WCAG / keyboard / ARIA / contrast |
| `agent-sprawl-audit` | Before deleting council/judges — inventory agents/tools/orchestration |
| `commit` | Conventional commit hygiene |
| `component-audit` | Recon UI before building |
| `craft-scorer-author` | Prose/stakes Mastra scorers (StoryForge-style craft metrics) |
| `debug` | Evidence-based root cause |
| `document` | Docs grounded in code |
| `e2e-storyteller-audit` | E2E tier map — smoke vs legacy `e2e/agent/*` |
| `execute` | `/execute <module>` dark-factory loop |
| `llm-eval` | Eval design + interpretation |
| `mastra-workflow` | Mastra v1 workflows — steps, suspend, critics, SSE adapter |
| `pr-description` | PR body from branch diff |
| `prompt-optimizer` | Prompt failure analysis |
| `refactor` | Structure without behavior change |
| `review` | Code review findings |
| `services-audit` | Reuse services/schemas before backend work |
| `shadcn` | shadcn/ui in this repo |
| `sse-wire-contract` | Storyteller chat SSE — preserve frame types/order |
| `storyteller-eval-golden` | Golden dataset + scorer wiring for post-workflow evals |
| `supabase` | Supabase admin client / RLS |
| `trace-forensics` | Langfuse trace debugging |
| `trigger-dev` | Trigger.dev v4 tasks |
| `write-tests` | Meaningful vitest tests |

## Local Fabro skill discovery (one-time / after changes)

Fabro discovers skills on the **Mac host**, not inside Docker. Symlinks under `~/.fabro/skills` show as **0/0** — use a **real copy**:

```bash
rm -rf ~/.fabro/skills
mkdir -p ~/.fabro/skills
cp -R .agents/skills/. ~/.fabro/skills/
```

Re-run after adding or editing a skill. Sandboxed runs still resolve `{git_root}/.fabro/skills` (symlink → `.agents/skills`).

## Adding a skill

1. Add `.agents/skills/<name>/SKILL.md` with valid frontmatter (`name`, `description`).
2. Symlink into IDE paths (or run the loop below once):

```bash
name=your-skill
ln -sf "../../.agents/skills/$name" ".cursor/skills/$name"
ln -sf "../../.agents/skills/$name" ".claude/skills/$name"
cp -R .agents/skills/. ~/.fabro/skills/   # refresh local Fabro cache
```

3. If Developer should use it by default, add a row to the table in `.agents/execute/implement.md`.

## Editing

Change **`SKILL.md` under `.agents/skills/`** only. Do not duplicate bodies in `.fabro/`, `.cursor/`, or `.claude/`.
