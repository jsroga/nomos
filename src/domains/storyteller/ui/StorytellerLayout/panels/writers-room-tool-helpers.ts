import { proposeAssistantEpisodeUpdate } from '@/domains/storyteller/state/utils/propose-assistant-episode-update'
import {
  proposeAssistantBibleUpdates,
  proposalsFromWrittenBibleFields,
  type ProposedBibleSectionUpdate,
} from '@/domains/storyteller/state/utils/propose-assistant-bible-update'
import type { AssistantCompletedToolCall } from '@/shared/chat/assistant/extract-completed-assistant-tool-calls'
import { AssistantGenerationPhase } from '@/shared/chat/assistant/derive-assistant-generation-activity'
import { CharacterDraftChatSection, GenerationActivityPhase } from '@/domains/storyteller/state/constants/storyteller-ui-store'
import {
  recordArrayFromJson,
  recordFromJson,
  readString,
  stringArrayFromJson,
} from '@/shared/data/json-guards'
import { buildStorytellerProjectContext } from '@/domains/storyteller/ui/MentionsProvider/build-storyteller-project-context'
import type { ProjectContext } from '@/shared/chat'
import {
  formatBibleSectionList,
  isNonBibleToolPayload,
  mergeToolArgFields,
} from '@/domains/storyteller/state/utils/merge-add-to-world-proposals'
import { WritersRoomToast } from '@/domains/storyteller/ui/StorytellerLayout/constants/writers-room-copy'
import { resolveAddToWorldCommit } from '@/domains/storyteller/state/utils/resolve-add-to-world-target'
import { characterDraftFieldsFromToolArgs } from '@/domains/storyteller/state/utils/character-draft-fields-from-tool'
import { StorytellerChatTool, StorytellerTab } from '@/domains/storyteller/core/storyteller-page-wire'
import { getStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import { ActionType } from '@/domains/storyteller/core/types/enums'
import type { StreamAgentAction } from '@/domains/storyteller/core/types/action-types'
import { AssistantChatBodyKey, ChatMessageRole } from '@/shared/chat/core/constants/assistant-thread-ui'
import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import {
  episodePremiseFromToolArgs,
  pickEpisodePremise,
  pickWorldDescriptionForBible,
  stripAssistantBibleChatChrome,
  worldDescriptionFromToolArgs,
} from '@/domains/storyteller/state/utils/strip-assistant-bible-chat-chrome'

export function writersRoomChatBody(input: {
  projectId: string
  episodeId?: string | null
  bibleSection?: string
}): Record<string, string> {
  const body: Record<string, string> = {
    [AssistantChatBodyKey.ProjectId]: input.projectId,
  }
  if (input.episodeId) body[AssistantChatBodyKey.EpisodeId] = input.episodeId
  if (input.bibleSection) body[AssistantChatBodyKey.BibleSection] = input.bibleSection
  return body
}

export function writersRoomProjectContext(input: {
  projectId: string
  characters: ProjectContext['characters']
  beats: ProjectContext['beats']
  storyPlan: unknown
}): ProjectContext {
  const plan = recordFromJson(input.storyPlan)
  return buildStorytellerProjectContext({
    projectId: input.projectId,
    characters: input.characters,
    episodes: [],
    beats: input.beats,
    seriesBible: {
      ...plan,
      worldRules: recordArrayFromJson(plan.worldRules),
      inspirations: recordFromJson(plan.inspirations),
      soundtracks: recordArrayFromJson(plan.soundtracks),
      plotTwists: stringArrayFromJson(plan.plotTwists),
      factions: recordArrayFromJson(plan.factions),
    },
  })
}

export function omitSectionKey<V>(
  current: Record<string, V>,
  section: string,
): Record<string, V> {
  const next: Record<string, V> = {}
  for (const key of Object.keys(current)) {
    if (key === section) continue
    const value = current[key]
    if (value !== undefined) next[key] = value
  }
  return next
}

export function previewAlreadyInPlan(
  preview: Record<string, unknown>,
  plan: Record<string, unknown>,
): boolean {
  for (const key of Object.keys(preview)) {
    if (JSON.stringify(plan[key]) !== JSON.stringify(preview[key])) return false
  }
  return Object.keys(preview).length > 0
}

export function worldDescriptionFromPendings(
  pendings: Record<string, { preview?: unknown }>,
): string | undefined {
  for (const pending of Object.values(pendings)) {
    const description = readString(recordFromJson(pending.preview).worldDescription)
    if (description) return description
  }
  return undefined
}

export function episodePremiseFromPendings(
  pendings: Record<string, { preview?: unknown }>,
): Record<string, unknown> | undefined {
  for (const pending of Object.values(pendings)) {
    const preview = recordFromJson(pending.preview)
    const premise = recordFromJson(preview.premise ?? preview.episodePremise)
    if (Object.keys(premise).length > 0) return premise
  }
  return undefined
}

export function proposalsFromCompletedToolCall(
  call: AssistantCompletedToolCall,
  episodeId?: string | null,
  requestedSection?: string,
): ProposedBibleSectionUpdate[] {
  if (requestedSection === CharacterDraftChatSection.Form) return []
  if (call.toolName === StorytellerChatTool.ProposeCharacterFields) return []
  const bibleProposals = proposeAssistantBibleUpdates(call, episodeId, requestedSection)
  if (bibleProposals.length > 0) return bibleProposals
  const episodeProposal = proposeAssistantEpisodeUpdate(call, episodeId)
  return episodeProposal ? [episodeProposal] : []
}

export function extraPendingSectionsMessage(
  proposals: readonly ProposedBibleSectionUpdate[],
): string | null {
  if (proposals.length < 2) return null
  return `${WritersRoomToast.PendingExtrasPrefix}${formatBibleSectionList(
    proposals.slice(1).map(proposal => proposal.section),
  )}`
}

enum BeatWriteOperation {
  Create = 'create',
}

export function isBeatCreateToolArgs(toolArgs: readonly Record<string, unknown>[]): boolean {
  return createBeatCommitActions(toolArgs).length > 0
}

export function createBeatCommitActions(
  toolArgs: readonly Record<string, unknown>[],
): StreamAgentAction[] {
  const actions: StreamAgentAction[] = []
  for (const args of toolArgs) {
    const operation = readString(args.operation)
    const data = recordFromJson(args.data)
    const logline = readString(data.logline)
    if (!logline) continue
    if (operation !== undefined && operation !== BeatWriteOperation.Create) continue
    const setups = recordFromJson(data.setupsPayoffs)
    actions.push({
      type: ActionType.CREATE_BEAT,
      payload: {
        logline,
        content: data.content,
        beatType: data.beatType,
        visualHook: data.visualHook,
        charactersInvolved: data.charactersInvolved,
        emotionalShifts: data.emotionalShifts,
        causalDependencies: data.causalDependencies,
        setupsPayoffs: {
          ...setups,
          actionTaken: data.actionTaken,
          consequence: data.consequence,
          storyStateChange: data.storyStateChange,
        },
      },
      status: ApprovalActionStatus.COMMITTED,
      id: `add-to-world-beat-${actions.length}-${Date.now()}`,
    })
  }
  return actions
}

export function showBeatOnBoard(input: {
  episodeId: string | null | undefined
  setActiveTab: (tab: string) => void
  closeBible: () => void
  refreshBeats: (episodeId: string) => Promise<unknown>
}): boolean {
  const episodeId = input.episodeId
  if (!episodeId) return false
  input.setActiveTab(StorytellerTab.Board)
  input.closeBible()
  getStorytellerUiStore().setPendingBoardHydration(true)
  void (async () => {
    try {
      await Promise.resolve(input.refreshBeats(episodeId))
    } finally {
      getStorytellerUiStore().setPendingBoardHydration(false)
    }
  })()
  return true
}

export function isSuccessfulBeatWrite(call: AssistantCompletedToolCall): boolean {
  if (call.toolName !== StorytellerChatTool.ManageBeat) return false
  const result = recordFromJson(call.result)
  return result.success === true && Object.keys(recordFromJson(result.beat)).length > 0
}

export function pendingBeatArgsFromToolCalls(
  calls: readonly AssistantCompletedToolCall[],
): Record<string, unknown>[] {
  return calls.filter(isSuccessfulBeatWrite).map(call => recordFromJson(call.args))
}

/** `null` means skip (non-bible tool args). `[]` means nothing to commit. */
export function chatFallbackAddToWorldTargets(input: {
  toolArgs: readonly Record<string, unknown>[]
  pending: Record<string, { preview?: unknown }>
  lastPreview: unknown
  chatText: string
  requestedSection?: string
}): ProposedBibleSectionUpdate[] | null {
  if (input.requestedSection === CharacterDraftChatSection.Form) return null
  if (isNonBibleToolPayload(input.toolArgs)) return null
  const lastPreview = recordFromJson(input.lastPreview)
  const episodePremise = pickEpisodePremise([
    episodePremiseFromToolArgs(input.toolArgs),
    episodePremiseFromPendings(input.pending),
    recordFromJson(lastPreview.premise ?? lastPreview.episodePremise),
  ])
  const overviewProse = pickWorldDescriptionForBible([
    worldDescriptionFromToolArgs(input.toolArgs),
    worldDescriptionFromPendings(input.pending),
    readString(lastPreview.worldDescription),
    stripAssistantBibleChatChrome(input.chatText),
  ])
  const fallback = resolveAddToWorldCommit({
    episodePremise,
    overviewProse,
    cleanedChat:
      episodePremise || overviewProse ? '' : stripAssistantBibleChatChrome(input.chatText),
    requestedSection: input.requestedSection,
  })
  if (!fallback) return []
  return [
    {
      section: fallback.section,
      preview: fallback.preview,
      action: {
        type: fallback.actionType,
        payload: fallback.preview,
        status: ApprovalActionStatus.COMMITTED,
        id: `add-to-world-${Date.now()}`,
      },
      dedupeKey: `add-to-world:${fallback.section}`,
    },
  ]
}

export function mapAssistantPhase(phase: AssistantGenerationPhase): GenerationActivityPhase {
  switch (phase) {
    case AssistantGenerationPhase.Idle:
      return GenerationActivityPhase.Idle
    case AssistantGenerationPhase.Submitted:
      return GenerationActivityPhase.Submitted
    case AssistantGenerationPhase.Streaming:
      return GenerationActivityPhase.Streaming
    case AssistantGenerationPhase.Tool:
      return GenerationActivityPhase.Tool
    case AssistantGenerationPhase.Error:
      return GenerationActivityPhase.Error
  }
}

export interface ShouldShowAddToWorldInput {
  role: string
  requestedSection?: string
  toolNames: readonly string[]
  toolArgs: readonly Record<string, unknown>[]
}

enum EpisodeManageToolId {
  ManageEpisode = 'manage_episode',
}

function isProposeCharacterFieldsTurn(toolNames: readonly string[]): boolean {
  return toolNames.some(name => name === StorytellerChatTool.ProposeCharacterFields)
}

function hasCommittableBibleOrBeatWrite(
  toolNames: readonly string[],
  toolArgs: readonly Record<string, unknown>[],
): boolean {
  if (toolNames.includes(StorytellerChatTool.UpdateWorldBible)) return true
  if (toolNames.includes(EpisodeManageToolId.ManageEpisode)) return true
  if (toolNames.includes(StorytellerChatTool.ManageBeat) && isBeatCreateToolArgs(toolArgs)) {
    return true
  }
  if (isBeatCreateToolArgs(toolArgs)) return true
  return proposalsFromWrittenBibleFields(mergeToolArgFields(toolArgs)).length > 0
}

export function shouldShowAddToWorld(input: ShouldShowAddToWorldInput): boolean {
  if (input.role !== ChatMessageRole.Assistant) return false
  if (isCharacterDraftAddToWorldTurn(input)) return true
  if (input.requestedSection === CharacterDraftChatSection.Form) return false
  return hasCommittableBibleOrBeatWrite(input.toolNames, input.toolArgs)
}

export function isCharacterDraftAddToWorldTurn(input: {
  requestedSection?: string
  toolNames?: readonly string[]
  toolArgs?: readonly Record<string, unknown>[]
}): boolean {
  if (isProposeCharacterFieldsTurn(input.toolNames ?? [])) return true
  if (input.requestedSection !== CharacterDraftChatSection.Form) return false
  if (characterDraftFieldsFromToolArgs(input.toolArgs ?? []) !== null) return true
  const store = getStorytellerUiStore()
  return (
    store.characterDraftFields !== null &&
    store.characterDraftFieldsSeq > store.characterDraftResolvedSeq
  )
}
