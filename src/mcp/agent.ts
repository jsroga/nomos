import { Agent } from '@mastra/core/agent'
import { Memory } from '@mastra/memory'
import { PostgresStore } from '@mastra/pg'
import { entitiesTools } from './domains/entities/tools'
import { storytellerTools } from './domains/storyteller/tools'
import { generationTools } from './domains/generation/tools'
import { triggerTools } from './domains/trigger/tools'
import { loopCreatorTools } from './domains/loop-creator/tools'
import { interiorDesignerTools } from './domains/interior-designer/tools'
import { worldBuildingTools } from './domains/world-building/tools'

// Initialize Memory with Postgres persistence
const connectionString = process.env.DATABASE_URL!
const store = new PostgresStore({
  id: 'world-building-store',
  connectionString,
})
const memory = new Memory({ store })

// Aggregate all tools
export const allTools = {
  ...entitiesTools,
  ...storytellerTools,
  ...generationTools,
  ...triggerTools,
  ...loopCreatorTools,
  ...interiorDesignerTools,
  ...worldBuildingTools,
}

// Define the Agent
export const worldBuildingAgent = new Agent({
  name: 'world-building-agent',
  description: 'AI assistant for managing game entities, stories, and assets.',
  instructions: `You are the World Building Kit AI, a powerful assistant for game developers and storytellers.
You have access to a wide range of tools to manage game entities, characters, episodes, assets, and more.
You can remember context from previous interactions to assist in long-term world building.`,
  model: {
    provider: 'OPENAI',
    name: 'gpt-4o',
    toolChoice: 'auto',
  },
  memory,
  tools: allTools,
})
