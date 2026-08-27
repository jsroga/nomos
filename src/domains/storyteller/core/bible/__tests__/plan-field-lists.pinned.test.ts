/**
 * Pins the four parallel plan-field lists as literal wire values.
 *
 * SPEC-11 derives them from one SECTION_REGISTRY. Every derivation must leave
 * the *contents* identical, or it has silently changed what the UI renders.
 * Written as inline literals rather than snapshots: a snapshot file updates
 * itself under `-u` and would prove nothing.
 *
 * Compared as sorted sets, not sequences. All three consumers of these lists
 * use them for membership, pick and omit — `bible-populated-fields.ts` never
 * reads a position — so ordering carries no meaning and pinning it would fail
 * a correct derivation for a cosmetic reason.
 */
import { describe, expect, it } from 'vitest'
import { BIBLE_OWNED_PLAN_FIELDS } from '@/domains/storyteller/core/utils/bible-populated-fields'
import { STORY_PLAN_MERGE_FIELDS } from '@/domains/storyteller/config/constants/bible-wire-fields'
import { HYDRATION_PLAN_FIELDS as HYDRATION_FROM_STATE } from '@/domains/storyteller/state/constants/hydration'
import { HYDRATION_PLAN_FIELDS as HYDRATION_FROM_MERGE } from '@/domains/storyteller/state/constants/merge-episode-plan'
import {
  bibleOwnedPlanFields,
  hydrationPlanFields,
} from '@/domains/storyteller/core/bible/section-registry'

const BIBLE_OWNED_PINNED = [
  'soundtracks',
  'inspirations',
  'moodSoundtrack',
  'worldDescription',
  'worldRules',
  'factions',
  'plotTwists',
  'items',
  'events',
  'cast',
  'episodeRoadmap',
  'moodboard',
  'moodImages',
  'genre',
  'tone',
  'centralTheme',
  'masterPrompt',
  'sequences',
  'seasonStructure',
  'executiveSummary',
]

const HYDRATION_PINNED = [
  'soundtracks',
  'worldRules',
  'factions',
  'keyCharacters',
  'plotTwists',
  'inspirations',
  'worldDescription',
  'genre',
  'tone',
  'sequences',
  'seasonStructure',
  'centralTheme',
  'masterPrompt',
  'moodImages',
  'executiveSummary',
  'episodeRoadmap',
]

const STORY_PLAN_MERGE_PINNED = [
  'soundtracks',
  'worldRules',
  'factions',
  'cast',
  'plotTwists',
  'inspirations',
  'worldDescription',
  'genre',
  'tone',
  'sequences',
  'seasonStructure',
  'executiveSummary',
  'moodImages',
  'moodboard',
  'masterPrompt',
  'centralTheme',
  'episodeRoadmap',
  'items',
  'events',
  'storyboardUrl',
  'storyboardPrompt',
]

describe('plan field lists, pinned before SPEC-11 derives them', () => {
  it('BIBLE_OWNED_PLAN_FIELDS is unchanged', () => {
    expect([...BIBLE_OWNED_PLAN_FIELDS].sort()).toEqual([...BIBLE_OWNED_PINNED].sort())
  })

  it('the registry derives exactly BIBLE_OWNED_PLAN_FIELDS', () => {
    expect(bibleOwnedPlanFields().sort()).toEqual([...BIBLE_OWNED_PINNED].sort())
  })

  it('the registry derives exactly the hydration list', () => {
    expect(hydrationPlanFields().sort()).toEqual([...HYDRATION_PINNED].sort())
  })

  it('STORY_PLAN_MERGE_FIELDS is unchanged', () => {
    expect([...STORY_PLAN_MERGE_FIELDS].sort()).toEqual([...STORY_PLAN_MERGE_PINNED].sort())
  })

  it('the hydration list reached from state/constants/hydration is unchanged', () => {
    expect([...HYDRATION_FROM_STATE].sort()).toEqual([...HYDRATION_PINNED].sort())
  })

  it('the hydration list reached from merge-episode-plan is unchanged', () => {
    expect([...HYDRATION_FROM_MERGE].sort()).toEqual([...HYDRATION_PINNED].sort())
  })

  /**
   * The drift this spec was written for: two copies of one list, read by two
   * different hydration paths, differing by executiveSummary and
   * episodeRoadmap. Task 6 makes them one array; until then, this is the guard.
   */
  it('both hydration paths read the same fields', () => {
    expect([...HYDRATION_FROM_MERGE].sort()).toEqual([...HYDRATION_FROM_STATE].sort())
  })
})
