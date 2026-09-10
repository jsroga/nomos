import { agentConfig } from '@mastra/core/agent'
import {
  CriticAgentDescription,
  CriticAgentId,
  CriticAgentName,
  StorytellerModelRoleKey,
} from '@/domains/storyteller/ai/agents/critics/constants/critic-agents'
import { EDITOR_INSTRUCTIONS_ONLY } from '@/shared/agent-kernel/mastra/editor-permissions'
import { loadPublishedOrFileBrief } from '@/shared/agent-kernel/mastra/load-published-brief'
import { resolveRoleModel } from '@/domains/storyteller/config/model-config'

export default agentConfig({
  id: CriticAgentId.Stakes,
  name: CriticAgentName.Stakes,
  description: CriticAgentDescription.Stakes,
  model: () => resolveRoleModel(StorytellerModelRoleKey.Critic),
  instructions: () => loadPublishedOrFileBrief(CriticAgentId.Stakes),
  editor: EDITOR_INSTRUCTIONS_ONLY,
})
