/**
 * Episode Premise Architect Agent V2 - With Handoffs & Skills
 */

import { WritersRoomState } from '../graph/state'
import { executeAgentV2 } from './agent-v2-base'

const FALLBACK_PROMPT = `You are the Episode Premise Architect.
Generate high-stakes, transformative episode premises using the Ozymandias framework.
Focus on conflict, change, and thematic depth.`

export const episodePremiseArchitectAgentV2 = async (
  state: WritersRoomState
): Promise<Partial<WritersRoomState>> => {
  return executeAgentV2(state, {
    agentName: 'Episode Premise Architect',
    agentKey: 'episode_premise_architect',
    promptId: 'episodePremiseArchitect',
    fallbackPrompt: FALLBACK_PROMPT,
    requiredPhases: ['premise'],
    autoLoadSkills: true,
  })
}
