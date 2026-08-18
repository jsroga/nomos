import { toast } from 'sonner'
import type { AddToWorldPayload } from '@/shared/chat/assistant/AssistantAddToWorldContext'
import { applyUpdatesToStoryPlan } from '@/domains/storyteller/config/action-config'
import { proposalsFromWrittenBibleFields } from '@/domains/storyteller/state/utils/propose-assistant-bible-update'
import {
  bibleSectionDisplayName,
  formatBibleSectionList,
  mergeAddToWorldProposals,
  mergeToolArgFields,
} from '@/domains/storyteller/state/utils/merge-add-to-world-proposals'
import { narrowEpisodePremiseProposal } from '@/domains/storyteller/state/utils/requested-episode-premise-field'
import { recordFromJson } from '@/shared/data/json-guards'
import type { StorytellerPageSlices } from '@/domains/storyteller/state/hooks/useStorytellerPage'
import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import { StorytellerTab } from '@/domains/storyteller/core/storyteller-page-wire'
import { getStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import {
  WritersRoomConfirm,
  WritersRoomToast,
} from '@/domains/storyteller/ui/StorytellerLayout/constants/writers-room-copy'
import {
  chatFallbackAddToWorldTargets,
  createBeatCommitActions,
  omitSectionKey,
  previewAlreadyInPlan,
  showBeatOnBoard,
} from '@/domains/storyteller/ui/StorytellerLayout/panels/writers-room-tool-helpers'
import type { ConfirmNewCastInput } from '@/domains/storyteller/state/hooks/useConfirmNewCastMembers'

type WritersRoomCore = StorytellerPageSlices['core']

export interface CommitWritersRoomAddToWorldInput {
  payload: AddToWorldPayload
  currentEpisodeId: WritersRoomCore['currentEpisodeId']
  answeredSection: string | undefined
  requestedPremiseField: string | undefined
  sectionPendingActions: WritersRoomCore['sectionPendingActions']
  rejectedSections: Set<string>
  lastPreview: unknown
  storyPlan: unknown
  confirm: (options: {
    title: string
    description: string
    confirmLabel?: string
    cancelLabel?: string
  }) => Promise<boolean>
  confirmNewCastMembers: (payload: ConfirmNewCastInput) => Promise<unknown>
  executeAction: WritersRoomCore['executeAction']
  setActiveTab: WritersRoomCore['setActiveTab']
  closeBible: WritersRoomCore['closeBible']
  refreshBeats: WritersRoomCore['refreshBeats']
  setStoryPlan: WritersRoomCore['setStoryPlan']
  setLoadingSections: WritersRoomCore['setLoadingSections']
  setSectionPendingActions: WritersRoomCore['setSectionPendingActions']
}

export async function commitBeatCreatesToWorld(input: {
  toolArgs: readonly Record<string, unknown>[]
  currentEpisodeId: WritersRoomCore['currentEpisodeId']
  executeAction: WritersRoomCore['executeAction']
  setActiveTab: WritersRoomCore['setActiveTab']
  closeBible: WritersRoomCore['closeBible']
  refreshBeats: WritersRoomCore['refreshBeats']
  confirmNewCastMembers?: (payload: ConfirmNewCastInput) => Promise<unknown>
}): Promise<boolean> {
  const beatActions = createBeatCommitActions(input.toolArgs)
  if (beatActions.length === 0) return false
  getStorytellerUiStore().setPendingBoardHydration(true)
  for (const action of beatActions) {
    await input.executeAction(action)
  }
  await input.confirmNewCastMembers?.({
    beatPayloads: beatActions.map(action => recordFromJson(action.payload)),
  })
  if (
    !showBeatOnBoard({
      episodeId: input.currentEpisodeId,
      setActiveTab: input.setActiveTab,
      closeBible: input.closeBible,
      refreshBeats: input.refreshBeats,
    })
  ) {
    return false
  }
  toast.success(WritersRoomToast.BeatOnBoard)
  getStorytellerUiStore().clearPendingBeatAdds(true)
  return true
}

export async function commitWritersRoomAddToWorld(
  input: CommitWritersRoomAddToWorldInput,
): Promise<boolean> {
  const toolProposals = proposalsFromWrittenBibleFields(
    mergeToolArgFields(input.payload.toolArgs),
    input.currentEpisodeId,
    input.answeredSection,
  ).map(proposal => narrowEpisodePremiseProposal(proposal, input.requestedPremiseField))
  let targets = mergeAddToWorldProposals({
    toolProposals,
    pending: input.sectionPendingActions,
    rejectedSections: input.rejectedSections,
  })

  if (targets.length === 0) {
    const committedBeats = await commitBeatCreatesToWorld({
      toolArgs: input.payload.toolArgs,
      currentEpisodeId: input.currentEpisodeId,
      executeAction: input.executeAction,
      setActiveTab: input.setActiveTab,
      closeBible: input.closeBible,
      refreshBeats: input.refreshBeats,
      confirmNewCastMembers: input.confirmNewCastMembers,
    })
    if (committedBeats) return true
    const fallbackTargets = chatFallbackAddToWorldTargets({
      toolArgs: input.payload.toolArgs,
      pending: input.sectionPendingActions,
      lastPreview: input.lastPreview,
      chatText: input.payload.text,
      requestedSection: input.answeredSection,
    })
    if (fallbackTargets === null) {
      toast.success(WritersRoomToast.NoBibleUpdates)
      return false
    }
    if (fallbackTargets.length === 0) {
      toast.success(WritersRoomToast.AddedToWorld)
      return true
    }
    targets = fallbackTargets
  }

  const plan = recordFromJson(input.storyPlan)
  targets = targets.filter(target => !previewAlreadyInPlan(target.preview, plan))
  if (targets.length === 0) {
    toast.success(WritersRoomToast.AlreadyInWorld)
    return true
  }

  if (targets.length > 1) {
    const confirmed = await input.confirm({
      title: WritersRoomConfirm.AddToWorldTitle,
      description: `${WritersRoomConfirm.AddToWorldPrefix}${formatBibleSectionList(
        targets.map(target => target.section),
      )}`,
      confirmLabel: WritersRoomConfirm.AddToWorldConfirm,
      cancelLabel: WritersRoomConfirm.AddToWorldCancel,
    })
    if (!confirmed) return false
  }

  for (const target of targets) {
    if (target.section === BibleSection.EPISODE_PREMISE) {
      input.setActiveTab(StorytellerTab.Plan)
      input.closeBible()
    }
    input.setStoryPlan(prev => applyUpdatesToStoryPlan(prev, target.preview))
    input.setLoadingSections(prev => omitSectionKey(prev, target.section))
    void input.executeAction({
      ...target.action,
      status: ApprovalActionStatus.COMMITTED,
      id: target.action.id || `add-to-world-${target.section}-${Date.now()}`,
    })
    toast.success(
      `${WritersRoomToast.SectionAddedPrefix}${bibleSectionDisplayName(target.section)}`,
    )
  }

  input.setSectionPendingActions(prev => {
    let next = prev
    for (const target of targets) {
      next = omitSectionKey(next, target.section)
    }
    return next
  })
  await input.confirmNewCastMembers({
    previews: targets.map(target => target.preview),
  })
  return true
}
