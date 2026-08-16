import { StorytellerBibleTab } from '@/domains/storyteller/core/storyteller-page-wire'

export function toggledBibleTab(tab: StorytellerBibleTab): StorytellerBibleTab {
  return tab === StorytellerBibleTab.Relationships
    ? StorytellerBibleTab.Content
    : StorytellerBibleTab.Relationships
}

export function isBibleRelationshipsTab(tab: StorytellerBibleTab): boolean {
  return tab === StorytellerBibleTab.Relationships
}
