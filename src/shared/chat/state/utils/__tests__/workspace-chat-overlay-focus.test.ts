// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import { LocalStorageKeys } from '@/shared/data/utils/localStorage'
import { browserStorage } from '@/shared/data/browser-storage'
import {
  persistWorkspaceChatFocusedSessionId,
  readWorkspaceChatFocusedSessionId,
} from '../workspace-chat-overlay-focus'
import { useWorkspaceChatUiStore } from '../../workspace-chat-ui-store'
import { AppModuleId } from '@/shared/data/constants/protocol'

const SESSION_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_ID = '22222222-2222-4222-8222-222222222222'

describe('workspace chat focused session localStorage', () => {
  beforeEach(() => {
    browserStorage.remove(LocalStorageKeys.WORKSPACE_CHAT_FOCUSED_SESSION)
    useWorkspaceChatUiStore.setState({
      focusedSessionId: null,
      previousFocusedSessionId: null,
      focusedSessionModuleId: null,
    })
  })

  it('returns null when nothing is stored', () => {
    expect(readWorkspaceChatFocusedSessionId()).toBeNull()
  })

  it('persists and clears the focused session id', () => {
    persistWorkspaceChatFocusedSessionId(SESSION_ID)
    expect(readWorkspaceChatFocusedSessionId()).toBe(SESSION_ID)
    persistWorkspaceChatFocusedSessionId(null)
    expect(readWorkspaceChatFocusedSessionId()).toBeNull()
  })

  it('writes focus and previous focus when the store changes sessions', () => {
    useWorkspaceChatUiStore.getState().setFocusedSessionId(SESSION_ID, AppModuleId.Storyteller)
    expect(readWorkspaceChatFocusedSessionId()).toBe(SESSION_ID)
    useWorkspaceChatUiStore.getState().setFocusedSessionId(OTHER_ID, AppModuleId.Storyteller)
    const state = useWorkspaceChatUiStore.getState()
    expect(state.focusedSessionId).toBe(OTHER_ID)
    expect(state.previousFocusedSessionId).toBe(SESSION_ID)
    expect(readWorkspaceChatFocusedSessionId()).toBe(OTHER_ID)
  })
})
