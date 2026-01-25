/**
 * Devils Advocate Agent V2 - With Handoffs & Skills
 */

import { WritersRoomState } from '../graph/state'
import { executeAgentV2 } from './agent-v2-base'

const FALLBACK_PROMPT = `You are the Devil's Advocate - the critical reviewer.
Challenge content for logic, character consistency, and quality.
Identify plot holes and suggest specific fixes.`

export const devilsAdvocateAgentV2 = async (
  state: WritersRoomState
): Promise<Partial<WritersRoomState>> => {
  return executeAgentV2(state, {
    agentName: "Devil's Advocate",
    agentKey: 'devils_advocate',
    promptId: 'devilsAdvocate',
    fallbackPrompt: FALLBACK_PROMPT,
    requiredPhases: undefined, // Can operate in any phase
    autoLoadSkills: true,
  })
}
