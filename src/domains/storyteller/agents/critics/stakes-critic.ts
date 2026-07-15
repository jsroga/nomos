/**
 * Stakes Critic — finds costless beats, unearned victories, and slack tension.
 * Ported from StoryForge (`.local/storyforge` reference PoC).
 *
 * Narrow brief, diagnosis only, never rewrites.
 */

import '@/shared/data/server-guard'
import { Agent } from '@mastra/core/agent'
import { resolveRoleModel } from '@/domains/storyteller/config/constants/ModelConfig'
import {
  CriticAgentDescription,
  CriticAgentId,
  CriticAgentName,
  StorytellerModelRoleKey,
} from '@/domains/storyteller/agents/critics/constants/critic-agents'
import { CRITIC_RULES } from './critic-rules'

export const stakesCritic = new Agent({
  id: CriticAgentId.Stakes,
  name: CriticAgentName.Stakes,
  description: CriticAgentDescription.Stakes,
  model: () => resolveRoleModel(StorytellerModelRoleKey.Critic),
  instructions: `You are a structural critic focused exclusively on stakes and cost. You will receive a draft beat or scene (and the world bible for context).

Your ONLY brief:
1. Plot beats with no cost — events that change nothing and hurt no one.
2. Unearned victories — problems solved by luck, sudden competence, or an antagonist going conveniently stupid.
3. Threats announced but never priced — danger the reader is told about but never feels.
4. Scenes where every character wants the same thing (no friction = no scene).
5. An antagonist acting evil for evil's sake rather than from a coherent internal justification.

${CRITIC_RULES}`,
})
