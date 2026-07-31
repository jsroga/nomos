import { agentConfig } from '@mastra/core/agent'
import {
  AgentModelRole,
  GrrmAuthorAgentDescription,
  GrrmAuthorAgentId,
  GrrmAuthorAgentLabel,
} from '@/domains/storyteller/ai/constants/agent-identity'
import { resolveRoleModel } from '@/domains/storyteller/config/constants/model-config'
import {
  STORYTELLER_AUTHOR_MODEL,
  requestContextString,
} from '@/domains/storyteller/ai/request-context'
import { composeGrrmInstructions } from './compose-instructions'

/**
 * File-based GRRM author. Stateless Studio/workflow path uses this config;
 * class wrapper may rebuild instructions with phase/context via compose*.
 */
export default agentConfig({
  id: GrrmAuthorAgentId.GrrmAuthor,
  name: GrrmAuthorAgentLabel.GrrmAuthor,
  description: GrrmAuthorAgentDescription.GrrmAuthor,
  model: ({ requestContext }) =>
    resolveRoleModel(
      AgentModelRole.Author,
      requestContextString(requestContext, STORYTELLER_AUTHOR_MODEL)
    ),
  instructions: () => composeGrrmInstructions(),
})
