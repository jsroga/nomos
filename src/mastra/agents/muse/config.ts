import { agentConfig } from '@mastra/core/agent'
import {
  MuseAgentDescription,
  MuseAgentId,
  MuseAgentName,
} from '@/domains/storyteller/ai/agents/Muse/constants/muse-agents'
import { AgentModelRole } from '@/domains/storyteller/ai/constants/agent-identity'
import {
  STORYTELLER_AUTHOR_MODEL,
  requestContextString,
} from '@/domains/storyteller/ai/request-context'
import { resolveRoleModel } from '@/domains/storyteller/config/constants/model-config'

/** File-based Muse — blank-context brainstormer. Tracks Writers Room picker (author). */
export default agentConfig({
  id: MuseAgentId.Muse,
  name: MuseAgentName.Muse,
  description: MuseAgentDescription.Muse,
  model: ({ requestContext }) =>
    resolveRoleModel(
      AgentModelRole.Author,
      requestContextString(requestContext, STORYTELLER_AUTHOR_MODEL)
    ),
})
