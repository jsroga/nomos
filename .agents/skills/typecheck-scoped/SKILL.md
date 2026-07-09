---
name: typecheck-scoped
description: Run fast scoped TypeScript checks (~5–15s) instead of full-repo tsc which OOMs. Use after edits and before handoff.
---

# Scoped typecheck + code metrics

Full `npm run typecheck` (`tsc --noEmit` + `check-code-metrics` on all `src/`) **OOMs** on large repos and surfaces legacy debt. Use scoped checks during agent work.

**Limits (warn / error):** file lines **400 / 800** · cyclomatic complexity **15 / 25** — see `.cursor/rules/code-metrics.mdc`.

## Commands

```bash
# Files you just edited (~5s) — includes TSC + ESLint + code metrics
npm run qualitygate:file -- src/path/to/file.ts

# Git-changed src files
npm run qualitygate:changed
npm run qualitygate:changed          # every 5 todos (not every todo)

# Many failures — cache once, fix one-by-one, rescan every 5 fixes
npm run qualitygate:capture
npm run qualitygate:backlog
npm run qualitygate:backlog -- done <id>

# TSC only (no ESLint / metrics)
npm run qualitygate:tsc -- --files src/path/to/file.ts
npm run qualitygate:tsc -- --changed

# Metrics only on full src/
npm run qualitygate:metrics

# Whole domain module (~10–20s)
node scripts/typecheck-scoped.mjs --module storyteller

# Nightly / pre-handoff full scan (partitioned slices)
npm run qualitygate:tsc -- --all-slices
```

## Cursor hooks

- `afterFileEdit` records all `src/**/*.ts(x)` paths
- `stop` runs `qualitygate.mjs` on edited files automatically

## Rules

1. Never claim "typecheck passed" after bare `tsc --noEmit` on full repo — use `qualitygate:file` or scoped commands
2. **Touched files** must pass code metrics (400/800 lines, complexity 15/25) before handoff
3. **>5 gate failures:** `npm run qualitygate:capture` → `.local/quality-backlog.md` → fix **one** item → `qualitygate:backlog -- done <id>` → rescan every **5** fixes (not every edit)
4. **Never add file-level `eslint-disable`** for quality rules without explicit user approval
5. If a slice OOMs, report slice name and use `--files` on touched paths
6. Before commit / execute handoff: `node scripts/fabro-verify.mjs`
7. Per-file tracker: `npm run qualitygate:tracker -- --file <path>` (not full refresh each loop)

## Fix workflow

1. Many issues? `npm run qualitygate:capture` first — read `.local/quality-backlog.md`
2. Fix **one** backlog item → `npm run qualitygate:backlog -- done <id>`
3. After 5 fixes: `npm run qualitygate:capture` again
4. Handoff: `npm run qualitygate:file -- <touched>`
5. See `.agents/execute/partials/quality-backlog.md` and `SRC-QUALITY-TRACKER.md`
