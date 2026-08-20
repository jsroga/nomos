import '@/shared/data/server-guard'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import { CharacterDraftChatSection } from '@/domains/storyteller/core/storyteller-page-wire'
import { BibleToolError } from '@/domains/storyteller/ai/tools/bible-tools-update'

/** When a bible panel refresh started the turn, off-section fields are still
 * returned so sibling panels can show pending review. `dropped` is informational. */
export const SECTION_UPDATE_ALLOWLIST: Record<string, readonly string[]> = {
  [BibleSection.WORLD_DESCRIPTION]: ['worldDescription'],
  [BibleSection.INSPIRATIONS]: ['inspirations'],
  [BibleSection.SOUNDTRACKS]: ['soundtracks', 'moodSoundtrack'],
  [BibleSection.ITEMS]: ['items'],
  [BibleSection.EVENTS]: ['events'],
  [BibleSection.FACTIONS]: ['factions'],
  [BibleSection.WORLD_RULES]: ['worldRules'],
  [BibleSection.PLOT_TWISTS]: ['plotTwists'],
  [BibleSection.EPISODE_PREMISE]: ['episodePremise'],
  [BibleSection.EPISODE_ROADMAP]: ['episodeRoadmap'],
}

export const SECTION_EMPTY_FIELD_HINT: Record<string, string> = {
  [BibleSection.WORLD_DESCRIPTION]: 'pass worldDescription: "..."',
  [BibleSection.ITEMS]: 'pass items: [{ name, description }]',
  [BibleSection.EVENTS]: 'pass events: [{ name, description }]',
  [BibleSection.FACTIONS]: 'pass factions: [{ name, description }]',
  [BibleSection.WORLD_RULES]: 'pass worldRules: [{ rule, consequence }]',
  [BibleSection.PLOT_TWISTS]: 'pass plotTwists: [{ title, description }]',
  [BibleSection.SOUNDTRACKS]: 'pass soundtracks: [{ title, artist, youtubeUrl }]',
  [BibleSection.INSPIRATIONS]: 'pass inspirations: { books, movies, games }',
  [BibleSection.EPISODE_ROADMAP]: 'pass episodeRoadmap: {...}',
  [BibleSection.EPISODE_PREMISE]: 'pass episodePremise: { logline }',
}

export function emptyBibleSectionError(bibleSection: string | undefined): string {
  if (!bibleSection) return BibleToolError.NoFields
  const hint = SECTION_EMPTY_FIELD_HINT[bibleSection]
  if (hint) return hint
  return `${BibleToolError.NoFieldsForSectionPrefix}${bibleSection}${BibleToolError.NoFieldsForSectionSuffix}`
}

export function filterUpdatesForBibleSection(
  updates: Record<string, unknown>,
  bibleSection: string | undefined
): { updates: Record<string, unknown>; dropped: string[] } {
  if (!bibleSection) return { updates, dropped: [] }
  if (bibleSection === CharacterDraftChatSection.Form) {
    return { updates: {}, dropped: Object.keys(updates) }
  }
  const allow = SECTION_UPDATE_ALLOWLIST[bibleSection]
  if (!allow) return { updates, dropped: [] }
  const dropped: string[] = []
  for (const key of Object.keys(updates)) {
    if (!allow.includes(key)) dropped.push(key)
  }
  return { updates, dropped }
}
