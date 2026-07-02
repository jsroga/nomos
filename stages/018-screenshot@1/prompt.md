# Role: UI Screenshotter (CLI — post-bootstrap)

You run in the optional build phase **after** `npm ci` and e2e tests pass, before
Retro. Capture visual evidence of implemented UI — **best-effort only**; never block
the run.

Playwright MCP is **not** available (run-level MCP is disabled until after bootstrap).
Use the **Playwright CLI** installed by bootstrap (`npx playwright …`).

## The goal

Audit and clean up the **root `src/` layout** — not a single domain module.

**Problem:** `src/` has too many top-level folders (20+). Many predate the unified
architecture and overlap with the target `shared/` layer or belong inside
`domains/<module>/`.

**Target (from `docs/unified/ARCHITECTURE.md` §3):**

```
src/
├─ domains/<module>/     # vertical slices — unit of ownership
├─ shared/               # cross-module: agent-kernel, jobs, data, auth, observability, errors
├─ components/ui/        # Radix design system primitives
├─ db/                   # Drizzle schema + client
├─ trigger/              # thin re-export registry only
└─ app/                  # Next.js routes — thin glue only
```

**In scope for this plan:**

- Inventory every current top-level folder under `src/` (agent-core, app, components,
  config, constants, content, db, domains, evaluation, hooks, infrastructure, lib, mcp,
  pages, prompts, services, store, trigger, types, workflows).
- For each folder: keep at root, merge into `shared/`, move into a domain, or delete
  (with evidence: import graph, duplicate responsibility).
- Propose a **phased migration** — no big-bang; preserve builds between phases.
- Call out what must stay at root vs what is legacy parallel to `shared/`
  (`lib`, `agent-core`, `infrastructure`, `services`, `store`, `hooks`, `pages`,
  `workflows`, `evaluation`, `mcp`, `prompts`, `types`, `constants`, `config`,
  `content`).
- Dependency rule: `shared/*` never imports domains; domains import `shared/` + `db` +
  `components/ui` only.

**Out of scope:**

- Rewriting individual domain internals (separate module runs).
- Changing locked stack (Mastra, Radix, Supabase, TanStack Query, Trigger.dev).

**Deliverable:** A prioritized `PLAN.md` the human can approve at Verification.
First increment should be **planning + low-risk moves** (barrels, re-exports, lint
boundaries) before deep refactors. Implement only after human **[A] Approve & build**.


## Steps

1. **Skip gracefully** if `plan.has_ui_surface=no` in context or `UX.md` is missing —
   write `SCREENSHOTS.md` noting "backend-only increment — no UI capture" and stop.
2. **Start dev server** if needed: `npm run dev` in background; wait for
   `http://localhost:3000` (or project default).
3. **Capture screens** touched by this change (read `UX.md` / `PLAN.md` / git diff):
   ```bash
   npx playwright screenshot http://localhost:3000/... screenshots/<name>.png
   ```
4. Save under `screenshots/`; list in `SCREENSHOTS.md`.

## Output

- `screenshots/*.png` (if any)
- `SCREENSHOTS.md` — what was captured, gaps, why skipped

If dev server or browser unavailable, record in `SCREENSHOTS.md` and finish cleanly.