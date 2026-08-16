/**
 * Decide which bible panel "Add to world" should target from chat prose.
 * Structured extracts win; otherwise commit Overview — same action Accept uses
 * for worldDescription — so the button never silently no-ops.
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

function overviewTarget(text: string): AddToWorldTarget {
  return {
    section: BibleSection.WORLD_DESCRIPTION,
    actionType: ActionType.UPDATE_WORLD_DESCRIPTION,
    preview: { worldDescription: text },
  }
}

export function resolveAddToWorldTarget(
  text: string,
  requestedSection: string | undefined,
): AddToWorldTarget {
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

  if (requestedSection === BibleSection.SOUNDTRACKS) {
    return {
      section: BibleSection.SOUNDTRACKS,
      actionType: ActionType.UPDATE_SOUNDTRACKS,
      preview: { moodSoundtrack: text },
    }
  }

  if (requestedSection === BibleSection.INSPIRATIONS) {
    return overviewTarget(text)
  }

  if (requestedSection === BibleSection.WORLD_DESCRIPTION) {
    return overviewTarget(text)
  }

  return overviewTarget(text)
}

export function resolveAddToWorldCommitTarget(
  descriptionFromPending: string | undefined,
  cleanedChat: string,
  requestedSection: string | undefined,
): AddToWorldTarget | null {
  if (descriptionFromPending) return overviewTarget(descriptionFromPending)
  if (!cleanedChat) return null
  return resolveAddToWorldTarget(cleanedChat, requestedSection)
}

function episodePremiseTarget(premise: Record<string, unknown>): AddToWorldTarget {
  return {
    section: BibleSection.EPISODE_PREMISE,
    actionType: ActionType.UPDATE_EPISODE_PREMISE,
    preview: { premise },
  }
}

export function resolveAddToWorldCommit(input: {
  episodePremise?: Record<string, unknown>
  overviewProse?: string
  cleanedChat: string
  requestedSection?: string
}): AddToWorldTarget | null {
  if (input.episodePremise && Object.keys(input.episodePremise).length > 0) {
    return episodePremiseTarget(input.episodePremise)
  }
  if (input.requestedSection === BibleSection.EPISODE_PREMISE) return null
  return resolveAddToWorldCommitTarget(
    input.overviewProse,
    input.cleanedChat,
    input.requestedSection,
  )
}
