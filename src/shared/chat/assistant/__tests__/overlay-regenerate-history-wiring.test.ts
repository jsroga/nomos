import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const PENDING_SRC = 'src/domains/storyteller/ui/overlay/use-storyteller-overlay-pending.ts'
const MESSAGES_SRC = 'src/shared/chat/assistant/AssistantThreadMessages.tsx'
const CHAT_SRC = 'src/shared/chat/assistant/AssistantChat.tsx'
const OVERLAY_SRC = 'src/shared/chat/ui/WorkspaceChatOverlay/WorkspaceChatOverlay.tsx'

describe('overlay regenerate and history wiring', () => {
  it('opens the overlay when a bible refresh queues a pending prompt', () => {
    const src = readFileSync(PENDING_SRC, 'utf8')
    expect(src).toContain('setOverlayOpen(true)')
    expect(src).toContain('pendingFromBridge')
  })

  it('regenerates through chat.regenerate instead of a no-op ActionBar Reload', () => {
    const messages = readFileSync(MESSAGES_SRC, 'utf8')
    const chat = readFileSync(CHAT_SRC, 'utf8')
    expect(messages).toContain('useAssistantChatActions')
    expect(messages).toContain('ReloadButton')
    expect(messages).not.toContain('ActionBarPrimitive.Reload')
    expect(chat).toContain('regenerateAssistantTurn')
    expect(chat).toContain('chat.regenerate')
    expect(chat).toContain('useOverlayChatHydration')
    expect(chat).toContain('syncBusyTurnActivityFromMessages')
  })

  it('shows thinking dots while the last row is still the user turn', () => {
    const thread = readFileSync('src/shared/chat/assistant/AssistantThread.tsx', 'utf8')
    expect(thread).toContain('ThreadRunningPlaceholder')
  })

  it('keeps wait dots until a tool or text part is actually renderable', () => {
    const messages = readFileSync(MESSAGES_SRC, 'utf8')
    expect(messages).toContain('createHasRenderableAssistantContentSelector')
    expect(messages).toContain('isLast && isRunning && !hasRenderable')
  })

  it('auto-focuses a session so past chats and refresh have a mounted runtime', () => {
    const src = readFileSync(OVERLAY_SRC, 'utf8')
    expect(src).toContain('selectFocusedSessionId')
    expect(src).toContain('setFocusedSessionId(next, nextModule)')
    expect(src).toContain('queueNewWorkspaceChat')
  })
})
