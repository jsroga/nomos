import { agentConfig } from '@mastra/core/agent'
import {
  StorytellerAgentId,
  StorytellerAgentLabel,
  AgentModelRole,
} from '@/domains/storyteller/ai/constants/agent-identity'
import { resolveRoleModel } from '@/domains/storyteller/config/constants/model-config'
import { getEntityLinkRequirements } from '@/domains/storyteller/config/storyteller-config'
import { EDITOR_INSTRUCTIONS_AND_TOOL_DESCRIPTIONS } from '@/shared/agent-kernel/mastra/editor-permissions'
import { composeChatAdapterInstructions } from './compose-instructions'

const CHAT_ADAPTER_DESCRIPTION =
  'Chat adapter: converse, keep the world bible current via tools, delegate beat drafting to the beat-draft workflow.'

export default agentConfig({
  id: StorytellerAgentId.Storyteller,
  name: StorytellerAgentLabel.Storyteller,
  description: CHAT_ADAPTER_DESCRIPTION,
  model: () => resolveRoleModel(AgentModelRole.Chat),
  instructions: () => composeChatAdapterInstructions(getEntityLinkRequirements()),
  editor: EDITOR_INSTRUCTIONS_AND_TOOL_DESCRIPTIONS,
})
