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
import { EDITOR_INSTRUCTIONS_AND_TOOL_DESCRIPTIONS } from '@/shared/agent-kernel/mastra/editor-permissions'
import { composeGrrmInstructions } from './compose-instructions'

/**
 * File-based GRRM author. Uses the author orchestration slot
 * (STORYTELLER_AUTHOR_MODEL / matrix) — not the Writers Room chat picker.
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
  editor: EDITOR_INSTRUCTIONS_AND_TOOL_DESCRIPTIONS,
})
