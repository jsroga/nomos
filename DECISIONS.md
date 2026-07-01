# Decisions — Storyteller Module Alignment

## Clarify gate

- **Selected option:** [C] Full blueprint migration
- **Label:** `[C] Full blueprint migration`
- **Freeform text:** none provided
- **Question:** Clarify [human gate] — read CLARIFY.md, pick a direction or type custom instructions.

### How this constrains scope and prioritization

The human chose the **most ambitious** of the offered directions: converge
`src/domains/storyteller` **fully** onto the canonical blueprint in
`docs/unified/ARCHITECTURE.md` §4, not merely stop the bleeding or stage behind a
permanent compatibility barrel. Concretely:

1. **The full mass-move is IN scope, not deferred.** Legacy folders
   (`components/`, `hooks/`, `lib/`, `db/`, `mentions/`, `config/`, `tools/`) are
   migrated into the target layout (`ui/`, `state/`, `io/`, `core/`, `services/`,
   `agents/`, `tasks/`, `prompts/`, `storyteller.config.ts`) and the legacy folders
   are deleted once empty. The previous plan's "Deferred: full mass-move" item is
   promoted into the plan.
2. **The `index.ts` barrel is the enforcement seam, not the end state.** It still
   lands early (P1) so every subsequent move is lint-guarded, but the goal is the
   final blueprint shape, so the barrel's public surface is trimmed to the intended
   API — not a dumping ground that freezes the legacy layout.
3. **AI-tool relocation is required**: `tools/` → `agents/tools/` (asset/AI-facing
   Mastra tools), with server-only guards.
4. **Cross-module `chat` deps must be resolved for real** (moved to `src/shared/*`
   or exposed via the barrel), because a full migration cannot leave `chat` reaching
   into internals.
5. **Correctness P0s still go first** (duplicate Drizzle schema, browser privileged
   Supabase auth) — a full migration is meaningless if it rebuilds on a data-integrity
   hazard.

### Explicitly still deferred (unchanged by [C])

- Building the whole `src/shared/agent-kernel` cross-module layer (repo-wide effort;
  this plan introduces only the minimum shared surface storyteller needs).
- Mastra Memory / Scorers / Processors migration beyond the concrete verified
  violations (span tree, event bus, `z.any()` steps, `any` tool signatures).
- "[C] Full blueprint" raises structural ambition for **this module**; it does not
  authorize a repo-wide shared-layer build.

## Verification gate

Pending. No Verification iteration notes yet.
