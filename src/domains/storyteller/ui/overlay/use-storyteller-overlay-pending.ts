'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { AppModuleId } from '@/shared/data/constants/protocol'
import { ChatSessionSendDecision } from '@/shared/chat/core/constants/chat-session'
import {
  canSendToSession,
  moduleHasAgent,
  parseWorkspaceModuleId,
} from '@/shared/chat/core/chat-session-policy'
import { useWorkspaceChatUiStore } from '@/shared/chat/state/workspace-chat-ui-store'
import { useWritersRoomOverlayBridge } from '@/domains/storyteller/ui/overlay/writers-room-overlay-bridge'
import type { AssistantPendingPrompt } from '@/shared/chat/assistant/AssistantChat'

export function useStorytellerOverlayPending(input: {
  sessionId: string
  sessionModuleId: AppModuleId
}): {
  pendingPrompt: AssistantPendingPrompt | null
  onPendingPromptHandled: () => void
} {
  const bridge = useWritersRoomOverlayBridge(state => state.bridge)
  const queuedSend = useWorkspaceChatUiStore(state => state.queuedSend)
  const setQueuedSend = useWorkspaceChatUiStore(state => state.setQueuedSend)
  const setMismatchDialog = useWorkspaceChatUiStore(state => state.setMismatchDialog)
  const pathname = usePathname()
  const currentModuleId = parseWorkspaceModuleId(pathname ?? '')
  const currentHasAgent = currentModuleId ? moduleHasAgent(currentModuleId) : false
  const sendDecision =
    currentModuleId === null
      ? ChatSessionSendDecision.ModuleHasNoAgent
      : canSendToSession(input.sessionModuleId, currentModuleId, currentHasAgent)
  const sessionOk = sendDecision === ChatSessionSendDecision.Ok
  const pendingFromBridge = sessionOk ? bridge?.pendingPrompt ?? null : null
  const pendingFromQueue =
    sessionOk && queuedSend && queuedSend.sessionId === input.sessionId
      ? { id: queuedSend.id, text: queuedSend.text }
      : null

  useEffect(() => {
    if (bridge?.pendingPrompt && !sessionOk) {
      setMismatchDialog({
        decision: sendDecision,
        bufferedText: bridge.pendingPrompt.text,
      })
    }
  }, [bridge?.pendingPrompt, sessionOk, sendDecision, setMismatchDialog])

  return {
    pendingPrompt: pendingFromQueue ?? pendingFromBridge,
    onPendingPromptHandled: () => {
      setQueuedSend(null)
      bridge?.onPendingPromptHandled()
    },
  }
}
