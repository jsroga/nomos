/**
 * Storyteller Agents v2 - Mastra Implementation
 * Simplified to GRRM solo model: Author + Planner (+ Critics in wave 2)
 */

// Primary agent (legacy — still used by existing routes)
export { StorytellerAgent, createStorytellerAgent } from './StorytellerAgent'

// New GRRM solo agents
export { GrrmAuthorAgent, createGrrmAuthorAgent } from './GrrmAuthor/GrrmAuthorAgent'
export { BeatPlannerAgent, createBeatPlannerAgent } from './BeatPlanner/BeatPlannerAgent'

// Orchestration (workflows, graphs, planner, context) — still used by existing routes
export * from './orchestration'

// Tools (consolidated to 9 GRRM tools)
export * from './tools'
