/**
 * Prose Critic — finds stated emotion, clichés, POV breaks, and voice
 * flattening. Ported from StoryForge (`.local/storyforge` reference PoC).
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
import { formatBannedPhrasesForPrompt } from '@/domains/storyteller/ai/prompts/guardrails/anti-slop-phrases'

export const proseCritic = new Agent({
  id: CriticAgentId.Prose,
  name: CriticAgentName.Prose,
  description: CriticAgentDescription.Prose,
  model: () => resolveRoleModel(StorytellerModelRoleKey.Critic),
  // Hybrid: static brief prose from instructions.md; the banned-phrase list
  // (dynamic) and shared rules are injected in code.
  instructions: `${loadAgentInstructions(CriticAgentId.Prose)}
${formatBannedPhrasesForPrompt()}

${CRITIC_RULES}`,
})
