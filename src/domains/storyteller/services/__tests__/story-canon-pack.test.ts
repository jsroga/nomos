import { describe, expect, it } from 'vitest'
import { BeatboardPremiseFieldKey } from '@/domains/storyteller/core/constants/beatboard-premise-validation'
import { RoadmapSlotCopy } from '@/domains/storyteller/core/utils/roadmap-slot'
import {
  StoryCanonPackLabel,
  StoryCanonPackLimit,
  StoryCanonPsychologyField,
} from '@/domains/storyteller/services/constants/story-canon-pack'
import {
  composePosterPrompt,
  formatCanonEpisodeLock,
  formatCanonForTextFill,
  formatCanonVisualLock,
  hasUsableCanonPack,
} from '@/domains/storyteller/services/story-canon-pack-format'
import {
  assembleOpenEpisodeCanon,
  assembleStoryCanonPack,
  type StoryCanonPackSources,
} from '@/domains/storyteller/services/story-canon-pack'

const PROJECT_ID = '11111111-1111-1111-1111-111111111111'
const EPISODE_ONE = '22222222-2222-2222-2222-222222222222'
const EPISODE_TWO = '33333333-3333-3333-3333-333333333333'
const TABLE_GENRE = 'Noir'
const PROJECT_GENRE = 'Comedy'
const LEDGER_TITLE = 'The Ledger'
const LEDGER_LOGLINE = 'Vera hides a name.'
const BELLS_TITLE = 'The Bells'
const WRONG_TITLE = 'Wrong Slot'
const WORLD = 'A frozen ward holds the last ledger.'
const TEN_POINT_MARKER = 'She stamps a blank year that never existed.'
const CAST_NAME = 'Vera'
const CAST_ROLE = 'Protagonist'
const CAST_DESC = 'Keeps the civic clocks honest.'
const CAST_MOTIVE = 'Protect the ledger.'

function sources(overrides: Partial<StoryCanonPackSources> = {}): StoryCanonPackSources {
  return {
    projectName: 'Ward',
    seriesBible: {},
    storyPlanContent: {},
    projectStoryPlan: {},
    episodes: [],
    characters: [],
    ...overrides,
  }
}

describe('assembleStoryCanonPack', () => {
  it('prefers story_plans.content over projects.storyPlan', () => {
    const pack = assembleStoryCanonPack(
      PROJECT_ID,
      sources({
        storyPlanContent: {
          genre: TABLE_GENRE,
          worldDescription: WORLD,
          episodeRoadmap: {
            episodes: [{ title: LEDGER_TITLE, logline: LEDGER_LOGLINE }],
          },
        },
        projectStoryPlan: {
          genre: PROJECT_GENRE,
          episodeRoadmap: {
            episodes: [{ title: WRONG_TITLE, logline: 'Nope.' }],
          },
        },
      })
    )

    expect(pack.genre).toBe(TABLE_GENRE)
    expect(pack.roadmap[0]?.title).toBe(LEDGER_TITLE)
    expect(pack.roadmap[0]?.title).not.toBe(WRONG_TITLE)
  })

  it('falls back to projects.storyPlan when the table row is empty', () => {
    const pack = assembleStoryCanonPack(
      PROJECT_ID,
      sources({
        projectStoryPlan: {
          genre: PROJECT_GENRE,
          episodeRoadmap: {
            episodes: [{ title: LEDGER_TITLE, logline: LEDGER_LOGLINE }],
          },
        },
      })
    )

    expect(pack.genre).toBe(PROJECT_GENRE)
    expect(pack.roadmap[0]?.title).toBe(LEDGER_TITLE)
  })

  it('takes genre from the story plan before series bible', () => {
    const pack = assembleStoryCanonPack(
      PROJECT_ID,
      sources({
        seriesBible: { genre: PROJECT_GENRE, worldDescription: WORLD },
        storyPlanContent: { genre: TABLE_GENRE },
      })
    )

    expect(pack.genre).toBe(TABLE_GENRE)
    expect(pack.worldDescription).toBe(WORLD)
  })

  it('indexes episodes by sequence and clips cast motivation from psychology', () => {
    const pack = assembleStoryCanonPack(
      PROJECT_ID,
      sources({
        episodes: [
          {
            id: EPISODE_TWO,
            sequence: 2,
            title: BELLS_TITLE,
            premise: 'The wardens arrive.',
            storyPlan: {},
            tenPointsPlan: [],
            thematicFocus: 'Hubris',
          },
          {
            id: EPISODE_ONE,
            sequence: 1,
            title: LEDGER_TITLE,
            premise: LEDGER_LOGLINE,
            storyPlan: {},
            tenPointsPlan: [],
            thematicFocus: null,
          },
        ],
        characters: [
          {
            name: CAST_NAME,
            role: CAST_ROLE,
            description: CAST_DESC,
            psychology: { [StoryCanonPsychologyField.ActualMotivation]: CAST_MOTIVE },
          },
        ],
      })
    )

    expect(pack.episodeIndex.map(row => row.sequence)).toEqual([1, 2])
    expect(pack.episodeIndex[0]?.logline).toBe(LEDGER_LOGLINE)
    expect(pack.cast[0]?.motivation).toBe(CAST_MOTIVE)
  })
})

