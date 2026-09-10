/**
 * Server-only storyteller exports.
 * Use in API routes, MCP, and Trigger tasks — never import from the client barrel.
 */

// (Schema re-exports removed with the duplicate domain schema, PLAN-V2 6.1 —
// tables live at @/db/schema; no server-barrel consumer imported them.)

export * from './services/access-verification-service'
export * from './services/context-assembly-service'
export * from './services/contextual-summary-service'
export * from './services/entity-auto-linker-service'
export * from './services/entity-auto-register-service'
export * from './services/entity-registry-service'
export * from './services/moodboard-generation-service'
export * from './services/poster-generation-service'
export * from './services/rag-service'
export * from './services/relationship-enricher-service'
export * from './services/script-operations-service'
export * from './services/context/series-bible'
export * from './services/storyteller-crud-service'

export { createStorytellerAgent } from './ai/agents/StorytellerAgent/storyteller-agent'
export { normalizeMastraTraceId, createMastraTraceId } from './ai/tracing'

// Script review — critic-backed (replaces the deleted persona judge)
export {
  reviewScript,
  quickReview,
  type ScriptReviewRequest,
  type ScriptReviewResult,
  type PersonaReview,
} from './services/script-review-service'

export { storytellerService } from './services/storyteller-crud-service'

export { isStorytellerAutonomousEnabled } from './ai/agents/AutonomousAuthor/autonomous-author-agent'
export {
  beatPatchRequestRecord,
  beatPatchRequestSchema,
  pickBeatPatchUpdates,
} from './core/beat-patch'
export {
  buildCharacterPatchUpdates,
  characterPatchRequestRecord,
  characterPatchRequestSchema,
} from './core/character-patch'
export { completeScriptGhost } from './core/io/complete-script-ghost'
export {
  createControllerStreamContext,
  mapControllerEvent,
  type ControllerFrameIntent,
} from './ai/controller/controller-sse-wire'
export { resolveChatModelId, resolveWriterModelChoice } from './config/resolve-chat-model'
export { CHAT_MODELS, isKnownChatModel } from './config/chat-model-catalog'
export { resolveStorytellerModel } from './config/model-config'
export type { generateStoryboard } from './tasks/generate-storyboard.task'
export type { generateCombinedStoryboard } from './tasks/generate-combined-storyboard.task'
export {
  beatsWithImageUrl,
  type CombinedStoryboardBeat,
} from './tasks/generate-combined-storyboard-helpers'
export { isStorytellerControllerEnabled } from './ai/controller/storyteller-controller'
export { BibleSection, ManuscriptMode, parsePhaseId } from './core/types/enums'
export { type DetectedSection } from './config/tool-result-mapper'
export {
  bibleOwnedFieldsMissingFromCanon,
  isPresentOverlapValue,
  omitBibleOwnedPlanFields,
  omitVacantSoundtrackInspirations,
  pickBibleOwnedPlanFields,
  populatedSoundtrackInspirations,
} from './core/utils/bible-populated-fields'
export { storyPlanRecordFromJson, episodeStoryPlanResponse } from './core/entities/story-plan-wire'
export {
  StorytellerAnswerSeparator,
  StorytellerBeatTypeFallback,
  StorytellerLegacyPlanField,
  StorytellerPromptAgentInstruction,
  StorytellerPromptTemplateToken,
  StorytellerSettingFallback,
} from './core/storyteller-page-wire'
export { loadBeatEpisodeLock, readBeatId } from './services/beat-image-prompt-context'
export {
  EPISODE_PATCH_ALLOWED_COLUMNS,
  EpisodePatchAlias,
  EpisodePatchRequestKey,
  episodePatchRequestRecord,
  episodePatchRequestSchema,
  type EpisodePatchColumn,
} from './core/io/episode-patch'

// Consistency check — pure service behind the legacy API shape
// (replaces the deleted ConsistencyAgent judge)
export { runConsistencyCheck } from './services/consistency-check-adapter'

export { getUndoManager } from './core/editing/undo-manager'
export { GrrmAuthorAgentId, BeatPlannerAgentId, StorytellerAgentId } from './ai/constants/agent-identity'
export { formatBannedPhrasesForPrompt } from './ai/prompts/guardrails/anti-slop-phrases'
export {
  fillMissingEntityDescriptions,
  generateBaseEntityDescription,
} from './services/entity-base-description-service'
export { entityNeedsDescription } from './services/utils/entity-needs-description'
export { hasUsefulResolveContext } from './services/utils/entity-base-description'
export {
  displayNameFromRefId,
  getEntityTypeFromId,
} from './services/entity-registry-reference-id'
export {
  ROLE_ENV_VARS,
  resolveRoleModel,
  resolveUserPickerOpenRouterModelId,
  type StorytellerModelRole,
} from './config/model-config'
export {
  GenerateCharacterFieldsErrorCode,
  generateCharacterFieldsRequestSchema,
} from './services/utils/generate-character-fields'
export {
  GenerateCharacterFieldsError,
  generateCharacterMissingFields,
} from './services/generate-character-fields-service'
export type { generatePortrait } from './tasks/generate-portrait.task'
export { buildCharacterPortraitPrompt } from './tasks/utils/character-portrait-prompt'
export { isPortraitCharacterUuid } from './tasks/utils/generate-portrait-wire'
export {
  generateOverviewVisualSubject,
  isVisualSubjectConfigured,
} from './services/visual-subject-llm'
export { VisualSubjectKind } from './services/utils/visual-overview'
export { requestedEpisodePremiseField } from './core/utils/requested-episode-premise-field'
export { CharacterDraftChatSection, StorytellerMessageRole, StorytellerMessageType } from './core/storyteller-page-wire'
export { beatDraftOutputSchema } from './ai/workflows/beat-draft-contract'
