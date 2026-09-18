import { describe, expect, it } from 'vitest'
import { StorytellerRefreshCopy, storytellerRegenerateLabel } from '../storyteller-refresh-copy'

describe('StorytellerRefreshCopy', () => {
  it('names the busy tooltip once', () => {
    expect(StorytellerRefreshCopy.Busy).toBe('Can\'t regenerate while something is generating')
    expect(storytellerRegenerateLabel('Hook')).toBe(
      `${StorytellerRefreshCopy.RegeneratePrefix}Hook`,
    )
  })
})
