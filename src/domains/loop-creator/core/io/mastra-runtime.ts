/**
 * Loop-creator Mastra runtime surface — the sanctioned deep-import point for the
 * central Mastra instance (mirrors storyteller/game-design).
 *
 * Registers the flagged (`FF_LOOP_CREATOR_MASTRA=true`) Mastra specialist agents so
 * they appear in Studio and share the instance's storage/observability/tracing.
 * The orchestration itself is the existing imperative supervisor loop
 * (`core/graph/loop-orchestrator.ts`); each specialist's single LLM call routes
 * through the registered agent when the flag is on (see
 * `ai/agents/mastra/loop-creator-completion.ts`), else the default LangChain
 * path. Side-effect-imported by `src/mastra.ts` (Studio) and the loop-creator
 * API routes (production ordering, before the first `getMastraInstance()`).
 */

import '@/shared/data/server-guard'
import { registerMastraModule } from '@/shared/agent-kernel/mastra/runtime-registry'
import { loopCreatorRuntimeAgents } from '@/domains/loop-creator/ai/agents/mastra/loop-creator-mastra-agents'

export { loopCreatorRuntimeAgents } from '@/domains/loop-creator/ai/agents/mastra/loop-creator-mastra-agents'

registerMastraModule({
  agents: loopCreatorRuntimeAgents,
})
