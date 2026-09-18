import { beforeEach, describe, expect, it } from 'vitest'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import { getStorytellerUiStore } from '../useStorytellerUiStore'

describe('resetForProjectSwitch', () => {
  beforeEach(() => {
    getStorytellerUiStore().resetForProjectSwitch()
  })

  it('clears episode-dialog seq, moodboard, and pending generate', () => {
    getStorytellerUiStore().requestCreateEpisodeDialog()
    getStorytellerUiStore().requestCreateEpisodeDialog()
    getStorytellerUiStore().notifyMoodboardComplete({
      projectId: '11111111-1111-4111-8111-111111111111',
      images: ['https://example.com/a.png'],
    })
    getStorytellerUiStore().requestChatPrompt('Regenerate soundtracks', BibleSection.SOUNDTRACKS)

    expect(getStorytellerUiStore().createEpisodeDialogRequestSeq).toBeGreaterThan(0)
    expect(getStorytellerUiStore().moodboardComplete).not.toBeNull()
    expect(getStorytellerUiStore().pendingChatPrompt).not.toBeNull()

    getStorytellerUiStore().resetForProjectSwitch()

    const after = getStorytellerUiStore()
    expect(after.createEpisodeDialogRequestSeq).toBe(0)
    expect(after.moodboardComplete).toBeNull()
    expect(after.pendingChatPrompt).toBeNull()
    expect(after.isWorldBibleOpen).toBe(true)
  })
})
