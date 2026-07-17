/**
 * Continuity Critic — finds knowledge violations, timeline errors, and canon
 * contradictions. Ported from StoryForge (`.local/storyforge` reference PoC).
 *
 * Narrow brief, diagnosis only, never rewrites. Plain Mastra Agent — no class
 * wrapper: critics need no per-request config and run inside workflow steps.
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

// Base brief lives in src/mastra/agents/continuity-critic/instructions.md (editable);
// the shared critic rules are appended in code.
export const continuityCritic = new Agent({
  id: CriticAgentId.Continuity,
  name: CriticAgentName.Continuity,
  description: CriticAgentDescription.Continuity,
  model: () => resolveRoleModel(StorytellerModelRoleKey.Critic),
  instructions: `${loadAgentInstructions(CriticAgentId.Continuity)}\n\n${CRITIC_RULES}`,
})
