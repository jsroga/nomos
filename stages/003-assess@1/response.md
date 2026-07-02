## Assessment Complete

**Root `src/` layout is 60% pre-architecture.** 12 of 20 top-level folders predate the unified structure and belong in `shared/`, domains, or should be deleted. The critical gap: **no `shared/` folder exists**, blocking module convergence.

### Key Findings

**Critical:** Functionality scattered across 8 parallel folders (`agent-core`, `lib`, `infrastructure`, `services`, `store`, `hooks`, `prompts`, `types`) with no single `shared/` layer — ~2,700 LOC in `agent-core/` duplicates Mastra primitives; cross-module auth/errors/data live in ad-hoc locations.

**High impact, low risk:** Domains already don't import from legacy folders (grep confirmed zero hits), so migration is move-and-re-export, not rewrite. Root `services/` has 3 files that duplicate domain services or belong in `shared/data/`.

**Top 3 gaps:**
1. Create `shared/` structure (agent-kernel, jobs, data, auth, observability, errors, types)
2. Move cross-domain primitives (`lib/auth`, `services/entities`, `hooks/useGameEntities`) to `shared/`
3. Set up ESLint boundary rules blocking `domains/` from importing legacy root folders

Full phased migration plan in `findings/assess.md` — recommend **Phase 1 only** (foundation + low-risk moves) in first increment, then validate before proceeding.