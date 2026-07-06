/**
 * Storyteller public module API (client-safe).
 *
 * Server-only exports live in ./server.ts — import those from API routes only.
 */

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

// Client-safe generation helpers (no server-only)
export { beatImageService } from './services/BeatImageService'
export { moodboardGenerationService } from './services/MoodboardGenerationService'
export { posterGenerationService } from './services/PosterGenerationService'

// Prompt types/schemas
export * from './prompts/schemas/agent-schemas'
