/** WorldBiblePanel UI wire values. */

import {
  StorytellerBibleTab,
  StorytellerBibleUrlParam,
  StorytellerLogMessage,
} from '@/domains/storyteller/core/storyteller-page-wire'
import {
  MoodboardDefaultModelId,
  MoodboardModelStorageKey,
  MoodboardProvider,
  MoodboardStorageKey,
  moodboardGenOperationPrefix,
  moodboardPrimaryStorageKey,
} from '@/domains/storyteller/services/constants/moodboard-generation-service'

export {
  StorytellerBibleTab,
  StorytellerBibleUrlParam,
  StorytellerLogMessage,
  MoodboardProvider,
  MoodboardStorageKey,
  MoodboardModelStorageKey,
  MoodboardDefaultModelId,
  moodboardGenOperationPrefix,
  moodboardPrimaryStorageKey,
}

export enum WorldBiblePanelProviderModel {
  Midjourney = 'midjourney',
}

export enum WorldBiblePanelUiCopy {
  StorybibleTitle = 'Storybible',
  ContentTab = 'Content',
  RelationshipsTab = 'Relationships',
}
