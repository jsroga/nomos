import { beforeEach, describe, expect, it } from 'vitest'
import { AppModuleId } from '@/shared/data/constants/protocol'
import { ChatSessionSendDecision } from '@/shared/chat/core/constants/chat-session'
import { getStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import { useWorkspaceChatUiStore } from '@/shared/chat/state/workspace-chat-ui-store'
import { enqueueStorytellerChatPrompt } from '../enqueue-storyteller-chat'

const PROMPT = 'Generate the next beat.'
const SESSION_ID = '22222222-2222-4222-8222-222222222222'

describe('enqueueStorytellerChatPrompt', () => {
  beforeEach(() => {
    getStorytellerUiStore().clearPendingChatPrompt()
    getStorytellerUiStore().resetConsistencyFixRun()
    useWorkspaceChatUiStore.setState({
      overlayOpen: false,
      focusedSessionId: null,
      focusedSessionModuleId: null,
      mismatchDialog: null,
    })
  })

  it('queues the prompt on a Storyteller thread', () => {
    useWorkspaceChatUiStore.setState({
      focusedSessionId: SESSION_ID,
      focusedSessionModuleId: AppModuleId.Storyteller,
    })
    expect(enqueueStorytellerChatPrompt(PROMPT)).toBe(true)
    expect(getStorytellerUiStore().pendingChatPrompt?.message).toBe(PROMPT)
    expect(useWorkspaceChatUiStore.getState().overlayOpen).toBe(true)
  })

  it('does not queue when the focused thread is another module', () => {
    useWorkspaceChatUiStore.setState({
      focusedSessionId: SESSION_ID,
      focusedSessionModuleId: AppModuleId.LoopCreator,
    })
    expect(enqueueStorytellerChatPrompt(PROMPT)).toBe(false)
    expect(getStorytellerUiStore().pendingChatPrompt).toBeNull()
    expect(useWorkspaceChatUiStore.getState().mismatchDialog?.decision).toBe(
      ChatSessionSendDecision.ModuleMismatch,
    )
  })
})
