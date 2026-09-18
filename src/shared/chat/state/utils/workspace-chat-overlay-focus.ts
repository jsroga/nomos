import { browserStorage } from '@/shared/data/browser-storage'
import { LocalStorageKeys } from '@/shared/data/utils/localStorage'

export function readWorkspaceChatFocusedSessionId(): string | null {
  const raw = browserStorage.getString(LocalStorageKeys.WORKSPACE_CHAT_FOCUSED_SESSION)
  if (raw == null || raw.length === 0) return null
  return raw
}

export function persistWorkspaceChatFocusedSessionId(id: string | null): void {
  if (id == null || id.length === 0) {
    browserStorage.remove(LocalStorageKeys.WORKSPACE_CHAT_FOCUSED_SESSION)
    return
  }
  browserStorage.setString(LocalStorageKeys.WORKSPACE_CHAT_FOCUSED_SESSION, id)
}
