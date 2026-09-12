import { AppModuleId } from '@/shared/data/constants/protocol'
import { ChatSessionSendDecision } from '@/shared/chat/core/constants/chat-session'
import { canSendToSession, moduleHasAgent } from '@/shared/chat/core/chat-session-policy'
import { useWorkspaceChatUiStore } from '@/shared/chat/state/workspace-chat-ui-store'

/** Decide whether a page generate-click may post into the focused overlay thread. */
export function routeWorkspaceChatSend(input: {
  currentModuleId: AppModuleId
  text: string
}): ChatSessionSendDecision {
  const store = useWorkspaceChatUiStore.getState()
  const focusedId = store.focusedSessionId
  const focusedModuleId = store.focusedSessionModuleId
  const currentHasAgent = moduleHasAgent(input.currentModuleId)

  if (!focusedId || focusedModuleId === null) {
    store.setOverlayOpen(true)
    return ChatSessionSendDecision.Ok
  }

  const decision = canSendToSession(focusedModuleId, input.currentModuleId, currentHasAgent)
  if (decision === ChatSessionSendDecision.Ok) {
    store.setOverlayOpen(true)
    return decision
  }

  store.setMismatchDialog({ decision, bufferedText: input.text })
  return decision
}