describe('assembleOpenEpisodeCanon', () => {
  it('binds slot N to episode.sequence and prefers nested episode premise', () => {
    const pack = assembleStoryCanonPack(
      PROJECT_ID,
      sources({
        storyPlanContent: {
          episodeRoadmap: {
            episodes: [
              { title: LEDGER_TITLE, logline: LEDGER_LOGLINE },
              { title: BELLS_TITLE, logline: 'The wardens arrive.' },
            ],
          },
        },
      })
    )
    const canon = assembleOpenEpisodeCanon(pack, {
      id: EPISODE_TWO,
      sequence: 2,
      title: BELLS_TITLE,
      premise: 'Column logline should lose.',
      storyPlan: {
        premise: {
          [BeatboardPremiseFieldKey.Logline]: 'The bells ring at dusk.',
          [BeatboardPremiseFieldKey.ProtagonistHook]: 'Vera opens the clinic.',
          [BeatboardPremiseFieldKey.TenPointsPlan]: [TEN_POINT_MARKER],
        },
      },
      tenPointsPlan: [],
      thematicFocus: 'Hubris',
    })

    expect(canon.slot?.title).toBe(BELLS_TITLE)
    expect(canon.premise[BeatboardPremiseFieldKey.Logline]).toBe('The bells ring at dusk.')
    expect(canon.thematicFocus).toBe('Hubris')
  })

  it('fills logline from the episode column when the nested plan is empty', () => {
    const pack = assembleStoryCanonPack(PROJECT_ID, sources())
    const canon = assembleOpenEpisodeCanon(pack, {
      id: EPISODE_ONE,
      sequence: 1,
      title: LEDGER_TITLE,
      premise: LEDGER_LOGLINE,
      storyPlan: {},
      tenPointsPlan: [TEN_POINT_MARKER],
      thematicFocus: null,
    })

    expect(canon.slot).toBeUndefined()
    expect(canon.premise[BeatboardPremiseFieldKey.Logline]).toBe(LEDGER_LOGLINE)
    expect(canon.premise[BeatboardPremiseFieldKey.TenPointsPlan]).toEqual([TEN_POINT_MARKER])
  })
})

