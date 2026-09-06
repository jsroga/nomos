'use client'

import { useEffect, useMemo } from 'react'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { AssistantChat } from '@/shared/chat/assistant/AssistantChat'
import { BeatDraftVerdictToolUI } from '@/domains/storyteller/ui/QuestionCard/BeatDraftVerdictToolUI'
import { QueuedVerdictsList } from '@/domains/storyteller/ui/QueuedVerdicts/QueuedVerdictsList'
import type { AddToWorldPayload, CanAddToWorldInput } from '@/shared/chat/assistant/AssistantAddToWorldContext'
import type { AssistantGenerationActivity } from '@/shared/chat/assistant/derive-assistant-generation-activity'
import type { AssistantCompletedToolCall } from '@/shared/chat/assistant/extract-completed-assistant-tool-calls'
import type { AssistantPendingPrompt } from '@/shared/chat/assistant/AssistantChat'
import type { AssistantChatModelOption } from '@/shared/chat/core/constants/assistant-thread-ui'
import type { StorytellerPageSlices } from '@/domains/storyteller/state/hooks/useStorytellerPage'
import {
  resolveWritersRoomSuggestions,
  writersRoomBibleSignalsFrom,
  writersRoomCharacterCount,
} from '@/domains/storyteller/config/resolve-writers-room-suggestions'
import { getStorytellerMentionProviders } from '@/domains/storyteller/ui/MentionsProvider/providers'
import { createStorytellerChatRenderers } from '@/domains/storyteller/ui/MentionsProvider/storyteller-chat-renderers'
import { getGameEntityProvider } from '@/shared/chat/core/mentions/game-entity-provider'
import {
  writersRoomChatBody,
  writersRoomProjectContext,
} from '@/domains/storyteller/ui/StorytellerLayout/panels/writers-room-tool-helpers'
import { AppModuleId } from '@/shared/data/constants/protocol'
import { useWritersRoomOverlayBridge } from '@/domains/storyteller/ui/overlay/writers-room-overlay-bridge'
import type { WritersRoomOverlayBridge } from '@/domains/storyteller/ui/overlay/writers-room-overlay-bridge'

interface WritersRoomAssistantChatProps {
  projectId: string
  currentEpisodeId?: string | null
  bibleSection?: string
  characters: StorytellerPageSlices['core']['characters']
  beats: StorytellerPageSlices['core']['beats']
  storyPlan: StorytellerPageSlices['core']['storyPlan']
  hasBible: boolean
  hasEpisodes: boolean
  modelId?: string
  chatModelOptions?: readonly AssistantChatModelOption[]
  onChatModelChange?: (modelId: string) => void
  pendingPrompt: AssistantPendingPrompt | null
  onPendingPromptHandled: () => void
  onStreamIdle: () => void
  onGenerationActivity: (activity: AssistantGenerationActivity) => void
  onCompletedToolCalls: (
    calls: readonly AssistantCompletedToolCall[],
    userText?: string,
  ) => void
  onAddToWorld: (payload: AddToWorldPayload) => boolean | Promise<boolean>
  sectionLabelsFromToolArgs: (toolArgs: readonly Record<string, unknown>[]) => string[]
  isAddToWorldSettled: (toolArgs: readonly Record<string, unknown>[]) => boolean
  canAddToWorld: (input: CanAddToWorldInput) => boolean
}

export function useWritersRoomAssistantBindings(
  props: WritersRoomAssistantChatProps,
): WritersRoomOverlayBridge {
  const {
    projectId,
    currentEpisodeId,
    bibleSection,
    characters,
    beats,
    storyPlan,
    hasBible,
    hasEpisodes,
    modelId,
    chatModelOptions,
    onChatModelChange,
    pendingPrompt,
    onPendingPromptHandled,
    onStreamIdle,
    onGenerationActivity,
    onCompletedToolCalls,
    onAddToWorld,
    sectionLabelsFromToolArgs,
    isAddToWorldSettled,
    canAddToWorld,
  } = props
  const mentionProviders = useMemo(
    () => [...getStorytellerMentionProviders(), getGameEntityProvider()],
    [],
  )
  const mentionProjectContext = useMemo(
    () => writersRoomProjectContext({ projectId, characters, beats, storyPlan }),
    [projectId, characters, beats, storyPlan],
  )
  const bibleSignals = useMemo(() => writersRoomBibleSignalsFrom(storyPlan), [storyPlan])
  const suggestions = useMemo(
    () =>
      resolveWritersRoomSuggestions({
        hasBible,
        hasEpisodes,
        currentEpisodeId,
        characterCount: writersRoomCharacterCount(characters, bibleSignals),
        storyPlan: bibleSignals,
      }),
    [hasBible, hasEpisodes, currentEpisodeId, characters, bibleSignals],
  )
  const chatBody = useMemo(
    () => writersRoomChatBody({ projectId, episodeId: currentEpisodeId, bibleSection }),
    [projectId, currentEpisodeId, bibleSection],
  )
  const chatRenderers = useMemo(
    () => createStorytellerChatRenderers(projectId || undefined),
    [projectId],
  )
  return {
    body: chatBody,
    suggestions,
    mentionProviders,
    mentionProjectContext,
    modelId,
    chatModelOptions,
    onChatModelChange,
    pendingPrompt,
    onPendingPromptHandled,
    onStreamIdle,
    onGenerationActivity,
    onCompletedToolCalls,
    onAddToWorld,
    sectionLabelsFromToolArgs,
    isAddToWorldSettled,
    canAddToWorld,
    chatRenderers,
    extraToolUIs: <BeatDraftVerdictToolUI />,
  }
}

export function WritersRoomOverlayBridgePublisher(props: WritersRoomAssistantChatProps) {
  const bindings = useWritersRoomAssistantBindings(props)
  useEffect(() => {
    useWritersRoomOverlayBridge.getState().setBridge(bindings)
    return () => useWritersRoomOverlayBridge.getState().setBridge(null)
  }, [bindings])
  return null
}

export function WritersRoomAssistantChat(props: WritersRoomAssistantChatProps) {
  const bindings = useWritersRoomAssistantBindings(props)
  return (
    <div className="flex h-full flex-col" id={TOUR_STEP_IDS.STORYTELLER_CHAT}>
      {props.projectId ? <QueuedVerdictsList projectId={props.projectId} /> : null}
      <AssistantChat
        key={props.projectId || 'pending'}
        agentId={AppModuleId.Storyteller}
        body={bindings.body}
        suggestions={bindings.suggestions}
        mentionProviders={bindings.mentionProviders}
        mentionProjectContext={bindings.mentionProjectContext}
        persistKey={props.projectId ? `writers-room-${props.projectId}` : undefined}
        chatModelId={bindings.modelId}
        chatModelOptions={bindings.chatModelOptions}
        onChatModelChange={bindings.onChatModelChange}
        pendingPrompt={bindings.pendingPrompt}
        onPendingPromptHandled={bindings.onPendingPromptHandled}
        onStreamIdle={bindings.onStreamIdle}
        onGenerationActivity={bindings.onGenerationActivity}
        onCompletedToolCalls={bindings.onCompletedToolCalls}
        onAddToWorld={bindings.onAddToWorld}
        sectionLabelsFromToolArgs={bindings.sectionLabelsFromToolArgs}
        isAddToWorldSettled={bindings.isAddToWorldSettled}
        canAddToWorld={bindings.canAddToWorld}
        chatRenderers={bindings.chatRenderers}
        extraToolUIs={bindings.extraToolUIs}
      />
    </div>
  )
}
