---

## Assessment summary
The root `src/` has 20+ top-level folders; 12 predate the unified architecture and belong in `shared/`, domains, or should be deleted. **No `shared/` folder exists** — ~2,700 LOC of cross-module concerns are scattered across `agent-core/`, `lib/`, `infrastructure/`, `services/`, `store/`, `hooks/`, `prompts/`, `types/`. Domains don't import from these legacy folders, so migration is primarily move-and-re-export work, not rewrites.

## Key gaps (max 5)
- **No `shared/` layer** — blocking foundation; need 7 sub-folders (agent-kernel, jobs, data, auth, observability, errors, types)
- **8 parallel root folders** replace `shared/` (`agent-core/` has 2,700 LOC; `lib/`, `infrastructure/`, `services/`, `store/`, `hooks/`, `prompts/`, `types/`)
- **Root `services/` duplication** — `storyteller.service.ts` (277 LOC) exists both at root and in `domains/storyteller/`; need reconciliation
- **Dev-time tools in runtime `src/`** — `evaluation/` (16 subfolders), `mcp/` (protocol server), `workflows/` should move or stay for imports
- **16 app components at root** — GameHubDashboard, GlobalHeader, GlobalSidebar belong in `app/components/`, not root `components/`

## Pick one scope (buttons are A / B / C — meanings are module-specific below)

| Button | What the plan will assume for **this** module |
| --- | --- |
| **[A]** | **Phased (3 increments):** First, create `shared/` structure + move tiny files (`lib/auth`, `lib/error-utils`, 2 stores) + ESLint rules; validate build. Second, move cross-domain services (`services/entities`, `hooks/useGameEntities`). Third, consolidate `agent-core/` + `prompts/`. Defers `infrastructure/`, `mcp/`, `evaluation/`, `components/` cleanup to follow-up. ~15 file moves total. |
| **[B]** | **Foundation only (1 increment):** Create `shared/` structure (7 folders + barrels), move 4 tiny files (`lib/auth`, `lib/error-utils`, `store/useAuthStore`, `store/useErrorStore`), add ESLint boundary rules. **Stop and validate** before touching services, agent-core, or prompts. ~4 file moves; safe first step. |
| **[C]** | **Full convergence (1 big increment):** Execute all 5 phases — create `shared/`, move all 12 legacy folders (`agent-core`, `lib`, `infrastructure`, `services`, `store`, `hooks`, `prompts`, `types`, `constants`, `config`, `content`, `pages`), delete roots, move `mcp/` + `evaluation/`, redistribute `components/`. ~50 file moves; reconcile `services/storyteller` duplication; handle `infrastructure/ai/gateway` delete-vs-port decision. High-risk, high-reward. |

**Advanced:** type custom constraints in freeform (routes to [F]) · pick [R] only if assess findings are wrong

**Recommendation: [B]** — Start with foundation only: the current build works (no imports from legacy folders), so establish `shared/` + ESLint rules first, validate builds + tests pass, then commit to larger moves after proving the structure.