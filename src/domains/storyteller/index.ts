/**
 * Storyteller public module API.
 *
 * This is the only supported storyteller import target for code outside
 * src/domains/storyteller. A few server-side re-exports remain as an interim
 * seam until later shared-layer/schema cleanup work lands.
 */

// Agents (re-exported from unified barrel covering all agent groups)
export * from './agents'

// Client-facing components (ui/)
export * from './ui/ActionApprovalModal'
export * from './ui/ActionToast'
export * from './ui/CharacterPanel'
export * from './ui/CharacterWeb'
export type { CharacterWebProps } from './ui/CharacterWeb/CharacterWeb'
export * from './ui/ConsistencyMessage'
export * from './ui/CorkBoard'
export * from './ui/EpisodeManager'
export * from './ui/MasterPromptEditor'
export * from './ui/PhaseNavigator'
export * from './ui/QuestionCard'
export * from './ui/ReferenceText'
export * from './ui/StorytellerEmptyState'
export { default as ScriptEditor } from './ui/ScriptEditor'
export type { ScriptEditorProps } from './ui/ScriptEditor'
export { default as StoryPlanBoard } from './ui/StoryPlanBoard'
export type { StoryPlanBoardProps } from './ui/StoryPlanBoard'
export { default as Timeline } from './ui/Timeline'
export type { TimelineProps } from './ui/Timeline'
export { default as WorldBiblePanel } from './ui/WorldBiblePanel'
export type { WorldBiblePanelProps } from './ui/WorldBiblePanel'

// Config
export * from './config/action-config'
export * from './config/storyteller-agents'
export * from './config/tool-result-mapper'

// Core (re-exported from unified barrel)
export * from './core'

// State hooks
export * from './state/queries/useBibleState'
export * from './state/queries/useEpisodeData'
export * from './state/hooks/useLoadingStates'
export * from './state/queries/useStorytellerActions'
export * from './state/hooks/useStorytellerHydration'

// Mentions (ui/)
export * from './ui/MentionsProvider'

// Prompt types/schemas
export * from './prompts/schemas/agent-schemas'

// Interim server-side compatibility re-exports (scheduled for later cleanup)
export * from './db/schema'
export * as storytellerSchema from './db/schema'
export * from './services/AccessVerificationService'
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
export * from './services/StorytellerCrudService'
