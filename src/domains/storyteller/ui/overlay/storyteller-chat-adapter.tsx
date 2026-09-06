'use client'

import { AssistantChat } from '@/shared/chat/assistant/AssistantChat'
import { AssistantChatBodyKey } from '@/shared/chat/core/constants/assistant-thread-ui'
import { AppModuleId } from '@/shared/data/constants/protocol'
import type { OverlaySessionHostProps } from '@/shared/chat/overlay/module-chat-adapters'
import type { ModuleChatAdapter } from '@/shared/chat/overlay/module-chat-adapters'
import { useWritersRoomOverlayBridge } from '@/domains/storyteller/ui/overlay/writers-room-overlay-bridge'
import { useStorytellerOverlayPending } from '@/domains/storyteller/ui/overlay/use-storyteller-overlay-pending'
import { QueuedVerdictsList } from '@/domains/storyteller/ui/QueuedVerdicts/QueuedVerdictsList'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'

function StorytellerOverlaySession(props: OverlaySessionHostProps) {
  const bridge = useWritersRoomOverlayBridge(state => state.bridge)
  const pending = useStorytellerOverlayPending({
    sessionId: props.session.id,
    sessionModuleId: props.session.moduleId,
  })

  return (
    <div
      hidden={props.hidden}
      aria-hidden={props.hidden}
      className={props.hidden ? 'hidden h-full' : 'flex h-full min-h-0 flex-col'}
      id={!props.hidden ? TOUR_STEP_IDS.STORYTELLER_CHAT : undefined}
    >
      {props.projectId ? <QueuedVerdictsList projectId={props.projectId} /> : null}
      <AssistantChat
        chatId={props.session.id}
        overlaySessionId={props.session.id}
        agentId={AppModuleId.Storyteller}
        composerEnabled={props.composerEnabled}
        onBeforeSend={props.onBeforeSend}
        onChatStatus={props.onChatStatus}
        onStopReady={stop => props.stopHandlers.set(props.session.id, stop)}
        body={{
          ...(bridge?.body ?? {}),
          [AssistantChatBodyKey.ProjectId]: props.projectId,
          [AssistantChatBodyKey.SessionId]: props.session.id,
        }}
        suggestions={bridge?.suggestions}
        mentionProviders={bridge?.mentionProviders}
        mentionProjectContext={bridge?.mentionProjectContext}
        chatModelId={bridge?.modelId}
        chatModelOptions={bridge?.chatModelOptions}
        onChatModelChange={bridge?.onChatModelChange}
        pendingPrompt={pending.pendingPrompt}
        onPendingPromptHandled={pending.onPendingPromptHandled}
        onStreamIdle={bridge?.onStreamIdle}
        onGenerationActivity={bridge?.onGenerationActivity}
        onCompletedToolCalls={bridge?.onCompletedToolCalls}
        onAddToWorld={bridge?.onAddToWorld}
        sectionLabelsFromToolArgs={bridge?.sectionLabelsFromToolArgs}
        isAddToWorldSettled={bridge?.isAddToWorldSettled}
        canAddToWorld={bridge?.canAddToWorld}
        chatRenderers={bridge?.chatRenderers}
        extraToolUIs={bridge?.extraToolUIs}
      />
    </div>
  )
}

export function getStorytellerChatAdapter(): ModuleChatAdapter {
  return {
    composerEnabled: true,
    agentId: AppModuleId.Storyteller,
    SessionHost: StorytellerOverlaySession,
  }
}
