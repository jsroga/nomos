'use client'

import { useMemo } from 'react'
import { AssistantChat } from '@/shared/chat/assistant/AssistantChat'
import type { AssistantPendingPrompt } from '@/shared/chat/assistant/AssistantChat'
import { AssistantChatBodyKey } from '@/shared/chat/core/constants/assistant-thread-ui'
import { AssistantChatRuntimeStatus } from '@/shared/chat/core/constants/assistant-runtime-status'
import {
  markChatSessionIdle,
  markChatSessionStreaming,
} from '@/shared/chat/core/io/chat-sessions.api'
import type { OverlaySessionHostProps } from '@/shared/chat/overlay/module-chat-adapters'
import type { ModuleChatAdapter } from '@/shared/chat/overlay/module-chat-adapters'
import { useWorkspaceChatUiStore } from '@/shared/chat/state/workspace-chat-ui-store'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'

export function WorkspaceChatSessionRuntime({
  hidden,
  projectId,
  adapter,
  ...host
}: OverlaySessionHostProps & { adapter: ModuleChatAdapter }) {
  const setLocalRuntimeStatus = useWorkspaceChatUiStore(state => state.setLocalRuntimeStatus)
  const queuedSend = useWorkspaceChatUiStore(state => state.queuedSend)
  const setQueuedSend = useWorkspaceChatUiStore(state => state.setQueuedSend)
  const SessionHost = adapter.SessionHost

  const onChatStatus = (status: string) => {
    setLocalRuntimeStatus(host.session.id, status)
    if (
      status === AssistantChatRuntimeStatus.Submitted ||
      status === AssistantChatRuntimeStatus.Streaming
    ) {
      void markChatSessionStreaming(host.session.id)
      return
    }
    if (status === AssistantChatRuntimeStatus.Ready || status === AssistantChatRuntimeStatus.Error) {
      void markChatSessionIdle(host.session.id)
    }
  }

  const onStopReady = (stop: () => void) => {
    host.stopHandlers.set(host.session.id, stop)
  }

  const pendingPrompt: AssistantPendingPrompt | null = useMemo(() => {
    if (!queuedSend || queuedSend.sessionId !== host.session.id) return null
    return { id: queuedSend.id, text: queuedSend.text }
  }, [queuedSend, host.session.id])

  const hostProps: OverlaySessionHostProps = {
    ...host,
    projectId,
    hidden,
    composerEnabled: host.composerEnabled && adapter.composerEnabled,
    onBeforeSend: host.onBeforeSend,
    onChatStatus,
    stopHandlers: host.stopHandlers,
  }

  if (SessionHost) {
    return <SessionHost {...hostProps} />
  }

  return (
    <div
      hidden={hidden}
      aria-hidden={hidden}
      className={hidden ? 'hidden h-full' : 'flex h-full min-h-0 flex-col'}
      id={!hidden ? TOUR_STEP_IDS.STORYTELLER_CHAT : undefined}
    >
      <AssistantChat
        chatId={host.session.id}
        overlaySessionId={host.session.id}
        agentId={adapter.agentId}
        moduleKey={adapter.moduleKey}
        composerEnabled={hostProps.composerEnabled}
        onBeforeSend={host.onBeforeSend}
        onChatStatus={onChatStatus}
        onStopReady={onStopReady}
        pendingPrompt={pendingPrompt}
        onPendingPromptHandled={() => setQueuedSend(null)}
        body={{
          [AssistantChatBodyKey.ProjectId]: projectId,
          [AssistantChatBodyKey.SessionId]: host.session.id,
        }}
      />
    </div>
  )
}
