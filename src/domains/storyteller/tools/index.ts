/**
 * Storyteller Tools - Mastra Implementation
 *
 * Central barrel export for all migrated Mastra tools.
 */

// Beat Management
export { manageBeatTool, listBeatsTool } from './beat-tools'

// Character Relationships
export {
  analyzeRelationshipsTool,
  suggestRelationshipTool,
} from './character-tools'

// Character Creation
export {
  askCharacterQuestionsTool,
  createCharacterTool,
  checkCharacterExistsTool,
  characterCreationTools,
} from './character-creation-tools'

// Episode Creation
export {
  createEpisodeTool,
  askContinueTobeatsTool,
  startBeatPlanningTool,
  episodeCreationTools,
} from './episode-creation-tools'

// Continuity Checking
export { checkContinuityTool, quickConsistencyCheckTool } from './continuity-tools'

// Script Editing
export {
  expandSceneTool,
  condenseSceneTool,
  improveDialogueTool,
  addVisualHookTool,
  shiftToneTool,
  regenerateTextTool,
} from './script-tools'

// World Building
export { updateWorldBibleTool, worldBuildingTools } from './world-building-tools'

// Research (already migrated)
export { researchTool, factCheckTool, referenceLookupTool } from './research-adapter'

// Storytelling Logic (already migrated)
export {
  getPlotPhaseTool,
  validateConsistencyTool,
  updateStoryPhaseTool,
} from './storytelling-adapter'

// RAG Tools
export {
  searchKnowledgeBaseTool,
  storeKnowledgeTool,
  searchCharacterHistoryTool,
  getUserPreferencesTool,
} from './rag-tools'

// Psychologist Tools
export {
  analyzePsychologyTool,
  simulateReactionTool,
  assessRelationshipTool,
} from './psychologist-tools'

// Agent Meta Tools (The Council)
export {
  consultPsychologistTool,
  consultConsequenceTrackerTool,
  consultDevilsAdvocateTool,
  consultGardenerTool,
  consultPremiseArchitectTool,
  consultConsistencyTool,
  consultCreativeDirectorTool,
  agentTools,
} from './agent-tools'

// Self-Critique Tool
export { selfCritiqueTool } from './self-critique-tool'

