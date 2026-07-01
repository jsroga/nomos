/**
 * Storyteller public module API.
 *
 * This is the only supported storyteller import target for code outside
 * src/domains/storyteller. A few server-side re-exports remain as an interim
 * seam until later shared-layer/schema cleanup work lands.
 */

// Agents
export * from './agents'
export * from './agents/ConsistencyAgent'
export * from './agents/ScriptReviewAgent'
export * from './agents/StorytellerWorkflow'
export * from './agents/WritersRoomGraph'

// Client-facing components
export * from './components/ActionApprovalModal'
export * from './components/ActionToast'
export * from './components/CharacterPanel'
export * from './components/CharacterWeb'
export type { CharacterWebProps } from './components/CharacterWeb/CharacterWeb'
export * from './components/ConsistencyMessage'
export * from './components/CorkBoard'
export * from './components/EpisodeManager'
export * from './components/MasterPromptEditor'
export * from './components/PhaseNavigator'
export * from './components/QuestionCard'
export * from './components/ReferenceText'
export * from './components/StorytellerEmptyState'
export { default as ScriptEditor } from './components/ScriptEditor'
export type { ScriptEditorProps } from './components/ScriptEditor'
export { default as StoryPlanBoard } from './components/StoryPlanBoard'
export type { StoryPlanBoardProps } from './components/StoryPlanBoard'
export { default as Timeline } from './components/Timeline'
export type { TimelineProps } from './components/Timeline'
export { default as WorldBiblePanel } from './components/WorldBiblePanel'
export type { WorldBiblePanelProps } from './components/WorldBiblePanel'

// Config
export * from './config/action-config'
export * from './config/storyteller-agents'
export * from './config/tool-result-mapper'

// Core
export * from './core/ActionTypes'
export * from './core/CascadeEditor'
export * from './core/ConsistencyTypes'
export * from './core/Enums'
export * from './core/ReferenceParser'
export * from './core/UndoManager'
export * from './core/WorkflowContext'

// Hooks
export * from './hooks/useBibleState'
export * from './hooks/useEpisodeData'
export * from './hooks/useLoadingStates'
export * from './hooks/useStorytellerActions'
export * from './hooks/useStorytellerHydration'

// Mentions
export * from './mentions/MentionsProvider'

// Prompt types/schemas
export * from './prompts/schemas/agent-schemas'

// Interim server-side compatibility re-exports (scheduled for later cleanup)
export * from './db/schema'
export * as storytellerSchema from './db/schema'
export * from './lib/access-verification'
export * from './services/ContextAssemblyService'
export * from './services/ContextualSummaryService'
export * from './services/EntityAutoLinkerService'
export * from './services/EntityRegistryService'
export * from './services/MoodboardGenerationService'
export * from './services/PosterGenerationService'
export * from './services/RagService'
export * from './services/RelationshipEnricherService'
export * from './services/ScriptOperationsService'
export * from './services/context/SeriesBible'
