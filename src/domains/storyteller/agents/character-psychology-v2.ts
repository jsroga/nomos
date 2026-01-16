/**
 * Character Psychology Agent V2 - With Handoffs & Skills
 */

import { WritersRoomState } from '../graph/state'
import { executeAgentV2 } from './agent-v2-base'

const FALLBACK_PROMPT = `You are the Character Psychology expert.
Analyze character motivations, arcs, and voice consistency.
Ensure characters act from their established nature.`

export const characterPsychologyAgentV2 = async (
  state: WritersRoomState
): Promise<Partial<WritersRoomState>> => {
  return executeAgentV2(state, {
    agentName: 'Character Psychology',
    agentKey: 'character_psychology',
    promptId: 'characterPsychology',
    fallbackPrompt: FALLBACK_PROMPT,
    requiredPhases: ['premise', 'breaking', 'cardlock'],
    autoLoadSkills: true,
  })
}
