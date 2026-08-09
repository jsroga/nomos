/**
 * Decide which bible panel "Add to world" should target from chat prose.
 * Structured extracts always win; Overview only when that panel asked and
 * no soundtrack/inspirations shape is present.
 */

import { ActionType, BibleSection } from '@/domains/storyteller/core/types/enums'
import { extractSoundtrackTracks } from '@/domains/storyteller/core/utils/extract-soundtrack-tracks'
import {
  extractInspirations,
  hasExtractedInspirations,
} from '@/domains/storyteller/core/utils/extract-inspirations'

export interface AddToWorldTarget {
  section: string
  actionType: ActionType
  preview: Record<string, unknown>
}

export function resolveAddToWorldTarget(
  text: string,
  requestedSection: string | undefined,
): AddToWorldTarget | null {
  const soundtracks = extractSoundtrackTracks(text)
  if (soundtracks.length > 0) {
    return {
      section: BibleSection.SOUNDTRACKS,
      actionType: ActionType.UPDATE_SOUNDTRACKS,
      preview: { soundtracks },
    }
  }

  const inspirations = extractInspirations(text)
  if (hasExtractedInspirations(inspirations)) {
    return {
      section: BibleSection.INSPIRATIONS,
      actionType: ActionType.UPDATE_INSPIRATIONS,
      preview: { inspirations },
    }
  }

  if (requestedSection === BibleSection.SOUNDTRACKS) return null
  if (requestedSection === BibleSection.INSPIRATIONS) return null

  if (requestedSection === BibleSection.WORLD_DESCRIPTION) {
    return {
      section: BibleSection.WORLD_DESCRIPTION,
      actionType: ActionType.UPDATE_WORLD_DESCRIPTION,
      preview: { worldDescription: text },
    }
  }

  return null
}
