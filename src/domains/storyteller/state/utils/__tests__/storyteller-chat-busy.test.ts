import { describe, expect, it } from 'vitest'
import { GenerationActivityPhase } from '@/domains/storyteller/state/utils/storyteller-ui-store'
import { isStorytellerWorkspaceBusy } from '../storyteller-chat-busy'

describe('isStorytellerWorkspaceBusy', () => {
  it('is busy while overlay chat is waiting for the first token', () => {
    expect(
      isStorytellerWorkspaceBusy({
        generationPhase: GenerationActivityPhase.Idle,
        pendingChatPrompt: null,
        overlayBusy: true,
      }),
    ).toBe(true)
  })

  it('is idle when overlay and generation are quiet', () => {
    expect(
      isStorytellerWorkspaceBusy({
        generationPhase: GenerationActivityPhase.Idle,
        pendingChatPrompt: null,
        overlayBusy: false,
      }),
    ).toBe(false)
  })
})
