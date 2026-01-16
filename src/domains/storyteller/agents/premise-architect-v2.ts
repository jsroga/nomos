/**
 * Premise Architect Agent V2 - With Handoffs & Skills
 */

import { WritersRoomState } from '../graph/state'
import { executeAgentV2 } from './agent-v2-base'

const FALLBACK_PROMPT = `You are the Premise Architect - the World & Conflict Architect.
Your job is to build a volatile ecosystem (the "World Bible").
Focus on creating characters and a world so distinct that the story writes itself through their collisions.`

export const premiseArchitectAgentV2 = async (
  state: WritersRoomState
): Promise<Partial<WritersRoomState>> => {
  return executeAgentV2(state, {
    agentName: 'Premise Architect',
    agentKey: 'premise_architect',
    promptId: 'premiseArchitect',
    fallbackPrompt: FALLBACK_PROMPT,
    requiredPhases: ['premise'],
    autoLoadSkills: true,
  })
}
