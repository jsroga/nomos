/**
 * Game-design Mastra runtime surface — the sanctioned deep-import point for the
 * central Mastra instance (mirrors `storyteller/core/io/mastra-runtime.ts`).
 *
 * Dependency inversion: `shared/` may not import domains, so this module pushes
 * the game-design agent + workflow into the kernel runtime registry at
 * module-load time. `getMastraInstance()` drains the registry when it builds the
 * single production instance. Import this module (side-effect) before the first
 * `getMastraInstance()` call — `src/mastra.ts` (Studio) and the game-design API
 * route both do.
 *
 * Registration parity, per the storyteller precedent: the REGISTERED agent is
 * memoryless (same instructions/model/tools as production, sync-constructed so
 * no keys/DB are needed at module load). The per-request production path
 * (`createGameLoopWorkflow` in the route) additionally wires the domain
 * `GameDesignMemory` pattern index — a domain-specific PgVector index, kept as a
 * documented exception to the "one store" rule (it is a RAG index, not agent
 * memory; see AGENTS.md).
 */

import '@/shared/data/server-guard'
import type { Agent } from '@mastra/core/agent'
import type { Config } from '@mastra/core/mastra'
import { registerMastraModule } from '@/shared/agent-kernel/mastra/runtime-registry'
import { GameDesignAgent } from '@/domains/game-design/ai/agents/game-design-agent'
import { createGameDesignToolList } from '@/domains/game-design/ai/utils/game-design-tools'
import { GameDesignAgentId } from '@/domains/game-design/ai/constants/agent-identity'
import { createGameLoopWorkflowGraph } from '@/domains/game-design/ai/workflows/game-loop-workflow'
import { GAME_LOOP_WORKFLOW_ID } from '@/domains/game-design/ai/workflows/game-loop-workflow-schemas'

/**
 * Memoryless, sync-constructed agent registered for Studio/observability
 * parity. Dynamic `instructions`/`model` callbacks defer prompt + model
 * resolution to run time, so construction needs no keys.
 */
const gameDesignAgent = GameDesignAgent.createSync()

const gameLoopWorkflowGraph = createGameLoopWorkflowGraph(gameDesignAgent)

export const gameDesignRuntimeTools: NonNullable<Config['tools']> = Object.fromEntries(
  createGameDesignToolList().map(tool => [tool.id, tool]),
)

/** Agents registered on the production Mastra instance. Keys match agent.id. */
export const gameDesignRuntimeAgents: Record<string, Agent> = {
  [GameDesignAgentId.GameDesignAgent]: gameDesignAgent.mastraAgent,
}

/** Workflows registered on the production Mastra instance. */
export const gameDesignRuntimeWorkflows = {
  [GAME_LOOP_WORKFLOW_ID]: gameLoopWorkflowGraph,
}

registerMastraModule({
  agents: gameDesignRuntimeAgents,
  workflows: gameDesignRuntimeWorkflows,
  tools: gameDesignRuntimeTools,
})
