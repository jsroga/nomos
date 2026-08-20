import { describe, expect, it } from 'vitest'
import { filterUpdatesForBibleSection, emptyBibleSectionError, SECTION_EMPTY_FIELD_HINT } from '../bible-section-allowlist'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import { CharacterDraftChatSection } from '@/domains/storyteller/core/storyteller-page-wire'
import { BibleToolError } from '@/domains/storyteller/ai/tools/bible-tools-update'

describe('filterUpdatesForBibleSection', () => {
  it('passes all fields when no section is set', () => {
    const updates = { inspirations: { books: [] }, moodSoundtrack: 'x' }
    expect(filterUpdatesForBibleSection(updates, undefined)).toEqual({
      updates,
      dropped: [],
    })
  })

  it('keeps off-section fields so sibling panels can pending-review them', () => {
    const updates = {
      inspirations: { books: [{ title: 'Dune', description: 'Sand.' }] },
      moodSoundtrack: 'jazz',
      plotTwists: [{ title: 'Nope', description: 'No.' }],
    }
    const { updates: kept, dropped } = filterUpdatesForBibleSection(
      updates,
      BibleSection.INSPIRATIONS
    )
    expect(kept).toEqual(updates)
    expect(dropped).toEqual(['moodSoundtrack', 'plotTwists'])
  })

  it('allows moodSoundtrack on soundtrack turns and still reports extras', () => {
    const { updates, dropped } = filterUpdatesForBibleSection(
      { moodSoundtrack: 'drone', worldDescription: 'overwrite me' },
      BibleSection.SOUNDTRACKS
    )
    expect(updates).toEqual({ moodSoundtrack: 'drone', worldDescription: 'overwrite me' })
    expect(dropped).toEqual(['worldDescription'])
  })

  it('allows episodePremise on premise turns and still reports extras', () => {
    const premise = { logline: 'A door opens.' }
    const { updates, dropped } = filterUpdatesForBibleSection(
      { episodePremise: premise, worldDescription: 'nope' },
      BibleSection.EPISODE_PREMISE
    )
    expect(updates).toEqual({ episodePremise: premise, worldDescription: 'nope' })
    expect(dropped).toEqual(['worldDescription'])
  })

  it('names the missing field when a generateable section is empty', () => {
    expect(emptyBibleSectionError(undefined)).toBe(BibleToolError.NoFields)
    expect(emptyBibleSectionError(BibleSection.FACTIONS)).toBe(
      SECTION_EMPTY_FIELD_HINT[BibleSection.FACTIONS],
    )
    expect(emptyBibleSectionError(BibleSection.EPISODE_ROADMAP)).toBe(
      SECTION_EMPTY_FIELD_HINT[BibleSection.EPISODE_ROADMAP],
    )
    expect(emptyBibleSectionError('unknownSection')).toContain('unknownSection')
  })

  it('drops every bible field on a character-draft turn', () => {
    const { updates, dropped } = filterUpdatesForBibleSection(
      { worldDescription: 'overwrite me', factions: [] },
      CharacterDraftChatSection.Form,
    )
    expect(updates).toEqual({})
    expect(dropped).toEqual(['worldDescription', 'factions'])
  })
})