describe('canon formatters', () => {
  it('text fill includes season spine and cast, not 10-point arrays', () => {
    const pack = assembleStoryCanonPack(
      PROJECT_ID,
      sources({
        storyPlanContent: {
          genre: TABLE_GENRE,
          worldDescription: WORLD,
          episodeRoadmap: {
            episodes: [{ title: LEDGER_TITLE, logline: LEDGER_LOGLINE }],
          },
        },
        episodes: [
          {
            id: EPISODE_ONE,
            sequence: 1,
            title: LEDGER_TITLE,
            premise: LEDGER_LOGLINE,
            storyPlan: {
              premise: { [BeatboardPremiseFieldKey.TenPointsPlan]: [TEN_POINT_MARKER] },
            },
            tenPointsPlan: [TEN_POINT_MARKER],
            thematicFocus: null,
          },
        ],
        characters: [
          {
            name: CAST_NAME,
            role: CAST_ROLE,
            description: CAST_DESC,
            psychology: { [StoryCanonPsychologyField.ActualMotivation]: CAST_MOTIVE },
          },
        ],
      })
    )
    const text = formatCanonForTextFill(pack)

    expect(hasUsableCanonPack(pack)).toBe(true)
    expect(text).toContain(StoryCanonPackLabel.SeasonRoadmap)
    expect(text).toContain(LEDGER_TITLE)
    expect(text).toContain(CAST_NAME)
    expect(text).toContain(CAST_MOTIVE)
    expect(text).not.toContain(TEN_POINT_MARKER)
    expect(text).not.toContain('[')
  })

  it('clips the visual lock and omits roadmap language', () => {
    const world = 'ice '.repeat(StoryCanonPackLimit.VisualLockChars)
    const pack = assembleStoryCanonPack(
      PROJECT_ID,
      sources({
        storyPlanContent: {
          genre: TABLE_GENRE,
          tone: 'Cold',
          worldDescription: world,
          episodeRoadmap: {
            episodes: [{ title: LEDGER_TITLE, logline: LEDGER_LOGLINE }],
          },
        },
      })
    )
    const lock = formatCanonVisualLock(pack)

    expect(lock.length).toBeLessThanOrEqual(StoryCanonPackLimit.VisualLockChars)
    expect(lock).toContain(TABLE_GENRE)
    expect(lock).not.toContain(LEDGER_TITLE)
    expect(lock).not.toContain(StoryCanonPackLabel.SeasonRoadmap)
  })

  it('episode lock uses slot brief plus premise hook, never 10-point copy', () => {
    const pack = assembleStoryCanonPack(
      PROJECT_ID,
      sources({
        storyPlanContent: {
          genre: TABLE_GENRE,
          worldDescription: WORLD,
          episodeRoadmap: {
            episodes: [
              {
                title: LEDGER_TITLE,
                logline: LEDGER_LOGLINE,
                incitingIncident: 'A birthday that never happened.',
              },
            ],
          },
        },
      })
    )
    const canon = assembleOpenEpisodeCanon(pack, {
      id: EPISODE_ONE,
      sequence: 1,
      title: LEDGER_TITLE,
      premise: LEDGER_LOGLINE,
      storyPlan: {
        premise: {
          [BeatboardPremiseFieldKey.Logline]: LEDGER_LOGLINE,
          [BeatboardPremiseFieldKey.ProtagonistHook]: 'Vera opens the clinic.',
          [BeatboardPremiseFieldKey.TenPointsPlan]: [TEN_POINT_MARKER],
        },
      },
      tenPointsPlan: [TEN_POINT_MARKER],
      thematicFocus: 'Hubris',
    })
    const lock = formatCanonEpisodeLock(canon)

    expect(lock.length).toBeLessThanOrEqual(StoryCanonPackLimit.EpisodeLockChars)
    expect(lock).toContain(LEDGER_TITLE)
    expect(lock).toContain('Vera opens the clinic.')
    expect(lock).not.toContain(TEN_POINT_MARKER)
    expect(lock).not.toContain(RoadmapSlotCopy.ExpandPrefix)
  })

  it('reports a missing slot without inventing a 10-point', () => {
    const pack = assembleStoryCanonPack(PROJECT_ID, sources())
    const canon = assembleOpenEpisodeCanon(pack, {
      id: EPISODE_ONE,
      sequence: 4,
      title: LEDGER_TITLE,
      premise: LEDGER_LOGLINE,
      storyPlan: {},
      tenPointsPlan: [],
      thematicFocus: null,
    })
    const lock = formatCanonEpisodeLock(canon)

    expect(lock).toContain(`${RoadmapSlotCopy.MissingPrefix}4${RoadmapSlotCopy.MissingSuffix}`)
  })

  it('clips a composed poster prompt', () => {
    const prompt = composePosterPrompt({
      visualLock: 'Genre: Noir',
      episodeLock: 'ROADMAP SLOT:\nThe Ledger',
      clientPrompt: 'x'.repeat(StoryCanonPackLimit.PosterChars),
    })
    expect(prompt.length).toBeLessThanOrEqual(StoryCanonPackLimit.PosterChars)
    expect(prompt).toContain('Genre: Noir')
  })

  it('treats an empty pack as unusable', () => {
    expect(hasUsableCanonPack(assembleStoryCanonPack(PROJECT_ID, sources()))).toBe(false)
  })
})
