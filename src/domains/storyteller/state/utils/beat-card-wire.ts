import { recordFromJson, readNumber, readString } from '@/shared/data/json-guards'
import type { BeatCard } from '@/domains/storyteller/core/types/story-types'
import {
  StorytellerBeatStatus,
  StorytellerBeatTypeDefault,
  StorytellerDefaultTitle,
} from '@/domains/storyteller/core/storyteller-page-wire'

export function beatStatusFromWire(value: string | undefined): NonNullable<BeatCard['status']> {
  if (value === StorytellerBeatStatus.Approved) return StorytellerBeatStatus.Approved
  if (value === StorytellerBeatStatus.Rejected) return StorytellerBeatStatus.Rejected
  return StorytellerBeatStatus.Proposed
}

export function beatCardFromWireRow(value: unknown): BeatCard | null {
  const row = recordFromJson(value)
  const id = readString(row.id)
  if (!id) return null

  return {
    id,
    sequence: readNumber(row.sequence) ?? 0,
    logline:
      readString(row.logline) ??
      readString(row.log_line) ??
      StorytellerDefaultTitle.UntitledBeat,
    beatType:
      readString(row.beat_type) ??
      readString(row.beatType) ??
      StorytellerBeatTypeDefault.Default,
    status: beatStatusFromWire(readString(row.status)),
    content: readString(row.content) ?? undefined,
    imagePrompt:
      readString(row.image_prompt) ?? readString(row.imagePrompt) ?? undefined,
    imageUrl: readString(row.image_url) ?? readString(row.imageUrl) ?? undefined,
  }
}
