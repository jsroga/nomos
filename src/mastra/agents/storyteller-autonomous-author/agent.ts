import '@/shared/data/server-guard'
import config, { autonomousGoal } from './config'
import { assembleFsAgent } from '@/shared/agent-kernel/mastra/load-fs-agent'
import {
  AutonomousAuthorId,
  AutonomousAuthorName,
  STORYTELLER_AUTONOMOUS_ENV,
  STORYTELLER_AUTONOMOUS_MAX_RUNS,
} from './constants'
import { FeatureFlag, isFeatureEnabled } from '@/shared/data/constants/feature-flags'
import type { GoalConfig } from '@mastra/core/agent'

export const autonomousAuthorAgent = assembleFsAgent(AutonomousAuthorId.Agent, config)

export const AUTONOMOUS_AUTHOR_ID = AutonomousAuthorId.Agent
export const AUTONOMOUS_AUTHOR_NAME = AutonomousAuthorName.Agent
export { STORYTELLER_AUTONOMOUS_MAX_RUNS, STORYTELLER_AUTONOMOUS_ENV }

export function getAutonomousGoalConfig(): GoalConfig {
  return autonomousGoal
}

export function isStorytellerAutonomousEnabled(): boolean {
  return isFeatureEnabled(FeatureFlag.StorytellerAutonomous)
}
