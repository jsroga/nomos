/** Storyteller UI store — cross-panel navigation and generation signals (replaces window CustomEvents). */


export interface EntityNavigationPayload {
  refId: string
  entityName?: string
  entityType?: string
}

export interface MoodboardCompletePayload {
  projectId: string
  promptIndex?: number
  images: string[]
}

export enum StorytellerUiSignal {
  EntityNavigation = 'entityNavigation',
  BibleTabRequest = 'bibleTabRequest',
  MoodboardComplete = 'moodboardComplete',
  MoodboardPrimaryChanged = 'moodboardPrimaryChanged',
}
