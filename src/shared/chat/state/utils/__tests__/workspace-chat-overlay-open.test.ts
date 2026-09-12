// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import { LocalStorageKeys } from '@/shared/data/utils/localStorage'
import { browserStorage } from '@/shared/data/browser-storage'
import { WorkspaceChatOverlayStored } from '@/shared/chat/state/constants/workspace-chat-ui'
import {
  persistWorkspaceChatOverlayOpen,
  readWorkspaceChatOverlayOpen,
  storedWorkspaceChatOverlayOpen,
  workspaceChatOverlayOpenFromStorage,
} from '../workspace-chat-overlay-open'
import { useWorkspaceChatUiStore } from '../../workspace-chat-ui-store'

describe('workspaceChatOverlayOpenFromStorage', () => {
  it('defaults to open when nothing is stored', () => {
    expect(workspaceChatOverlayOpenFromStorage(null)).toBe(true)
  })

  it('treats any value other than closed as open', () => {
    expect(workspaceChatOverlayOpenFromStorage(WorkspaceChatOverlayStored.Open)).toBe(true)
    expect(workspaceChatOverlayOpenFromStorage(WorkspaceChatOverlayStored.Closed)).toBe(false)
  })
})

describe('workspace chat overlay localStorage', () => {
  beforeEach(() => {
    browserStorage.remove(LocalStorageKeys.WORKSPACE_CHAT_OVERLAY_OPEN)
    useWorkspaceChatUiStore.setState({ overlayOpen: true })
  })

  it('returns null when the overlay key has never been written', () => {
    expect(readWorkspaceChatOverlayOpen()).toBe(true)
    expect(storedWorkspaceChatOverlayOpen()).toBeNull()
  })

  it('persists closed and open', () => {
    persistWorkspaceChatOverlayOpen(false)
    expect(readWorkspaceChatOverlayOpen()).toBe(false)
    persistWorkspaceChatOverlayOpen(true)
    expect(readWorkspaceChatOverlayOpen()).toBe(true)
  })

  it('writes the stored flag when the overlay is toggled or set', () => {
    useWorkspaceChatUiStore.getState().toggleOverlay()
    expect(useWorkspaceChatUiStore.getState().overlayOpen).toBe(false)
    expect(readWorkspaceChatOverlayOpen()).toBe(false)
    useWorkspaceChatUiStore.getState().setOverlayOpen(true)
    expect(useWorkspaceChatUiStore.getState().overlayOpen).toBe(true)
    expect(readWorkspaceChatOverlayOpen()).toBe(true)
  })
})
