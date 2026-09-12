import { agentConfig } from '@mastra/core/agent'
import {
  CriticAgentDescription,
  CriticAgentId,
  CriticAgentName,
  StorytellerModelRoleKey,
} from '@/domains/storyteller/ai/agents/critics/constants/critic-agents'
import { EDITOR_INSTRUCTIONS_ONLY } from '@/shared/agent-kernel/mastra/editor-permissions'
import { loadPublishedOrFileBrief } from '@/shared/agent-kernel/mastra/load-published-brief'
import { AGENT_MODEL_MATRIX, resolveRoleModel } from '@/domains/storyteller/config/model-config'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import { mastraCompletionSettings } from '@/shared/ai/gateway/output-budget'

export default agentConfig({
  id: CriticAgentId.Stakes,
  name: CriticAgentName.Stakes,
  description: CriticAgentDescription.Stakes,
  model: () => resolveRoleModel(StorytellerModelRoleKey.Critic),
  instructions: () => loadPublishedOrFileBrief(CriticAgentId.Stakes),
  editor: EDITOR_INSTRUCTIONS_ONLY,
  defaultOptions: mastraCompletionSettings(LlmFeature.StorytellerBeatPlan, {
    roleBudget: AGENT_MODEL_MATRIX.critic.maxOutputTokens,
  }),
})
