'use client'

import { useMemo } from 'react'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { AssistantChat } from '@/shared/chat/assistant/AssistantChat'
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

export function WritersRoomAssistantChat({
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
}: WritersRoomAssistantChatProps) {
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

  return (
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
        onChatModelChange={onChatModelChange}
        pendingPrompt={pendingPrompt}
        onPendingPromptHandled={onPendingPromptHandled}
        onStreamIdle={onStreamIdle}
        onGenerationActivity={onGenerationActivity}
        onCompletedToolCalls={onCompletedToolCalls}
        onAddToWorld={onAddToWorld}
        sectionLabelsFromToolArgs={sectionLabelsFromToolArgs}
        isAddToWorldSettled={isAddToWorldSettled}
        canAddToWorld={canAddToWorld}
        chatRenderers={chatRenderers}
      />
    </div>
  )
}
