'use client'

import { AssistantChat } from '@/shared/chat/assistant/AssistantChat'
import { AssistantChatBodyKey } from '@/shared/chat/core/constants/assistant-thread-ui'
import { AppModuleId } from '@/shared/data/constants/protocol'
import type { OverlaySessionHostProps } from '@/shared/chat/overlay/module-chat-adapters'
import type { ModuleChatAdapter } from '@/shared/chat/overlay/module-chat-adapters'
import { useWorkspaceChatUiStore } from '@/shared/chat/state/workspace-chat-ui-store'
import {
  canSendToSession,
  moduleHasAgent,
  parseWorkspaceModuleId,
} from '@/shared/chat/core/chat-session-policy'
import { ChatSessionSendDecision } from '@/shared/chat/core/constants/chat-session'
import { usePathname } from 'next/navigation'

function LoopCreatorOverlaySession(props: OverlaySessionHostProps) {
  const queuedSend = useWorkspaceChatUiStore(state => state.queuedSend)
  const setQueuedSend = useWorkspaceChatUiStore(state => state.setQueuedSend)
  const pathname = usePathname()
  const currentModuleId = parseWorkspaceModuleId(pathname ?? '')
  const currentHasAgent = currentModuleId ? moduleHasAgent(currentModuleId) : false
  const sessionOk =
    currentModuleId !== null &&
    canSendToSession(props.session.moduleId, currentModuleId, currentHasAgent) ===
      ChatSessionSendDecision.Ok
  const pendingPrompt =
    sessionOk && queuedSend && queuedSend.sessionId === props.session.id
      ? { id: queuedSend.id, text: queuedSend.text }
      : null

  return (
    <div
      hidden={props.hidden}
      aria-hidden={props.hidden}
      className={props.hidden ? 'hidden h-full' : 'flex h-full min-h-0 flex-col'}
    >
      <AssistantChat
        chatId={props.session.id}
        overlaySessionId={props.session.id}
        moduleKey={AppModuleId.LoopCreator}
        composerEnabled={props.composerEnabled}
        onBeforeSend={props.onBeforeSend}
        onChatStatus={props.onChatStatus}
        onStopReady={stop => props.stopHandlers.set(props.session.id, stop)}
        pendingPrompt={pendingPrompt}
        onPendingPromptHandled={() => setQueuedSend(null)}
        body={{
          [AssistantChatBodyKey.ProjectId]: props.projectId,
          [AssistantChatBodyKey.SessionId]: props.session.id,
        }}
      />
    </div>
  )
}

export function getLoopCreatorChatAdapter(): ModuleChatAdapter {
  return {
    composerEnabled: true,
    moduleKey: AppModuleId.LoopCreator,
    SessionHost: LoopCreatorOverlaySession,
  }
}
