/**
 * Storyteller Tools - GRRM Solo Model
 *
 * Consolidated to ~10 core CRUD tools across 4 files.
 * All tools follow Mastra v1 patterns: createTool with (inputData, context) execute signature.
 */

// Side effect: registers the storyteller agents + beat-draft-workflow on the
// kernel runtime registry BEFORE any agent constructor can call
// getMastraInstance() (every agent imports this barrel). See io/mastra-runtime.
import '@/shared/data/server-guard'
import '@/domains/storyteller/core/io/mastra-runtime'

import { manageBeatTool, listBeatsTool } from './beat-tools'
import { manageCharacterTool, listCharactersTool } from './character-tools'
import { manageEpisodeTool, listEpisodesTool } from './episode-tools'
import {
  updateWorldBibleTool,
  readWorldBibleTool,
  checkContinuityTool,
} from './bible-tools'
import { checkSectionAlignmentTool } from './section-alignment-tool'

export { manageBeatTool, listBeatsTool } from './beat-tools'

// Character management (2 tools)
export { manageCharacterTool, listCharactersTool } from './character-tools'

// Episode management (2 tools)
export { manageEpisodeTool, listEpisodesTool } from './episode-tools'

// World Bible + Continuity (3 tools)
export { updateWorldBibleTool, readWorldBibleTool, checkContinuityTool } from './bible-tools'
export { checkSectionAlignmentTool } from './section-alignment-tool'
export { proposeCharacterFieldsTool } from './propose-character-fields-tool'

// Workflow entry (tool #10) — for the CHAT adapter only, never the author
// (the author runs inside the workflow; recursion guard).
export { runBeatDraftWorkflowTool } from './workflow-tool'

/**
 * All tools for the GRRM Agent
 * Total: 10 tools (CRUD + continuity + section alignment)
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
  checkSectionAlignmentTool,
]
