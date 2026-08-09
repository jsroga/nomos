import '@/shared/data/server-guard'
import { BibleSection } from '@/domains/storyteller/core/types/enums'

/** When a bible panel refresh started the turn, only those fields may be written. */
export const SECTION_UPDATE_ALLOWLIST: Record<string, readonly string[]> = {
  [BibleSection.WORLD_DESCRIPTION]: ['worldDescription'],
  [BibleSection.INSPIRATIONS]: ['inspirations'],
  [BibleSection.SOUNDTRACKS]: ['soundtracks', 'moodSoundtrack'],
  [BibleSection.ITEMS]: ['items'],
  [BibleSection.EVENTS]: ['events'],
  [BibleSection.FACTIONS]: ['factions'],
  [BibleSection.WORLD_RULES]: ['worldRules'],
  [BibleSection.PLOT_TWISTS]: ['plotTwists'],
}

export function filterUpdatesForBibleSection(
  updates: Record<string, unknown>,
  bibleSection: string | undefined
): { updates: Record<string, unknown>; dropped: string[] } {
  if (!bibleSection) return { updates, dropped: [] }
  const allow = SECTION_UPDATE_ALLOWLIST[bibleSection]
  if (!allow) return { updates, dropped: [] }
  const next: Record<string, unknown> = {}
  const dropped: string[] = []
  for (const key of Object.keys(updates)) {
    if (allow.includes(key)) {
      next[key] = updates[key]
    } else {
      dropped.push(key)
    }
  }
  return { updates: next, dropped }
}
