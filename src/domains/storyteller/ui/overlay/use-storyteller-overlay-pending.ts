'use client'

import { useCallback, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { AppModuleId } from '@/shared/data/constants/protocol'
import { ChatSessionSendDecision } from '@/shared/chat/core/constants/chat-session'
import {
  canSendToSession,
  moduleHasAgent,
  parseWorkspaceModuleId,
} from '@/shared/chat/core/chat-session-policy'
import {
  overlayBridgePendingForSession,
  isDraftChatSession,
} from '@/shared/chat/core/overlay-session-runtime'
import { persistDraftWorkspaceChat } from '@/shared/chat/state/queue-new-workspace-chat'
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
  const queryClient = useQueryClient()
  const persistedDraftPromptId = useRef<number | null>(null)
  const bridge = useWritersRoomOverlayBridge(state => state.bridge)
  const queuedSend = useWorkspaceChatUiStore(state => state.queuedSend)
  const focusedSessionId = useWorkspaceChatUiStore(state => state.focusedSessionId)
  const draftSession = useWorkspaceChatUiStore(state => state.draftSession)
  const setQueuedSend = useWorkspaceChatUiStore(state => state.setQueuedSend)
  const setMismatchDialog = useWorkspaceChatUiStore(state => state.setMismatchDialog)
  const setOverlayOpen = useWorkspaceChatUiStore(state => state.setOverlayOpen)
  const pathname = usePathname()
  const currentModuleId = parseWorkspaceModuleId(pathname ?? '')
  const currentHasAgent = currentModuleId ? moduleHasAgent(currentModuleId) : false
  const sendDecision =
    currentModuleId === null
      ? ChatSessionSendDecision.ModuleHasNoAgent
      : canSendToSession(input.sessionModuleId, currentModuleId, currentHasAgent)
  const sessionOk = sendDecision === ChatSessionSendDecision.Ok
  const pendingFromBridge = overlayBridgePendingForSession({
    sessionId: input.sessionId,
    focusedSessionId,
    sessionOk,
    pending: bridge?.pendingPrompt ?? null,
  })
  const pendingFromQueue =
    sessionOk && queuedSend && queuedSend.sessionId === input.sessionId
      ? { id: queuedSend.id, text: queuedSend.text }
      : null
  const draftFocused =
    draftSession != null &&
    draftSession.id === input.sessionId &&
    isDraftChatSession(draftSession)

  useEffect(() => {
    if (bridge?.pendingPrompt && !sessionOk) {
      setMismatchDialog({
        decision: sendDecision,
        bufferedText: bridge.pendingPrompt.text,
      })
    }
  }, [bridge?.pendingPrompt, sessionOk, sendDecision, setMismatchDialog])

  useEffect(() => {
    if (pendingFromBridge) setOverlayOpen(true)
  }, [pendingFromBridge, setOverlayOpen])

  useEffect(() => {
    if (!pendingFromBridge || !draftFocused || !draftSession) return
    if (persistedDraftPromptId.current === pendingFromBridge.id) return
    persistedDraftPromptId.current = pendingFromBridge.id
    void persistDraftWorkspaceChat({
      draft: draftSession,
      text: pendingFromBridge.text,
      queryClient,
    })
    useWritersRoomOverlayBridge.getState().bridge?.onPendingPromptHandled()
  }, [draftFocused, draftSession, pendingFromBridge, queryClient])

  const onPendingPromptHandled = useCallback(() => {
    setQueuedSend(null)
    useWritersRoomOverlayBridge.getState().bridge?.onPendingPromptHandled()
  }, [setQueuedSend])

  return {
    pendingPrompt: draftFocused ? pendingFromQueue : pendingFromQueue ?? pendingFromBridge,
    onPendingPromptHandled,
  }
}
