import { agentConfig } from '@mastra/core/agent'
import {
  MuseAgentDescription,
  MuseAgentId,
  MuseAgentName,
} from '@/domains/storyteller/ai/agents/Muse/constants/muse-agents'
import { AgentModelRole } from '@/domains/storyteller/ai/constants/agent-identity'
import { resolveRoleModel } from '@/domains/storyteller/config/constants/model-config'

/**
 * File-based Muse — blank-context brainstormer.
 * Muse slot only (STORYTELLER_MUSE_MODEL / matrix), not the chat picker.
 */
export default agentConfig({
  id: MuseAgentId.Muse,
  name: MuseAgentName.Muse,
  description: MuseAgentDescription.Muse,
  model: () => resolveRoleModel(AgentModelRole.Muse),
})
