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

export enum WorldBiblePanelUiCopy {
  StorybibleTitle = 'Storybible',
  ContentTab = 'Content',
  RelationshipsTab = 'Relationships',
}

export enum WorldBiblePanelLockButtonClass {
  Base = 'gap-2 h-8 border transition-colors',
  DisabledCursor = 'cursor-default opacity-70',
  Locked = 'border-amber-500/50 text-amber-500',
  Unlocked = 'border-muted-foreground/30 text-muted-foreground',
  LockedHover = 'hover:bg-amber-500/10 hover:border-amber-500',
  UnlockedHover = 'hover:bg-muted/50 hover:border-muted-foreground/50',
}
