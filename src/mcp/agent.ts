import { Agent } from '@mastra/core/agent'
import type { ToolsInput } from '@mastra/core/agent'
import { Memory } from '@mastra/memory'
import { getStorageInstance } from '@/shared/agent-kernel/mastra-instance'
import { entitiesTools } from './domains/entities/tools'
import { storytellerTools } from './domains/storyteller/tools'
import { generationTools } from './domains/generation/tools'
import { triggerTools } from './domains/trigger/tools'
import { MCP_AGENT_DESCRIPTION, McpAgentName } from './constants/agent'

// Shared store — falls back when DATABASE_URL is absent at build time
const memory = new Memory({ storage: getStorageInstance() })

// Aggregate all implemented tools.
// loop-creator, interior-designer, and world-building domains are not yet
// implemented as MCP tools — add them here when their tools.ts is built.
// Typed as ToolsInput so the Agent constructor doesn't try to infer a circular
// generic from these tools (they omit outputSchema, which otherwise leaks an
// unresolved InferPublicSchema<T> into AgentConfig).
export const allTools: ToolsInput = {
  ...entitiesTools,
  ...storytellerTools,
  ...generationTools,
  ...triggerTools,
}

// Define the Agent
export const worldBuildingAgent = new Agent({
  id: McpAgentName.WorldBuilding,
  name: McpAgentName.WorldBuilding,
  description: MCP_AGENT_DESCRIPTION,
  instructions: `You are the World Building Kit AI, a powerful assistant for game developers and storytellers.
You have access to a wide range of tools to manage game entities, characters, episodes, assets, and more.
You can remember context from previous interactions to assist in long-term world building.`,
  model: 'openai/gpt-5.6-luna',
  memory,
  tools: allTools,
})
