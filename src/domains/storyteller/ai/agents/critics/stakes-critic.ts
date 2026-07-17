/**
 * Stakes Critic — finds costless beats, unearned victories, and slack tension.
 * Ported from StoryForge (`.local/storyforge` reference PoC).
 *
 * Narrow brief, diagnosis only, never rewrites.
 */

import '@/shared/data/server-guard'
import { Agent } from '@mastra/core/agent'
import { resolveRoleModel } from '@/domains/storyteller/config/constants/model-config'
import {
  CriticAgentDescription,
  CriticAgentId,
  CriticAgentName,
  StorytellerModelRoleKey,
} from '@/domains/storyteller/ai/agents/critics/constants/critic-agents'
import { loadAgentInstructions } from '@/shared/agent-kernel/mastra/load-agent-instructions'
import { CRITIC_RULES } from './critic-rules'

export const stakesCritic = new Agent({
  id: CriticAgentId.Stakes,
  name: CriticAgentName.Stakes,
  description: CriticAgentDescription.Stakes,
  model: () => resolveRoleModel(StorytellerModelRoleKey.Critic),
  instructions: `${loadAgentInstructions(CriticAgentId.Stakes)}\n\n${CRITIC_RULES}`,
})
