### Quality backlog (mandatory when gates surface many issues)

When `verify`, `fabro-verify`, or `npm run typecheck` returns **more than ~5 distinct issues**, do **not** re-run the same gate after every single fix. That wastes minutes per loop.

**Use local memory in `.local/`** (gitignored) to track issues one-by-one and **cache** scan results.

## Cadence (binding)

| When | Action |
|------|--------|
| **Start** of a fix loop | **One** scan → populate backlog |
| **Steps 1–4** | Fix **one** backlog item → mark done in backlog → **no rescan** |
| **Step 5** (and 10, 15, …) | Rescan scoped files → refresh cache + backlog |
| **Handoff** | Final `qualitygate:file` on touched paths only |

Default batch size: **5 fix steps between rescans**. Do not run `qualitygate:file` after every line change.

## Files (`.local/` — never commit)

| Path | Purpose |
|------|---------|
| `.local/quality-backlog.md` | Human-readable checklist — **source of truth for what to fix next** |
| `.local/quality-last-run.json` | Cached raw output + parsed items from last scan |
| `.local/quality-tracker-state.json` | Per-file TSC/magic-string state (`npm run qualitygate:tracker -- --file`) |

Optional scratch: `.local/tmp/{session-id}/` for extra notes — see `session-scratch.md`.

## Populate backlog (run once per fix loop)

```bash
# Git-changed src files (~5–15s) — preferred mid-task
npm run qualitygate:capture

# Named files only
npm run qualitygate:capture -- src/path/A.ts src/path/B.ts

# Show progress + next items (no scan)
npm run qualitygate:backlog

# Mark one item fixed without rescanning
npm run qualitygate:backlog -- done 3
```

`qualitygate:capture` runs scoped verify (TSC + ESLint + code metrics), writes `.local/quality-last-run.json`, and regenerates `.local/quality-backlog.md` with unchecked items.

## Fix loop (one item at a time)

1. `npm run qualitygate:backlog` — read **Next up** (top unchecked item).
2. Fix **only that item** (one file / one rule cluster).
3. `npm run qualitygate:backlog -- done <id>` — mark fixed in backlog.
4. Optional: `npm run qualitygate:tracker -- --file <path>` — update `.local/SRC-QUALITY-TRACKER.md` row (~5s).
5. After **5** `done` marks (or 5 completed todos): `npm run qualitygate:capture` — refresh cache.
6. Repeat until backlog empty for **your scope**, then `npm run qualitygate:file -- <touched>`.

## Scope discipline

- **In-scope files** (your task / module / PLAN.md paths) must go clean before handoff.
- **Legacy debt** outside scope: log in backlog under `## Out of scope (do not fix this task)` — do not burn cycles.
- Full-repo `npm run typecheck` may still fail on legacy files — that is not an excuse to leave **touched** files dirty.

## Code metrics (same cache)

Limits: **400 / 800** lines · complexity **15 / 25** — see `.cursor/rules/code-metrics.mdc` (Cursor) / this partial (Fabro/Claude). Metrics violations appear in the same backlog after `qualitygate:capture`.

## Anti-patterns

- Running `npm run lint`, `qualitygate:changed`, or `fabro-verify` after **every** small edit.
- Re-scanning without updating `.local/quality-backlog.md` — you lose track and duplicate work.
- Fixing 20 files before recording what failed — capture first, then dequeue.
- Claiming "gates passed" while backlog has open in-scope items.
