/**
 * Storyteller Tools v2 - Mastra Implementation
 * 
 * Central barrel export for all migrated Mastra tools.
 */

// Beat Management
export { manageBeatTool, listBeatsTool, beatTools } from './beat-tools'

// Character Relationships
export { analyzeRelationshipsTool, suggestRelationshipTool, characterTools } from './character-tools'

// Character Creation
export { 
    askCharacterQuestionsTool, 
    createCharacterTool, 
    checkCharacterExistsTool,
    characterCreationTools 
} from './character-creation-tools'

// Episode Creation
export {
    createEpisodeTool,
    askContinueTobeatsTool,
    startBeatPlanningTool,
    episodeCreationTools,
} from './episode-creation-tools'

// Continuity Checking
export { checkContinuityTool, quickConsistencyCheckTool, continuityTools } from './continuity-tools'

// Script Editing
export {
    expandSceneTool,
    condenseSceneTool,
    improveDialogueTool,
    addVisualHookTool,
    shiftToneTool,
    regenerateTextTool,
    scriptTools,
} from './script-tools'

// World Building
export { updateWorldBibleTool, worldBuildingTools } from './world-building-tools'


// Research (already migrated)
export { researchTool, factCheckTool, referenceLookupTool } from './research-adapter'

// Storytelling Logic (already migrated)
export { getPlotPhaseTool, validateConsistencyTool, updateStoryPhaseTool } from './storytelling-adapter'

// RAG Tools
export {
    searchKnowledgeBaseTool,
    storeKnowledgeTool,
    searchCharacterHistoryTool,
    getUserPreferencesTool,
    ragTools,
} from './rag-tools'

// Psychologist Tools
export {
    analyzePsychologyTool,
    simulateReactionTool,
    assessRelationshipTool
} from './psychologist-tools'

// Agent Meta Tools (The Council)
export {
    consultPsychologistTool,
    consultConsequenceTrackerTool,
    consultDevilsAdvocateTool,
    consultGardenerTool,
    consultPremiseArchitectTool,
    agentTools
} from './agent-tools'

// Self-Critique Tool
export { selfCritiqueTool } from './self-critique-tool'

// All tools combined for easy registration
export const allStorytellerTools = [
    // Using the already-exported arrays
    // Note: Import these using: import { beatTools, characterTools, ... } from './v2'
]
