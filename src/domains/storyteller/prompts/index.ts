/**
 * Storyteller Prompts Index
 * 
 * Central export for all storyteller prompts.
 */

// Agent Prompts
export { SUPERVISOR_SYSTEM_PROMPT } from './agents/supervisor'
export { WRITER_STRUCTURED_PROMPT } from './agents/writer'
export { PLANNER_SYSTEM_PROMPT } from './agents/planner'
export { PLOT_ARCHITECT_STRUCTURED_PROMPT } from './agents/plot-architect'
export { SCRIPT_EDITOR_PROMPT } from './agents/script-editor'
export { EPISODE_PREMISE_PROMPT } from './agents/episode-premise'
export { CHARACTER_PSYCHOLOGY_PROMPT } from './agents/character-psychology'
export { CONSEQUENCE_TRACKER_PROMPT } from './agents/consequence-tracker'
export { DEVILS_ADVOCATE_PROMPT } from './agents/devils-advocate'
export { VISUAL_MOMENT_PROMPT } from './agents/visual-moment'
export { WORLD_SIMULATOR_PROMPT } from './agents/world-simulator'
export { MAGIC_AGENT_PROMPT } from './agents/magic-agent'

// Image Prompts
export {
    buildPortraitPrompt,
    buildPosterPrompt,
    enhanceEpisodePosterPrompt,
    buildCombinedStoryboardPrompt
} from './image'

// System Prompts (to be added)
// export { WRITING_LAWS } from './system/writing-laws'
