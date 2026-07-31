### Multi-request session tracking (mandatory)

When the user asks for **multiple things** (or the work clearly spans multiple
subsystems / turns), create and maintain a session under **`.local/sessions/`**:

```
.local/sessions/YYYY-MM-DD_<shortId>_<slug>/
  REQUESTS.md   # user asks
  TODOS.md      # checkboxes
  PLAN.md       # approach
  MEMORY.md     # decisions / gotchas
  STATUS.md     # current focus (keep fresh)
```

- `.local/` is **gitignored** — safe for notes; never commit secrets.
- Copy starters from `.agents/templates/session/`.
- Full rules: `.agents/templates/session/README.md`.
- Throwaway recon may still use `.local/tmp/{id}/` (see older scratch notes).
- Quality backlog remains `.local/quality-backlog.md` via `npm run qualitygate:capture`.

**Do not** put approved execute deliverables only in the session folder —
Fabro stages still write `PLAN.md` / `.local/findings/scope.md` as today; the
session folder tracks **ad-hoc multi-request agent work** across Cursor / Claude / Fabro.
