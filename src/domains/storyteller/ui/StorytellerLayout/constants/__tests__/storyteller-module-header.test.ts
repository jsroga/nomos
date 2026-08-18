import { describe, expect, it } from 'vitest'
import {
  StorytellerHeaderCopy,
  StorytellerHeaderSlotId,
} from '../storyteller-module-header'

describe('storyteller module header slots', () => {
  it('keeps distinct bible and episode chrome hosts', () => {
    expect(StorytellerHeaderSlotId.BibleChrome).not.toBe(StorytellerHeaderSlotId.EpisodeChrome)
    expect(StorytellerHeaderCopy.EditingEpisode).not.toBe(StorytellerHeaderCopy.EditingBible)
    expect(StorytellerHeaderCopy.Episodes).not.toBe(StorytellerHeaderCopy.Storybible)
  })
})
