import { browserStorage } from '@/shared/data/browser-storage'
import { LocalStorageKeys } from '@/shared/data/utils/localStorage'
import { WorkspaceChatOverlayStored } from '@/shared/chat/state/constants/workspace-chat-ui'

export function workspaceChatOverlayOpenFromStorage(raw: string | null): boolean {
  return raw !== WorkspaceChatOverlayStored.Closed
}

export function readWorkspaceChatOverlayOpen(): boolean {
  return workspaceChatOverlayOpenFromStorage(
    browserStorage.getString(LocalStorageKeys.WORKSPACE_CHAT_OVERLAY_OPEN),
  )
}

export function persistWorkspaceChatOverlayOpen(open: boolean): void {
  browserStorage.setString(
    LocalStorageKeys.WORKSPACE_CHAT_OVERLAY_OPEN,
    open ? WorkspaceChatOverlayStored.Open : WorkspaceChatOverlayStored.Closed,
  )
}

/** `null` when the user has never toggled; callers keep the in-memory default. */
export function storedWorkspaceChatOverlayOpen(): boolean | null {
  const raw = browserStorage.getString(LocalStorageKeys.WORKSPACE_CHAT_OVERLAY_OPEN)
  if (raw === null) return null
  return workspaceChatOverlayOpenFromStorage(raw)
}
