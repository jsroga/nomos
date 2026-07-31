# `.agents/skills/` — shared project skills

**Single source of truth.** Edit here only. Fabro / Cursor / Claude must not hold skill bodies.

Audit decisions: [SKILLS-AUDIT.md](./SKILLS-AUDIT.md).

## Sharing (one tree, three entry symlinks)

Bodies live **only** under `.agents/skills/`. The other roots are directory symlinks — same files, same inode (not copies).

| Runner | Path |
| --- | --- |
| **Canonical** | `.agents/skills/<name>/SKILL.md` |
| **Fabro** | `.fabro/skills` → `../.agents/skills` |
| **Cursor** | `.cursor/skills` → `../.agents/skills` |
| **Claude Code** | `.claude/skills` → `../.agents/skills` |

If the IDE shows both `.agents/skills/foo` and `.fabro/skills/foo`, that is the same file twice in the tree — edit under `.agents/` only.

Fabro local Mac discovery still needs a **real copy** under `~/.fabro/skills/` (symlinks show as 0/0):

```bash
rm -rf ~/.fabro/skills && mkdir -p ~/.fabro/skills && cp -R .agents/skills/. ~/.fabro/skills/
```

## Catalog (18)

| Skill | Use when |
| --- | --- |
| `accessibility-audit` | WCAG / keyboard / ARIA / contrast |
| `commit` | Conventional commit + precommit gates |
| `component-audit` | Recon UI before building |
| `core-web-vitals` | Landing CWV lab audits, prod `next build`/`start`, Lighthouse pitfalls |
| `execute` | `/execute <module>` dark-factory loop |
| `mastra-workflow` | Mastra v1 workflows (steps, suspend, critics, SSE) |
| `pr-description` | PR body from branch diff |
| `review` | Code / security review findings |
| `shadcn` | shadcn/ui in this repo |
| `sse-wire-contract` | Storyteller chat SSE frames |
| `supabase` | Supabase admin client / RLS |
| `trigger-authoring-chat-agent` | Trigger chat-agent authoring |
| `trigger-authoring-tasks` | Trigger task authoring |
| `trigger-chat-agent-advanced` | Trigger chat-agent advanced |
| `trigger-cost-savings` | Trigger cost analysis |
| `trigger-dev` | Trigger.dev v4 patterns in this repo |
| `trigger-getting-started` | Trigger getting started |
| `typecheck-scoped` | Fast scoped TSC / fabro-verify |

## Adding a skill

1. Add `.agents/skills/<name>/SKILL.md` (`name` + `description` frontmatter).
2. Refresh local Fabro host cache if you use it:

```bash
rm -rf ~/.fabro/skills && mkdir -p ~/.fabro/skills && cp -R .agents/skills/. ~/.fabro/skills/
```

3. Do **not** add files under `.cursor/skills`, `.claude/skills`, or `.fabro/skills` — those are symlinks.
