import { AssistantChatRuntimeStatus } from '@/shared/chat/core/constants/assistant-runtime-status'
import { ChatSessionStatus } from '@/shared/chat/core/constants/chat-session'
import { WorkspaceChatRenameGlyph } from './workspace-chat-copy'

export function isWorkspaceChatSessionBusy(
  sessionStatus: ChatSessionStatus,
  localStatus: string | undefined,
): boolean {
  return (
    sessionStatus === ChatSessionStatus.Streaming ||
    localStatus === AssistantChatRuntimeStatus.Submitted ||
    localStatus === AssistantChatRuntimeStatus.Streaming
  )
}

/** Keep the history menu mounted while a row is being renamed. */
export function shouldKeepHistoryMenuOpen(nextOpen: boolean, renameSessionId: string | null): boolean {
  return nextOpen || renameSessionId !== null
}

export function workspaceChatRenameButtonTitle(
  glyph: WorkspaceChatRenameGlyph,
  saveLabel: string,
  renameLabel: string,
): string {
  return glyph === WorkspaceChatRenameGlyph.Save ? saveLabel : renameLabel
}
