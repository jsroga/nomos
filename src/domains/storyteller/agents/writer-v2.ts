/**
 * Writer Agent V2 - With Handoffs & Skills Support
 *
 * Enhanced writer agent that:
 * - Loads prompts from LangChain Hub (configurable)
 * - Loads writing skills on-demand
 * - Can handoff to other specialists
 * - Tracks task completion
 * - More reliable script generation
 */

import { WritersRoomState } from '../graph/state'
import { executeAgentV2 } from './agent-v2-base'

const FALLBACK_PROMPT = `You are the Writer - crafting authentic dialogue and scenes.
Write natural, subtext-laden dialogue. Avoid exposition dumps.
Show emotions through behavior, not statements.`

export const writerAgentV2 = async (
  state: WritersRoomState
): Promise<Partial<WritersRoomState>> => {
  return executeAgentV2(state, {
    agentName: 'Writer',
    agentKey: 'writer',
    promptId: 'writer',
    fallbackPrompt: FALLBACK_PROMPT,
    requiredPhases: ['cardlock', 'writing', 'drafting'],
    autoLoadSkills: true,
  })
}
