import { beforeEach, describe, expect, it } from 'vitest'
import { AppModuleId } from '@/shared/data/constants/protocol'
import { ChatSessionSendDecision } from '@/shared/chat/core/constants/chat-session'
import { useWorkspaceChatUiStore } from '@/shared/chat/state/workspace-chat-ui-store'
import { routeWorkspaceChatSend } from '@/shared/chat/state/route-workspace-chat-send'

const PROMPT = 'Generate the next beat.'
const SESSION_ID = '22222222-2222-4222-8222-222222222222'

describe('routeWorkspaceChatSend', () => {
  beforeEach(() => {
    useWorkspaceChatUiStore.setState({
      overlayOpen: false,
      focusedSessionId: null,
      focusedSessionModuleId: null,
      mismatchDialog: null,
      queuedSend: null,
    })
  })

  it('opens the overlay when there is no focused thread', () => {
    expect(
      routeWorkspaceChatSend({
        currentModuleId: AppModuleId.Storyteller,
        text: PROMPT,
      }),
    ).toBe(ChatSessionSendDecision.Ok)
    expect(useWorkspaceChatUiStore.getState().overlayOpen).toBe(true)
    expect(useWorkspaceChatUiStore.getState().mismatchDialog).toBeNull()
  })

  it('sends on the active Storyteller thread', () => {
    useWorkspaceChatUiStore.setState({
      focusedSessionId: SESSION_ID,
      focusedSessionModuleId: AppModuleId.Storyteller,
    })
    expect(
      routeWorkspaceChatSend({
        currentModuleId: AppModuleId.Storyteller,
        text: PROMPT,
      }),
    ).toBe(ChatSessionSendDecision.Ok)
    expect(useWorkspaceChatUiStore.getState().overlayOpen).toBe(true)
    expect(useWorkspaceChatUiStore.getState().mismatchDialog).toBeNull()
  })

  it('asks to start a new chat when the focused thread is another module', () => {
    useWorkspaceChatUiStore.setState({
      focusedSessionId: SESSION_ID,
      focusedSessionModuleId: AppModuleId.LoopCreator,
      overlayOpen: false,
    })
    expect(
      routeWorkspaceChatSend({
        currentModuleId: AppModuleId.Storyteller,
        text: PROMPT,
      }),
    ).toBe(ChatSessionSendDecision.ModuleMismatch)
    const ui = useWorkspaceChatUiStore.getState()
    expect(ui.overlayOpen).toBe(false)
    expect(ui.mismatchDialog).toEqual({
      decision: ChatSessionSendDecision.ModuleMismatch,
      bufferedText: PROMPT,
    })
  })
})
