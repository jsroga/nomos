Goal: Audit and clean up the **root `src/` layout** — not a single domain module.

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

Run ID: 01KWGZ5V9MNMN8QPGWF8H489EZ
Completed 1 stage(s) so far.


# Scope (deterministic — shell only)

Run the commands below **exactly** via the shell tool. Paste their **full stdout**
as your response. Do not analyze, summarize, or skip output.

Target module: `src-root`

```bash
if [ "src-root" = "src-root" ]; then
  echo "=== src-root cleanup scope ==="
  echo "=== src/ top-level dirs ==="
  find src -maxdepth 1 -type d | sort
  echo
  echo "=== src/ top-level files ==="
  find src -maxdepth 1 -type f | sort
  echo
  echo "=== per-folder file counts (top-level children) ==="
  for d in src/*/; do printf "%s " "$(basename "$d")"; find "$d" -type f 2>/dev/null | wc -l; done | sort -k2 -nr
  echo
  echo "=== target layout (docs) ==="
  sed -n '115,136p' docs/unified/ARCHITECTURE.md
else
  echo "=== module: src-root ==="
  find "src/domains/src-root" -type f | sort | head -120
fi
echo
echo "=== git status ==="
git status --short
echo
echo "=== architecture contract ==="
ls -la docs/unified/ARCHITECTURE.md docs/unified/SPEC.md 2>&1
```

If `find` returns nothing, still report that — do not substitute another module.