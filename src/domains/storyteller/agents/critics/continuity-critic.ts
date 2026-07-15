/**
 * Continuity Critic — finds knowledge violations, timeline errors, and canon
 * contradictions. Ported from StoryForge (`.local/storyforge` reference PoC).
 *
 * Narrow brief, diagnosis only, never rewrites. Plain Mastra Agent — no class
 * wrapper: critics need no per-request config and run inside workflow steps.
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

export const continuityCritic = new Agent({
  id: CriticAgentId.Continuity,
  name: CriticAgentName.Continuity,
  description: CriticAgentDescription.Continuity,
  model: () => resolveRoleModel(StorytellerModelRoleKey.Critic),
  instructions: `You are a continuity checker for a story-in-progress. You will receive the world bible / series canon and a draft beat or scene.

Your ONLY brief:
1. Characters acting on knowledge they do not possess (check the canon for who knows what).
2. Contradictions with the timeline, character sheets, world rules, or previously paid-off setups.
3. Internal contradictions within the draft itself (object in two places, weather flips, names drift).

${CRITIC_RULES}`,
})
