/**
 * Stateless author + planner used inside workflow steps and registered on
 * the central Mastra instance (StoryForge `statelessAuthor` pattern).
 *
 * Deliberately memoryless and tool-less: workflow steps assemble all context
 * themselves, so drafting/planning is pure generation with no tool detours.
 * This module MUST NOT import from `@/shared/agent-kernel` — it sits below
 * the Mastra instance in the import graph (the instance registers these).
 */

import { Agent } from '@mastra/core/agent'
import { buildGrrmSystemPrompt } from '@/domains/storyteller/prompts/GrrmSystemPrompt'
import { buildBeatPlannerPrompt } from '@/domains/storyteller/prompts/beat-planner-prompt'
import { resolveRoleModel } from '@/domains/storyteller/config/ModelConfig'
import {
  STORYTELLER_AUTHOR_MODEL,
  requestContextString,
} from '@/domains/storyteller/agents/request-context'

export const statelessGrrmAuthor = new Agent({
  id: 'grrm-author',
  name: 'GRRM Author',
  description:
    'The solo creative mind — drafts and revises script beats with craft mechanics (Law of Motion, anti-slop, subtext dialogue).',
  // The user's picker choice (RequestContext) overrides the author default —
  // resolved per request, endpoint-aware (GLM object form included).
  model: ({ requestContext }) =>
    resolveRoleModel('author', requestContextString(requestContext, STORYTELLER_AUTHOR_MODEL)),
  instructions: buildGrrmSystemPrompt(),
})

export const statelessBeatPlanner = new Agent({
  id: 'beat-planner',
  name: 'Beat Planner',
  description:
    'Plans beat structure as JSON (goal, conflict, turn, dialogue hook) — never writes prose.',
  model: () => resolveRoleModel('planner'),
  instructions: buildBeatPlannerPrompt(),
})
