/**
 * Autonomous author — FS agent package is the SSOT.
 * @see src/mastra/agents/storyteller-autonomous-author/
 */

import '@/shared/data/server-guard'
export {
  autonomousAuthorAgent,
  AUTONOMOUS_AUTHOR_ID,
  AUTONOMOUS_AUTHOR_NAME,
  STORYTELLER_AUTONOMOUS_MAX_RUNS,
  STORYTELLER_AUTONOMOUS_ENV,
  getAutonomousGoalConfig,
  isStorytellerAutonomousEnabled,
} from '../../../../../mastra/agents/storyteller-autonomous-author/agent'
