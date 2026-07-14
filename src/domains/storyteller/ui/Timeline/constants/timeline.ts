import { BeatCardType } from '@/domains/storyteller/ui/BeatCard/constants/beat-card'

export enum TimelineStorageKey {
  Collapsed = 'storyteller-timeline-collapsed',
}

export enum TimelineStorageValue {
  True = 'true',
}

export const TIMELINE_FETCH_SNAPSHOTS_FAILED_LOG = 'Failed to fetch snapshots:'

export const TIMELINE_BEAT_COLORS: Record<string, string> = {
  [BeatCardType.Setup]: 'bg-blue-500',
  [BeatCardType.Complication]: 'bg-orange-500',
  [BeatCardType.Revelation]: 'bg-purple-500',
  [BeatCardType.Decision]: 'bg-yellow-500',
  [BeatCardType.Consequence]: 'bg-red-500',
  default: 'bg-muted-foreground',
}
