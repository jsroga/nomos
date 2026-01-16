/**
 * Plot Architect Agent V2 - With Handoffs & Skills
 */

import { WritersRoomState } from '../graph/state'
import { executeAgentV2 } from './agent-v2-base'

const FALLBACK_PROMPT = `You are the Plot Architect - responsible for story structure and beats.
Analyze story elements and suggest compelling plot developments.
Focus on causality, stakes, and character agency.`

export const plotArchitectAgentV2 = async (
  state: WritersRoomState
): Promise<Partial<WritersRoomState>> => {
  return executeAgentV2(state, {
    agentName: 'Plot Architect',
    agentKey: 'plot_architect',
    promptId: 'plotArchitect',
    fallbackPrompt: FALLBACK_PROMPT,
    requiredPhases: ['premise', 'breaking'],
    autoLoadSkills: true,
  })
}
