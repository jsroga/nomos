'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { DomainSidebar } from '@/components/DomainSidebar'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { AssistantChat } from '@/shared/chat/assistant/AssistantChat'
import type { AssistantGenerationActivity } from '@/shared/chat/assistant/derive-assistant-generation-activity'
import type { AssistantCompletedToolCall } from '@/shared/chat/assistant/extract-completed-assistant-tool-calls'
import { AssistantChatBodyKey } from '@/shared/chat/core/constants/assistant-thread-ui'
import { resolveWritersRoomSuggestions, writersRoomCharacterCount } from '@/domains/storyteller/config/resolve-writers-room-suggestions'
import {
  applyUpdatesToStoryPlan,
} from '@/domains/storyteller/config/action-config'
import { useStorytellerChatModel } from '@/domains/storyteller/state/hooks/useStorytellerChatModel'
import { useStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import { GenerationActivityPhase } from '@/domains/storyteller/state/constants/storyteller-ui-store'
import {
  proposeAssistantBibleUpdate,
  type ProposedBibleSectionUpdate,
} from '@/domains/storyteller/state/utils/propose-assistant-bible-update'
import { resolveAddToWorldTarget } from '@/domains/storyteller/state/utils/resolve-add-to-world-target'
import { parseCreatedEpisodeFromToolCall } from '@/domains/storyteller/state/utils/parse-created-episode-from-tool'
import { storytellerKeys } from '@/domains/storyteller/core/io/storyteller.keys'
import { getStorytellerMentionProviders } from '@/domains/storyteller/ui/MentionsProvider/providers'
import { buildStorytellerProjectContext } from '@/domains/storyteller/ui/MentionsProvider/build-storyteller-project-context'
import { getGameEntityProvider } from '@/shared/chat/core/mentions/game-entity-provider'
import {
  recordFromJson,
  recordArrayFromJson,
  stringArrayFromJson,
} from '@/shared/data/json-guards'
import type { StorytellerPageSlices } from '@/domains/storyteller/state/hooks/useStorytellerPage'
import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import {
  WritersRoomToast,
  WritersRoomConfirm,
  writersRoomExtraDescription,
} from '@/domains/storyteller/ui/StorytellerLayout/constants/writers-room-copy'
import {
  mapAssistantPhase,
  omitSectionKey,
  previewAlreadyInPlan,
  proposalsFromExtraFields,
} from '@/domains/storyteller/ui/StorytellerLayout/panels/writers-room-tool-helpers'

/**
 * Writers Room chat — on assistant-ui (roadmap B4). Streams the registered
 * `storyteller` chat-adapter agent, with `@`-mentions from the storyteller
 * providers and stage-aware quick-action suggestions.
 */
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
  /** Section behind the in-flight prompt — outlives pendingChatPrompt so this
   * turn's tool writes are confined to the panel that asked. Cleared at idle so
   * a later free-form message is never judged against a stale section. */
  const requestedSectionRef = useRef<string | undefined>(undefined)
  /** Same section, kept past idle for "Add to world" (guarded by content shape). */
  const answeredSectionRef = useRef<string | undefined>(undefined)
  const storyPlanRef = useRef(storyPlan)
  useEffect(() => {
    storyPlanRef.current = storyPlan
  }, [storyPlan])

  const mentionProviders = useMemo(
    () => [...getStorytellerMentionProviders(), getGameEntityProvider()],
    []
  )
  const mentionProjectContext = useMemo(() => {
    const plan = recordFromJson(storyPlan)
    return buildStorytellerProjectContext({
      projectId,
      characters,
      episodes: [],
      beats,
      seriesBible: {
        ...plan,
        worldRules: recordArrayFromJson(plan.worldRules),
        inspirations: recordFromJson(plan.inspirations),
        soundtracks: recordArrayFromJson(plan.soundtracks),
        plotTwists: stringArrayFromJson(plan.plotTwists),
        factions: recordArrayFromJson(plan.factions),
      },
    })
  }, [projectId, characters, beats, storyPlan])

  const suggestions = useMemo(
    () =>
      resolveWritersRoomSuggestions({
        hasBible,
        hasEpisodes,
        currentEpisodeId,
        characterCount: writersRoomCharacterCount(characters, storyPlan),
        storyPlan,
      }),
    [hasBible, hasEpisodes, currentEpisodeId, characters, storyPlan]
  )

  const chatBody = useMemo(() => {
    const body: Record<string, string> = {
      [AssistantChatBodyKey.ProjectId]: projectId,
    }
    if (currentEpisodeId) {
      body[AssistantChatBodyKey.EpisodeId] = currentEpisodeId
    }
    if (bibleSection) {
      body[AssistantChatBodyKey.BibleSection] = bibleSection
    }
    return body
  }, [projectId, currentEpisodeId, bibleSection])

  const pendingPrompt = useMemo(
    () =>
      pendingChatPrompt
        ? { id: pendingChatPrompt.id, text: pendingChatPrompt.message }
        : null,
    [pendingChatPrompt]
  )

  const handlePendingPromptHandled = useCallback(() => {
    requestedSectionRef.current = pendingChatPrompt?.section
    answeredSectionRef.current = pendingChatPrompt?.section
    clearPendingChatPrompt()
  }, [clearPendingChatPrompt, pendingChatPrompt?.section])

  const handleStreamIdle = useCallback(() => {
    requestedSectionRef.current = undefined
    setLoadingSections({})
    clearGenerationActivity()
  }, [setLoadingSections, clearGenerationActivity])

  // Capture the panel section as soon as the prompt is queued — not when
  // sendMessage finishes — so completed tool calls still know which panel asked.
  useEffect(() => {
    if (!pendingChatPrompt) return
    requestedSectionRef.current = pendingChatPrompt.section
    answeredSectionRef.current = pendingChatPrompt.section
  }, [pendingChatPrompt])

  const { confirm, ConfirmDialogComponent } = useConfirmDialog()

  const applyBibleProposal = useCallback(
    (proposal: ProposedBibleSectionUpdate): boolean => {
      if (proposedKeysRef.current.has(proposal.dedupeKey)) return false
      proposedKeysRef.current.add(proposal.dedupeKey)

      const previousSnapshot = recordFromJson(storyPlanRef.current)
      const previousFields: Record<string, unknown> = {}
      for (const key of Object.keys(proposal.preview)) {
        previousFields[key] = previousSnapshot[key]
      }

      setStoryPlan(prev => applyUpdatesToStoryPlan(prev, proposal.preview))
      setLoadingSections(prev => omitSectionKey(prev, proposal.section))

      setSectionPendingActions(prev => ({
        ...prev,
        [proposal.section]: {
          section: proposal.section,
          preview: proposal.preview,
          action: proposal.action,
          onAccept: () => {
            setSectionPendingActions(current => omitSectionKey(current, proposal.section))
            void executeAction({
              ...proposal.action,
              status: ApprovalActionStatus.COMMITTED,
            })
          },
          onReject: () => {
            setStoryPlan(prev => applyUpdatesToStoryPlan(prev, previousFields))
            setSectionPendingActions(current => omitSectionKey(current, proposal.section))
          },
        },
      }))
      return true
    },
    [executeAction, setLoadingSections, setSectionPendingActions, setStoryPlan]
  )

  const handleAddToWorld = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      const target = resolveAddToWorldTarget(trimmed, answeredSectionRef.current)

      // Pending Review Accept — reuse that handler, do not invent a second path.
      const pending = sectionPendingActions[target.section]
      if (pending) {
        pending.onAccept()
        toast.success(WritersRoomToast.AddedToWorld)
        return
      }

      const plan = recordFromJson(storyPlanRef.current)
      if (previewAlreadyInPlan(target.preview, plan)) {
        toast.info(WritersRoomToast.AlreadyInWorld)
        return
      }

      const dedupeKey = `add-to-world:${target.section}:${trimmed.slice(0, 120)}`
      if (proposedKeysRef.current.has(dedupeKey)) {
        toast.info(WritersRoomToast.AlreadyQueued)
        return
      }
      proposedKeysRef.current.add(dedupeKey)

      // Same body as Accept when there is no pending proposal yet.
      setStoryPlan(prev => applyUpdatesToStoryPlan(prev, target.preview))
      setLoadingSections(prev => omitSectionKey(prev, target.section))
      void executeAction({
        type: target.actionType,
        payload: target.preview,
        status: ApprovalActionStatus.COMMITTED,
        id: `add-to-world-${Date.now()}`,
      })
      toast.success(WritersRoomToast.AddedToWorld)
    },
    [
      executeAction,
      sectionPendingActions,
      setLoadingSections,
      setStoryPlan,
    ]
  )

  const handleCompletedToolCalls = useCallback(
    (calls: readonly AssistantCompletedToolCall[]) => {
      void (async () => {
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
            continue
          }

          const proposal = proposeAssistantBibleUpdate(
            call,
            currentEpisodeId,
            requestedSectionRef.current
          )
          if (!proposal) continue

          const extras = proposal.extraFields
          const extraKeys = extras ? Object.keys(extras) : []
          let includeExtras = false
          if (extras && extraKeys.length > 0) {
            includeExtras = await confirm({
              title: WritersRoomConfirm.ExtraTitle,
              description: writersRoomExtraDescription(proposal.section, extraKeys),
              confirmLabel: WritersRoomConfirm.ExtraConfirm,
              cancelLabel: WritersRoomConfirm.ExtraCancel,
            })
          }

          applyBibleProposal(proposal)
          if (includeExtras && extras) {
            for (const extra of proposalsFromExtraFields(extras, currentEpisodeId)) {
              applyBibleProposal(extra)
            }
          }
        }
      })()
    },
    [
      applyBibleProposal,
      confirm,
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
      <div className="flex h-full flex-col" id={TOUR_STEP_IDS.STORYTELLER_CHAT}>
        <AssistantChat
          key={projectId || 'pending'}
          agentId="storyteller"
          body={chatBody}
          suggestions={suggestions}
          mentionProviders={mentionProviders}
          mentionProjectContext={mentionProjectContext}
          persistKey={projectId ? `writers-room-${projectId}` : undefined}
          chatModelId={modelId}
          chatModelOptions={chatModelOptions}
          onChatModelChange={setModelId}
          pendingPrompt={pendingPrompt}
          onPendingPromptHandled={handlePendingPromptHandled}
          onStreamIdle={handleStreamIdle}
          onGenerationActivity={handleGenerationActivity}
          onCompletedToolCalls={handleCompletedToolCalls}
          onAddToWorld={handleAddToWorld}
        />
      </div>
      {ConfirmDialogComponent}
    </DomainSidebar>
  )
}
