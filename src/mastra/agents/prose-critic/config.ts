import { agentConfig } from '@mastra/core/agent'
import {
  CriticAgentDescription,
  CriticAgentId,
  CriticAgentName,
  StorytellerModelRoleKey,
} from '@/domains/storyteller/ai/agents/critics/constants/critic-agents'
import { resolveRoleModel } from '@/domains/storyteller/config/constants/model-config'
import { loadAgentInstructions } from '@/shared/agent-kernel/mastra/load-agent-instructions'
import { formatBannedPhrasesForPrompt } from '@/domains/storyteller/ai/prompts/guardrails/anti-slop-phrases'

/**
 * Banned-phrase list is generated in code; function instructions compose the
 * static brief from instructions.md (Mastra: function wins over md alone).
 */
export default agentConfig({
  id: CriticAgentId.Prose,
  name: CriticAgentName.Prose,
  description: CriticAgentDescription.Prose,
  model: () => resolveRoleModel(StorytellerModelRoleKey.Critic),
  instructions: () =>
    `${loadAgentInstructions(CriticAgentId.Prose)}\n\n${formatBannedPhrasesForPrompt()}`,
})
