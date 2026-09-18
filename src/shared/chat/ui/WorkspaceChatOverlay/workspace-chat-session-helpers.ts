import { AssistantChatRuntimeStatus } from '@/shared/chat/core/constants/assistant-runtime-status'
import { ChatSessionStatus } from '@/shared/chat/core/constants/chat-session'
import { WorkspaceChatHistoryActionClass, WorkspaceChatRenameGlyph } from './workspace-chat-copy'

export function isWorkspaceChatRuntimeBusy(localStatus: string | undefined): boolean {
  return (
    localStatus === AssistantChatRuntimeStatus.Submitted ||
    localStatus === AssistantChatRuntimeStatus.Streaming
  )
}

export function isAnyWorkspaceChatRuntimeBusy(
  localRuntimeStatus: Readonly<Record<string, string>>,
): boolean {
  return Object.values(localRuntimeStatus).some(isWorkspaceChatRuntimeBusy)
}

export function isWorkspaceChatSessionBusy(
  sessionStatus: ChatSessionStatus,
  localStatus: string | undefined,
): boolean {
  return sessionStatus === ChatSessionStatus.Streaming || isWorkspaceChatRuntimeBusy(localStatus)
}

/** Keep the history menu mounted while a row is being renamed. */
export function shouldKeepHistoryMenuOpen(nextOpen: boolean, renameSessionId: string | null): boolean {
  return nextOpen || renameSessionId !== null
}

export function shouldFocusHistorySessionOnSelect(
  renaming: boolean,
  target: EventTarget | null,
): boolean {
  if (renaming) return false
  if (!(target instanceof Element)) return true
  return target.closest(`.${WorkspaceChatHistoryActionClass.Root}`) === null
}

export function workspaceChatRenameButtonTitle(
  glyph: WorkspaceChatRenameGlyph,
  saveLabel: string,
  renameLabel: string,
): string {
  return glyph === WorkspaceChatRenameGlyph.Save ? saveLabel : renameLabel
}
