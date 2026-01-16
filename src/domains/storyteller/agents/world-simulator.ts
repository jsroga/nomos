import { BaseAgentResponseSchema } from '../schemas/agent-schemas'
import { WritersRoomState } from '../graph/state'
import { v4 as uuidv4 } from 'uuid'
import { getModel } from '../config/model-config'
import { SystemMessage, AIMessage } from '@langchain/core/messages'
import { z } from 'zod'
import { getSafeMessageHistory } from '../utils/message-utils'
import { loadPromptCached } from '../prompts/hub-loader'

// Model is created inside the function to use request-scoped config (AsyncLocalStorage)

// Schema for simulation results
const SimulationResponseSchema = BaseAgentResponseSchema.extend({
  reactions: z.array(
    z.object({
      factionId: z.string(),
      reaction: z.string(),
      move: z.string().describe('The specific action they take'),
      intensity: z.number().min(1).max(10),
      targetFactionId: z.string().optional(),
    })
  ),
  worldConsequences: z.array(z.string()).describe('How the world state changes'),
})

import { WORLD_SIMULATOR_PROMPT } from '../prompts/agents/world-simulator'

export const worldSimulatorAgent = async (
  state: WritersRoomState
): Promise<Partial<WritersRoomState>> => {
  // Create model inside function to use request-scoped config
  const model = getModel('plotArchitect')

  console.log('World Simulator running...')

  const bible = state.seriesBible
  if (!bible || !bible.factions || !bible.worldRules) {
    console.warn('Simulator: Missing bible data')
    return {}
  }

  const contextMessage = `
  ## WORLD STATE
  **Rules**: ${JSON.stringify(bible.worldRules)}
  **Factions**: ${JSON.stringify(bible.factions)}
  
  ## RECENT CONTEXT
  ${getSafeMessageHistory(state.messages, 3)
    .map(m => `${m.name || 'User'}: ${m.content}`)
    .join('\n')}
  `

  // Load prompt from Hub
  const loadedPrompt = await loadPromptCached('worldSimulator')
  const promptMessages =
    (loadedPrompt.prompt as any).promptMessages || (loadedPrompt.prompt as any).messages || []
  const systemMessageFromPrompt = promptMessages.find(
    (m: any) => m.lc_id?.[3] === 'SystemMessagePromptTemplate' || m._type === 'system'
  )
  const systemTemplate =
    systemMessageFromPrompt?.prompt?.template ||
    systemMessageFromPrompt?.template ||
    WORLD_SIMULATOR_PROMPT

  // Combine system content into single message (required for Claude)
  const combinedSystem = [systemTemplate, contextMessage].join('\n\n---\n\n')

  const messages = [new SystemMessage(combinedSystem)]

  try {
    const structuredModel = model.withStructuredOutput(SimulationResponseSchema)
    const parsed = (await structuredModel.invoke(messages)) as z.infer<
      typeof SimulationResponseSchema
    >

    const responseContent =
      '🎲 **SIMULATION RESULTS**\n\n' +
      parsed.reactions
        .map(r => {
          const faction = bible.factions?.find((f: any) => f.id === r.factionId)
          return `**${faction?.name || r.factionId}**: ${r.reaction} (Action: ${r.move})`
        })
        .join('\n\n') +
      `\n\n**World Changes**:\n${parsed.worldConsequences.map(c => `- ${c}`).join('\n')}`

    return {
      messages: [new AIMessage({ content: responseContent, name: 'WorldSimulator' })],
    }
  } catch (error) {
    console.error('Simulation failed:', error)
    return {
      messages: [new AIMessage({ content: '⚠️ Simulation failed.', name: 'WorldSimulator' })],
    }
  }
}
