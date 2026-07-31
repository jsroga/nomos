import { agentConfig } from '@mastra/core/agent'
import {
  MuseAgentDescription,
  MuseAgentId,
  MuseAgentName,
} from '@/domains/storyteller/ai/agents/Muse/constants/muse-agents'
import { resolveRoleModel } from '@/domains/storyteller/config/constants/model-config'
import { AgentModelRole } from '@/domains/storyteller/ai/constants/agent-identity'

/** File-based muse-ranker — structural keep/reject. Planner-class model. */
export default agentConfig({
  id: MuseAgentId.Ranker,
  name: MuseAgentName.Ranker,
  description: MuseAgentDescription.Ranker,
  model: () => resolveRoleModel(AgentModelRole.Planner),
})
