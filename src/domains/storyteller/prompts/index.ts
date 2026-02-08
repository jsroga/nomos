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
  buildCombinedStoryboardPrompt,
} from './image'

// Extended Thinking Framework
// Structured pre-generation reasoning for GRRM/Gilligan quality
export const EXTENDED_THINKING_FRAMEWORK = `
<thinking_framework>
Before writing, complete these steps internally:

1. CHARACTER AUDIT (GRRM: "The human heart in conflict with itself")
   - What does each character WANT in this scene?
   - What do they NEED (that they don't know)?
   - What are they HIDING from other characters?
   - What is their INTERNAL CONTRADICTION?

2. SCENE PURPOSE CHECK (Gilligan: "Every scene earns its place")
   - What is the state BEFORE this scene?
   - What changes by the end? (If nothing changes, cut this scene)
   - What information is revealed (or withheld)?
   - What's the VISUAL HOOK? (First thing we see)

3. CONSEQUENCE TRACE (GRRM: "Actions have weight")
   - What previous events led to this moment?
   - What future events does this enable?
   - Who pays a COST in this scene? (No free actions)
   - What would happen if this character had plot armor? (Then remove the armor)

4. RELATIONSHIP CHECK
   - How does each relationship in this scene shift?
   - Is the power dynamic visible in dialogue/action?
   - Are characters acting consistently with their relationship history?

5. VOICE VERIFICATION (Gilligan: "Specificity over generic")
   - Can you identify each speaker without dialogue tags?
   - Replace generic emotions with SPECIFIC physical actions
   - Replace telling with showing: "He was angry" → what does anger LOOK like for THIS character?

Only AFTER completing this analysis should you write.
</thinking_framework>
`

// System Prompts (to be added)
// export { WRITING_LAWS } from './system/writing-laws'
