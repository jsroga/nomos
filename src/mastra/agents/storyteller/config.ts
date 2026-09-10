import { agentConfig } from '@mastra/core/agent'
import {
  StorytellerAgentDescription,
  StorytellerAgentId,
  StorytellerAgentLabel,
  AgentModelRole,
} from '@/domains/storyteller/ai/constants/agent-identity'
import { resolveRoleModel } from '@/domains/storyteller/config/model-config'
import { getEntityLinkRequirements } from '@/domains/storyteller/config/storyteller-config'
import { EDITOR_INSTRUCTIONS_AND_TOOL_MEMBERSHIP } from '@/shared/agent-kernel/mastra/editor-permissions'
import { composeChatAdapterInstructions } from './compose-instructions'

export default agentConfig({
  id: StorytellerAgentId.Storyteller,
  name: StorytellerAgentLabel.Storyteller,
  description: StorytellerAgentDescription.Storyteller,
  model: () => resolveRoleModel(AgentModelRole.Chat),
  instructions: () => composeChatAdapterInstructions(getEntityLinkRequirements()),
  editor: EDITOR_INSTRUCTIONS_AND_TOOL_MEMBERSHIP,
  workspace: () => undefined,
})
