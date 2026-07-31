/**
 * Stateless author + planner for workflow steps — assembled from FS packages.
 */

import '@/shared/data/server-guard'
export { grrmAuthorAgent as statelessGrrmAuthor } from '../../../../mastra/agents/grrm-author/agent'
export { beatPlannerAgent as statelessBeatPlanner } from '../../../../mastra/agents/beat-planner/agent'
