import { agentConfig } from '@mastra/core/agent'
import {
  CriticAgentDescription,
  CriticAgentId,
  CriticAgentName,
  StorytellerModelRoleKey,
} from '@/domains/storyteller/ai/agents/critics/constants/critic-agents'
import { resolveRoleModel } from '@/domains/storyteller/config/constants/model-config'

export default agentConfig({
  id: CriticAgentId.Continuity,
  name: CriticAgentName.Continuity,
  description: CriticAgentDescription.Continuity,
  model: () => resolveRoleModel(StorytellerModelRoleKey.Critic),
})
