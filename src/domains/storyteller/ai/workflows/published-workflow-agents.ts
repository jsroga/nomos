/**
 * Workflow generate/critic calls resolve the published Editor overlay when
 * the agent is on the Mastra instance; otherwise the code FS agent.
 * Does not import mastra-runtime (registration cycle).
 */

import '@/shared/data/server-guard'
import type { Agent } from '@mastra/core/agent'
import { getPublishedAgentOr } from '@/shared/agent-kernel/mastra/get-published-agent'
import { CriticAgentId } from '@/domains/storyteller/ai/agents/critics/constants/critic-agents'
import {
  BeatPlannerAgentId,
  GrrmAuthorAgentId,
} from '@/domains/storyteller/ai/constants/agent-identity'
import {
  continuityCritic,
  dialogueCritic,
  proseCritic,
  stakesCritic,
} from '@/domains/storyteller/ai/agents/critics'
import { statelessBeatPlanner, statelessGrrmAuthor } from './stateless-agents'

export function publishedGrrmAuthor(): Promise<Agent> {
  return getPublishedAgentOr(GrrmAuthorAgentId.GrrmAuthor, statelessGrrmAuthor)
}

export function publishedBeatPlanner(): Promise<Agent> {
  return getPublishedAgentOr(BeatPlannerAgentId.BeatPlanner, statelessBeatPlanner)
}

export function publishedContinuityCritic(): Promise<Agent> {
  return getPublishedAgentOr(CriticAgentId.Continuity, continuityCritic)
}

export function publishedProseCritic(): Promise<Agent> {
  return getPublishedAgentOr(CriticAgentId.Prose, proseCritic)
}

export function publishedStakesCritic(): Promise<Agent> {
  return getPublishedAgentOr(CriticAgentId.Stakes, stakesCritic)
}

export function publishedDialogueCritic(): Promise<Agent> {
  return getPublishedAgentOr(CriticAgentId.Dialogue, dialogueCritic)
}
