import { AppModuleId } from '@/shared/data/constants/protocol'
import { ChatSessionSendDecision } from '@/shared/chat/core/constants/chat-session'
import { routeWorkspaceChatSend } from '@/shared/chat/state/route-workspace-chat-send'
import { getStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'

/** Queue a Storyteller generate prompt on the active overlay thread, or ask to start a new chat. */
export function enqueueStorytellerChatPrompt(message: string, section?: string): boolean {
  const decision = routeWorkspaceChatSend({
    currentModuleId: AppModuleId.Storyteller,
    text: message,
  })
  if (decision !== ChatSessionSendDecision.Ok) return false
  const seqBefore = getStorytellerUiStore().pendingChatPromptSeq
  getStorytellerUiStore().requestChatPrompt(message, section)
  return getStorytellerUiStore().pendingChatPromptSeq !== seqBefore
}
