/**
 * Stateless author + planner used inside workflow steps and registered on
 * the central Mastra instance (StoryForge `statelessAuthor` pattern).
 *
 * Deliberately memoryless and tool-less: workflow steps assemble all context
 * themselves, so drafting/planning is pure generation with no tool detours.
 * This module MUST NOT import from `@/shared/agent-kernel` — it sits below
 * the Mastra instance in the import graph (the instance registers these).
 */

import '@/shared/data/server-guard'
import { Agent } from '@mastra/core/agent'
import { buildGrrmSystemPrompt } from '@/domains/storyteller/prompts/GrrmSystemPrompt'
import { buildBeatPlannerPrompt } from '@/domains/storyteller/prompts/beat-planner-prompt'
import { resolveRoleModel } from '@/domains/storyteller/config/constants/ModelConfig'
import {
  STORYTELLER_AUTHOR_MODEL,
  requestContextString,
} from '@/domains/storyteller/agents/request-context'
import {
  AgentModelRole,
  BeatPlannerAgentId,
  BeatPlannerAgentLabel,
  GrrmAuthorAgentDescription,
  GrrmAuthorAgentId,
  GrrmAuthorAgentLabel,
} from '@/domains/storyteller/agents/constants/agent-identity'

export const statelessGrrmAuthor = new Agent({
  id: GrrmAuthorAgentId.GrrmAuthor,
  name: GrrmAuthorAgentLabel.GrrmAuthor,
  description: GrrmAuthorAgentDescription.GrrmAuthor,
  // The user's picker choice (RequestContext) overrides the author default —
  // resolved per request, endpoint-aware (GLM object form included).
  model: ({ requestContext }) =>
    resolveRoleModel(AgentModelRole.Author, requestContextString(requestContext, STORYTELLER_AUTHOR_MODEL)),
  instructions: buildGrrmSystemPrompt(),
})

export const statelessBeatPlanner = new Agent({
  id: BeatPlannerAgentId.BeatPlanner,
  name: BeatPlannerAgentLabel.BeatPlanner,
  description: GrrmAuthorAgentDescription.BeatPlanner,
  model: () => resolveRoleModel(AgentModelRole.Planner),
  instructions: buildBeatPlannerPrompt(),
})
