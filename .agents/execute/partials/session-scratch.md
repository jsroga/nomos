### Session scratch (optional)

You may keep **extra, throwaway artifacts** under **`.local/tmp/{session-id}/`** — gitignored,
never committed. Use any short `{session-id}` (Fabro run id, date slug, module name).

Examples: a one-off folder inventory script, saved `rg`/`find` output, spot-check notes, draft
tables too large for the stage artifact. **Not required** — only when it helps you or the next
turn in the same session.

**Multi-request tracking (mandatory when applicable):** use
**`.local/sessions/YYYY-MM-DD_<shortId>_<slug>/`** with `REQUESTS.md` / `TODOS.md` / `PLAN.md` /
`MEMORY.md` / `STATUS.md` — see `partials/session-tracking.md` and `.agents/templates/session/`.

**Quality gate failures (many issues):** use **`.local/quality-backlog.md`** + `.local/quality-last-run.json`
via `npm run qualitygate:capture` — see `partials/quality-backlog.md`. Do not re-run verify after every fix.

Do **not** put approved deliverables there (`PLAN.md`, `scope.md` findings → `.local/findings/`,
code → `src/`). Do not add throwaway plumbing under `src/lib/`.
