# Decisions log

## Clarify gate — storyteller architecture alignment
- **Status:** decided (human selection at Clarify gate)
- **Selected:** **[A] Staged migration — boundaries first, bigger moves sequenced**
- **Question:** How much should the cleanup plan take on?
- **Freeform text:** none

### What [A] means for scope & prioritization
A boundary-first, architecture-aligned migration. We fix the foundations that
make every later move safe, then sequence the high-risk reshapes rather than
attempting a big-bang rewrite.

**In scope (planned now):**
1. Fix the schema-ownership inversion (`src/db` becomes the source of truth) so
   the public barrel can be narrowed without breaking ~40 external importers.
2. Narrow `src/domains/storyteller/index.ts` to a real public contract; move
   DB/services/agent internals off the barrel.
3. Stand up the target layer skeleton (`ui/state/io/core/services/agents/tasks/
   prompts`) and migrate the highest-value client server-state flows to typed
   `io/` + TanStack `state/queries/` first (episodes, bible-lock).
4. Mark/consolidate server-only boundaries and separate the genuinely
   *client-side* "services" from real server services.
5. Sequence (not defer indefinitely) the Trigger-task migration for the
   long-running poster/moodboard flows onto `shared/jobs`.
6. Thin storyteller's custom AI orchestration around Mastra primitives
   (delete the hand-rolled Langfuse span tree + `WorkflowContext` event bus in
   the workflow, type the workflow steps) — a light pass, not the full §9 kernel.

**Deferred (explicitly out of this pass — see PLAN.md §Deferred):**
- Full file-by-file relocation of every component into `ui/`.
- The complete §9 Mastra convergence (delete `AgentMemory`, `createScorer`
  live scorers, input/output processors, one `shared/agent-kernel`).
- Cross-module `chat`/`mentions` extraction into `shared/` (sequenced later).

### Why [A]
Storyteller's biggest risks are boundary and data-flow problems (public
contract, schema ownership, server-state ownership). Fixing those first is
import-safe and unblocks the riskier reshapes; a full big-bang reshape ([C])
would create broad import churn before the boundaries are safe.
