'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DomainSidebar } from '@/components/DomainSidebar'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import type { AddToWorldPayload, CanAddToWorldInput } from '@/shared/chat/assistant/AssistantAddToWorldContext'
import type { AssistantGenerationActivity } from '@/shared/chat/assistant/derive-assistant-generation-activity'
import type { AssistantCompletedToolCall } from '@/shared/chat/assistant/extract-completed-assistant-tool-calls'
import { applyUpdatesToStoryPlan } from '@/domains/storyteller/config/action-config'
import { useConfirmNewCastMembers } from '@/domains/storyteller/state/hooks/useConfirmNewCastMembers'
import { useStorytellerChatModel } from '@/domains/storyteller/state/hooks/useStorytellerChatModel'
import { getStorytellerUiStore, useStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import {
  CharacterDraftChatSection,
  GenerationActivityPhase,
} from '@/domains/storyteller/state/constants/storyteller-ui-store'
import { type ProposedBibleSectionUpdate } from '@/domains/storyteller/state/utils/propose-assistant-bible-update'
import {
  addToWorldSectionLabels,
  areAddToWorldSectionsSettled,
} from '@/domains/storyteller/state/utils/merge-add-to-world-proposals'
import { parseCreatedEpisodeFromToolCall } from '@/domains/storyteller/state/utils/parse-created-episode-from-tool'
import { characterDraftFieldsFromToolCall } from '@/domains/storyteller/state/utils/character-draft-fields-from-tool'
import {
  narrowEpisodePremiseProposal,
  requestedEpisodePremiseField,
} from '@/domains/storyteller/state/utils/requested-episode-premise-field'
import { storytellerKeys } from '@/domains/storyteller/core/io/storyteller.keys'
import {
  recordFromJson,
  readString,
} from '@/shared/data/json-guards'
import type { StorytellerPageSlices } from '@/domains/storyteller/state/hooks/useStorytellerPage'
import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import { StorytellerChatTool, StorytellerTab } from '@/domains/storyteller/core/storyteller-page-wire'
import { WritersRoomAddToWorldLabel, WritersRoomToast } from '@/domains/storyteller/ui/StorytellerLayout/constants/writers-room-copy'
import {
  mapAssistantPhase,
  omitSectionKey,
  proposalsFromCompletedToolCall,
  extraPendingSectionsMessage,
  pendingBeatArgsFromToolCalls,
  isBeatCreateToolArgs,
  isCharacterDraftAddToWorldTurn,
  shouldShowAddToWorld,
} from '@/domains/storyteller/ui/StorytellerLayout/panels/writers-room-tool-helpers'
import { commitWritersRoomAddToWorld } from '@/domains/storyteller/ui/StorytellerLayout/panels/writers-room-add-to-world'
import { WritersRoomAssistantChat } from '@/domains/storyteller/ui/StorytellerLayout/panels/WritersRoomAssistantChat'

export function StorytellerWritersRoom(props: StorytellerPageSlices) {
  const {
    routeProjectId,
    characters,
    beats,
    storyPlan,
    hasBible,
    hasEpisodes,
    currentEpisodeId,
    selectEpisode,
    setLoadingSections,
    setStoryPlan,
    sectionPendingActions,
    setSectionPendingActions,
    executeAction,
    setActiveTab,
    closeBible,
    refreshBeats,
  } = props.core

  const projectId = routeProjectId ?? ''
  const queryClient = useQueryClient()
  const { modelId, setModelId, options: chatModelOptions } = useStorytellerChatModel()
  const pendingChatPrompt = useStorytellerUiStore(state => state.pendingChatPrompt)
  const clearPendingChatPrompt = useStorytellerUiStore(state => state.clearPendingChatPrompt)
  const setGenerationActivity = useStorytellerUiStore(state => state.setGenerationActivity)
  const clearGenerationActivity = useStorytellerUiStore(state => state.clearGenerationActivity)
  const bibleSection = useStorytellerUiStore(state => state.generationActivity.section)
  const proposedKeysRef = useRef(new Set<string>())
  const lastBibleProposalRef = useRef<ProposedBibleSectionUpdate | null>(null)
  const rejectedSectionsRef = useRef(new Set<string>())
  const [settledSections, setSettledSections] = useState<ReadonlySet<string>>(() => new Set())
  const requestedSectionRef = useRef<string | undefined>(undefined)
  const answeredSectionRef = useRef<string | undefined>(undefined)
  const requestedPremiseFieldRef = useRef<string | undefined>(undefined)
  const storyPlanRef = useRef(storyPlan)
  useEffect(() => {
    storyPlanRef.current = storyPlan
  }, [storyPlan])

  const pendingPrompt = useMemo(
    () => (pendingChatPrompt ? { id: pendingChatPrompt.id, text: pendingChatPrompt.message } : null),
    [pendingChatPrompt]
  )

  const handlePendingPromptHandled = useCallback(() => {
    requestedSectionRef.current = pendingChatPrompt?.section
    answeredSectionRef.current = pendingChatPrompt?.section
    requestedPremiseFieldRef.current = requestedEpisodePremiseField(
      pendingChatPrompt?.message ?? '',
    )
    clearPendingChatPrompt()
  }, [clearPendingChatPrompt, pendingChatPrompt?.message, pendingChatPrompt?.section])

  const handleStreamIdle = useCallback(() => {
    requestedSectionRef.current = undefined
    requestedPremiseFieldRef.current = undefined
    setLoadingSections({})
    clearGenerationActivity()
  }, [setLoadingSections, clearGenerationActivity])

  useEffect(() => {
    if (!pendingChatPrompt) return
    requestedSectionRef.current = pendingChatPrompt.section
    answeredSectionRef.current = pendingChatPrompt.section
    requestedPremiseFieldRef.current = requestedEpisodePremiseField(pendingChatPrompt.message)
  }, [pendingChatPrompt])

  const { confirm, ConfirmDialogComponent } = useConfirmDialog()
  const confirmNewCastMembers = useConfirmNewCastMembers({
    characters,
    storyPlanRef,
    executeAction,
    confirm,
  })
  const applyBibleProposal = useCallback(
    (proposal: ProposedBibleSectionUpdate, focusPanel = true): boolean => {
      if (proposedKeysRef.current.has(proposal.dedupeKey)) return false
      proposedKeysRef.current.add(proposal.dedupeKey)
      lastBibleProposalRef.current = proposal
      rejectedSectionsRef.current.delete(proposal.section)
      setSettledSections(current => {
        if (!current.has(proposal.section)) return current
        const next = new Set(current)
        next.delete(proposal.section)
        return next
      })
      if (focusPanel && proposal.section === BibleSection.EPISODE_PREMISE) {
        setActiveTab(StorytellerTab.Plan)
        closeBible()
      }
      setLoadingSections(prev => omitSectionKey(prev, proposal.section))
      setSectionPendingActions(prev => ({
        ...prev,
        [proposal.section]: {
          section: proposal.section,
          preview: proposal.preview,
          action: proposal.action,
          episodeId: readString(recordFromJson(proposal.action.payload).episodeId),
          onAccept: () => {
            setSettledSections(current => new Set([...current, proposal.section]))
            setStoryPlan(current => applyUpdatesToStoryPlan(current, proposal.preview))
            setSectionPendingActions(current => omitSectionKey(current, proposal.section))
            void executeAction({
              ...proposal.action,
              status: ApprovalActionStatus.COMMITTED,
            })
          },
          onReject: () => {
            rejectedSectionsRef.current.add(proposal.section)
            setSettledSections(current => new Set([...current, proposal.section]))
            setSectionPendingActions(current => omitSectionKey(current, proposal.section))
          },
        },
      }))
      return true
    },
    [closeBible, executeAction, setActiveTab, setLoadingSections, setSectionPendingActions, setStoryPlan]
  )

  const sectionLabelsFromToolArgs = useCallback(
    (toolArgs: readonly Record<string, unknown>[]) => {
      if (
        isCharacterDraftAddToWorldTurn({
          requestedSection: answeredSectionRef.current,
          toolArgs,
        })
      ) {
        return [WritersRoomAddToWorldLabel.CharacterForm]
      }
      return addToWorldSectionLabels({
        toolArgs,
        episodeId: currentEpisodeId,
        requestedSection: answeredSectionRef.current,
        rejectedSections: settledSections,
      })
    },
    [currentEpisodeId, settledSections],
  )
  const beatAddsCommitted = useStorytellerUiStore(state => state.beatAddsCommitted)
  const characterDraftFieldsSeq = useStorytellerUiStore(state => state.characterDraftFieldsSeq)
  const characterDraftResolvedSeq = useStorytellerUiStore(state => state.characterDraftResolvedSeq)
  const isAddToWorldSettled = useCallback(
    (toolArgs: readonly Record<string, unknown>[]) => {
      if (
        isCharacterDraftAddToWorldTurn({
          requestedSection: answeredSectionRef.current,
          toolArgs,
        })
      ) {
        return characterDraftFieldsSeq > 0 && characterDraftFieldsSeq <= characterDraftResolvedSeq
      }
      if (isBeatCreateToolArgs(toolArgs)) return beatAddsCommitted
      return areAddToWorldSectionsSettled({
        toolArgs,
        episodeId: currentEpisodeId,
        requestedSection: answeredSectionRef.current,
        settledSections,
      })
    },
    [
      beatAddsCommitted,
      characterDraftFieldsSeq,
      characterDraftResolvedSeq,
      currentEpisodeId,
      settledSections,
    ],
  )
  const canAddToWorld = useCallback(
    (input: CanAddToWorldInput) =>
      shouldShowAddToWorld({
        role: input.role,
        requestedSection: answeredSectionRef.current,
        toolNames: input.toolNames,
        toolArgs: input.toolArgs,
      }),
    [],
  )
  const handleAddToWorld = useCallback(
    async (payload: AddToWorldPayload): Promise<boolean> =>
      commitWritersRoomAddToWorld({
        payload,
        currentEpisodeId,
        answeredSection: answeredSectionRef.current,
        requestedPremiseField: requestedPremiseFieldRef.current,
        sectionPendingActions,
        rejectedSections: rejectedSectionsRef.current,
        lastPreview: lastBibleProposalRef.current?.preview,
        storyPlan: storyPlanRef.current,
        confirm,
        confirmNewCastMembers,
        executeAction,
        setActiveTab,
        closeBible,
        refreshBeats,
        setStoryPlan,
        setLoadingSections,
        setSectionPendingActions,
      }),
    [
      closeBible,
      confirm,
      confirmNewCastMembers,
      currentEpisodeId,
      executeAction,
      refreshBeats,
      sectionPendingActions,
      setActiveTab,
      setLoadingSections,
      setSectionPendingActions,
      setStoryPlan,
    ]
  )

  const handleCompletedToolCalls = useCallback(
    (calls: readonly AssistantCompletedToolCall[], userText?: string) => {
      for (const call of calls) {
        const draftFields = characterDraftFieldsFromToolCall(call)
        if (draftFields) {
          getStorytellerUiStore().notifyCharacterDraftFields(draftFields)
        }
      }
      const premiseField =
        requestedEpisodePremiseField(userText ?? '') ?? requestedPremiseFieldRef.current
      if (premiseField) requestedPremiseFieldRef.current = premiseField
      const skipBibleWrites =
        requestedSectionRef.current === CharacterDraftChatSection.Form ||
        calls.some(call => call.toolName === StorytellerChatTool.ProposeCharacterFields)
      void (async () => {
        if (skipBibleWrites) return
        for (const call of calls) {
          const created = parseCreatedEpisodeFromToolCall(call)
          if (created) {
            await queryClient.invalidateQueries({
              queryKey: storytellerKeys.episodes(projectId),
            })
            selectEpisode(created.episodeId)
            toast.success(
              `${WritersRoomToast.EpisodeCreated}: ${created.title}`
            )
          }

          const episodeId = created?.episodeId ?? currentEpisodeId
          const proposals = proposalsFromCompletedToolCall(
            call,
            episodeId,
            requestedSectionRef.current,
          ).map(proposal => narrowEpisodePremiseProposal(proposal, premiseField))

          proposals.forEach((proposal, index) => {
            applyBibleProposal(proposal, index === 0)
          })
          const extrasMessage = extraPendingSectionsMessage(proposals)
          if (extrasMessage) toast.message(extrasMessage)
        }
        const beatArgs = pendingBeatArgsFromToolCalls(calls)
        if (beatArgs.length > 0) {
          getStorytellerUiStore().appendPendingBeatAdds(beatArgs)
        }
      })()
    },
    [
      applyBibleProposal,
      currentEpisodeId,
      projectId,
      queryClient,
      selectEpisode,
    ]
  )
  const handleGenerationActivity = useCallback(
    (activity: AssistantGenerationActivity) => {
      const phase = mapAssistantPhase(activity.phase)
      if (phase === GenerationActivityPhase.Idle) {
        clearGenerationActivity()
        setLoadingSections({})
        return
      }
      if (phase === GenerationActivityPhase.Error) {
        setLoadingSections({})
      }
      setGenerationActivity({
        phase,
        label: activity.label,
        toolName: activity.toolName,
        preview: activity.preview,
        toolComplete: activity.toolComplete,
        error: activity.error,
        agentId: activity.agentId,
        section:
          pendingChatPrompt?.section ??
          requestedSectionRef.current ??
          useStorytellerUiStore.getState().generationActivity.section,
      })
    },
    [
      clearGenerationActivity,
      setGenerationActivity,
      setLoadingSections,
      pendingChatPrompt?.section,
    ]
  )
  return (
    <DomainSidebar header={null} position="right" storageKey="writers-room" defaultWidth={384} rawContent>
      <WritersRoomAssistantChat
        projectId={projectId}
        currentEpisodeId={currentEpisodeId}
        bibleSection={bibleSection}
        characters={characters}
        beats={beats}
        storyPlan={storyPlan}
        hasBible={hasBible}
        hasEpisodes={hasEpisodes}
        modelId={modelId}
        chatModelOptions={chatModelOptions}
        onChatModelChange={setModelId}
        pendingPrompt={pendingPrompt}
        onPendingPromptHandled={handlePendingPromptHandled}
        onStreamIdle={handleStreamIdle}
        onGenerationActivity={handleGenerationActivity}
        onCompletedToolCalls={handleCompletedToolCalls}
        onAddToWorld={handleAddToWorld}
        sectionLabelsFromToolArgs={sectionLabelsFromToolArgs}
        isAddToWorldSettled={isAddToWorldSettled}
        canAddToWorld={canAddToWorld}
      />
      {ConfirmDialogComponent}
    </DomainSidebar>
  )
}
