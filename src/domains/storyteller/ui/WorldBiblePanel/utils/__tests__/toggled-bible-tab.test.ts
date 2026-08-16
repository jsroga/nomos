import { describe, expect, it } from 'vitest'
import { StorytellerBibleTab } from '@/domains/storyteller/core/storyteller-page-wire'
import { isBibleRelationshipsTab, toggledBibleTab } from '../toggled-bible-tab'

describe('toggledBibleTab', () => {
  it('turns Relationships off back to Content', () => {
    expect(toggledBibleTab(StorytellerBibleTab.Relationships)).toBe(StorytellerBibleTab.Content)
  })

  it('turns Relationships on from Content', () => {
    expect(toggledBibleTab(StorytellerBibleTab.Content)).toBe(StorytellerBibleTab.Relationships)
  })
})

describe('isBibleRelationshipsTab', () => {
  it('is true only for the relationships tab', () => {
    expect(isBibleRelationshipsTab(StorytellerBibleTab.Relationships)).toBe(true)
    expect(isBibleRelationshipsTab(StorytellerBibleTab.Content)).toBe(false)
  })
})
