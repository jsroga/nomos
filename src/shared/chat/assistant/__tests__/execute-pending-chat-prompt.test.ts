import { describe, expect, it, vi } from 'vitest'
import { executePendingChatPromptSend } from '../use-assistant-pending-prompt'

describe('executePendingChatPromptSend', () => {
  it('calls sendMessage before clearing the pending prompt', async () => {
    const order: string[] = []
    const stuckTimer: { current: ReturnType<typeof setTimeout> | null } = { current: null }
    const turnStartedAt: { current: number | null } = { current: null }
    const loggedFirstVisible = { current: false }

    await executePendingChatPromptSend({
      promptId: 1,
      promptText: 'Regenerate soundtracks',
      resolvedAgentId: 'storyteller',
      statusRef: { current: 'ready' },
      sendMessage: async () => {
        order.push('send')
      },
      stop: () => undefined,
      onPendingPromptHandled: () => {
        order.push('handled')
      },
      clearStuckTimer: () => undefined,
      finishGeneration: () => undefined,
      stuckTimer,
      turnStartedAt,
      loggedFirstVisible,
    })

    expect(order).toEqual(['send', 'handled'])
  })

  it('does not stop or send while a turn is busy', async () => {
    const stop = vi.fn().mockResolvedValue(undefined)
    const sendMessage = vi.fn().mockResolvedValue(undefined)
    const onPendingPromptHandled = vi.fn()
    const stuckTimer: { current: ReturnType<typeof setTimeout> | null } = { current: null }
    const turnStartedAt: { current: number | null } = { current: null }
    const loggedFirstVisible = { current: false }

    await executePendingChatPromptSend({
      promptId: 2,
      promptText: 'Regenerate soundtracks',
      resolvedAgentId: 'storyteller',
      statusRef: { current: 'streaming' },
      sendMessage,
      stop,
      onPendingPromptHandled,
      clearStuckTimer: () => undefined,
      finishGeneration: () => undefined,
      stuckTimer,
      turnStartedAt,
      loggedFirstVisible,
    })

    expect(stop).not.toHaveBeenCalled()
    expect(sendMessage).not.toHaveBeenCalled()
    expect(onPendingPromptHandled).toHaveBeenCalledWith(2)
  })
})
