import { describe, expect, it, vi } from 'vitest'
import { AssistantChatStreamStatus } from '../assistant-turn-phase'
import { canRegenerateAssistantTurn, regenerateAssistantTurn } from '../regenerate-assistant-turn'

describe('regenerateAssistantTurn', () => {
  it('stops a busy turn then regenerates the last assistant reply', async () => {
    const order: string[] = []
    await regenerateAssistantTurn({
      isBusy: true,
      stop: async () => {
        order.push('stop')
      },
      regenerate: async () => {
        order.push('regen')
      },
    })
    expect(order).toEqual(['stop', 'regen'])
  })

  it('regenerates without stop when the thread is idle', async () => {
    const stop = vi.fn()
    const regenerate = vi.fn().mockResolvedValue(undefined)
    await regenerateAssistantTurn({
      isBusy: false,
      stop,
      regenerate,
    })
    expect(stop).not.toHaveBeenCalled()
    expect(regenerate).toHaveBeenCalledTimes(1)
  })
})

describe('canRegenerateAssistantTurn', () => {
  it('is blocked only while submitted or streaming', () => {
    expect(canRegenerateAssistantTurn(AssistantChatStreamStatus.Ready)).toBe(true)
    expect(canRegenerateAssistantTurn(AssistantChatStreamStatus.Submitted)).toBe(false)
    expect(canRegenerateAssistantTurn(AssistantChatStreamStatus.Streaming)).toBe(false)
  })
})
