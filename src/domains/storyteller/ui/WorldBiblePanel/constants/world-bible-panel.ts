/** WorldBiblePanel UI wire values. */

import {
  StorytellerBibleTab,
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
  StorytellerLogMessage,
  MoodboardProvider,
  MoodboardStorageKey,
  MoodboardModelStorageKey,
  MoodboardDefaultModelId,
  moodboardGenOperationPrefix,
  moodboardPrimaryStorageKey,
}

import { ImageGenProvider } from '@/shared/ai/constants/image-providers'

export const WorldBiblePanelProviderModel = {
  Midjourney: ImageGenProvider.Midjourney,
} as const

export type WorldBiblePanelProviderModel =
  (typeof WorldBiblePanelProviderModel)[keyof typeof WorldBiblePanelProviderModel]

export enum WorldBiblePanelLazyRootMargin {
  Prefetch = '240px 0px',
}

export enum WorldBiblePanelLazyPlaceholder {
  MinHeightPx = 160,
}

export enum WorldBiblePanelBodyClass {
  Content = 'flex-1 min-h-0 overflow-y-auto px-5 pt-5 pb-8',
  Relationships = 'flex-1 min-h-0 overflow-hidden px-5 pt-5 pb-5',
}

export enum WorldBiblePanelUiCopy {
  StorybibleTitle = 'Storybible',
  ContentTab = 'Content',
  RelationshipsTab = 'Relationships',
}
