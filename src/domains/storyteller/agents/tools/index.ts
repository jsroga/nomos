/**
 * Storyteller Tools - GRRM Solo Model
 *
 * Consolidated to ~10 core CRUD tools across 4 files.
 * All tools follow Mastra v1 patterns: createTool with (inputData, context) execute signature.
 */

import { manageBeatTool, listBeatsTool } from './beat-tools'
import { manageCharacterTool, listCharactersTool } from './character-tools'
import { manageEpisodeTool, listEpisodesTool } from './episode-tools'
import {
  updateWorldBibleTool,
  readWorldBibleTool,
  checkContinuityTool,
} from './bible-tools'

export { manageBeatTool, listBeatsTool } from './beat-tools'

// Character management (2 tools)
export { manageCharacterTool, listCharactersTool } from './character-tools'

// Episode management (2 tools)
export { manageEpisodeTool, listEpisodesTool } from './episode-tools'

// World Bible + Continuity (3 tools)
export { updateWorldBibleTool, readWorldBibleTool, checkContinuityTool } from './bible-tools'

// Legacy council tools (writers' room — until workflow migration)
export {
  selfCritiqueTool,
  improveDialogueTool,
  addVisualHookTool,
  condenseSceneTool,
  regenerateTextTool,
  shiftToneTool,
  analyzePsychologyTool,
  simulateReactionTool,
  assessRelationshipTool,
  quickConsistencyCheckTool,
} from './legacy-council-tools'

/**
 * All tools for the GRRM Agent
 * Total: 9 tools (down from ~57)
 */
export const grrmTools = [
  // Beat CRUD
  manageBeatTool,
  listBeatsTool,
  // Character CRUD
  manageCharacterTool,
  listCharactersTool,
  // Episode CRUD
  manageEpisodeTool,
  listEpisodesTool,
  // World Bible + Continuity
  updateWorldBibleTool,
  readWorldBibleTool,
  checkContinuityTool,
]
