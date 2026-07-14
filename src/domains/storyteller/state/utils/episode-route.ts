import type { MouseEvent as ReactMouseEvent } from 'react'
import { customEventDetailRecord, readString } from '@/shared/data/json-guards'

function domEventFromInput(event: Event | ReactMouseEvent): Event {
  if (event instanceof Event) {
    return event
  }
  return event.nativeEvent
}

export function resolveEpisodeId(
  eventOrEpisodeId: Event | ReactMouseEvent | string | undefined,
  fallback?: string | null
): string | undefined {
  if (typeof eventOrEpisodeId === 'string') return eventOrEpisodeId
  if (eventOrEpisodeId) {
    return readString(customEventDetailRecord(domEventFromInput(eventOrEpisodeId)).episodeId)
  }
  return fallback ?? undefined
}

export function projectIdFromRoute(
  currentId: string | undefined,
  projectIdParam: unknown
): string | undefined {
  return currentId || readString(projectIdParam) || undefined
}

export function projectHasStoredPlan(
  project:
    | {
        series_bible?: Record<string, unknown>
        story_plan?: Record<string, unknown>
      }
    | null
    | undefined
): { hasSeriesBible: boolean; hasStoryPlan: boolean } {
  return {
    hasSeriesBible: Object.keys(project?.series_bible ?? {}).length > 0,
    hasStoryPlan: Object.keys(project?.story_plan ?? {}).length > 0,
  }
}
