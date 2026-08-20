import { describe, expect, it } from 'vitest'
import {
  buildBeatCastExtractPrompt,
  buildBeatExtractText,
  findRosterMember,
  matchCastByExtractedNames,
  type BeatCastMember,
} from '../constants/beat-cast-extract'
import { extractVisibleBeatCast } from '../beat-cast-extract-service'
import { BeatCastExtractPromptLabel } from '@/domains/storyteller/ai/agents/BeatCastExtract/constants/beat-cast-extract-agent'

const VERA = 'Vera'
const MARCUS = 'Marcus'
const LINA = 'Lina'
const VERA_KADE = 'Vera Kade'
const VERA_ID = 'vera-id'
const MARCUS_ID = 'marcus-id'
const LINA_ID = 'lina-id'
const LOGLINE = 'Vera faces Marcus on the pier.'
const VISUAL_HOOK = 'Wide two-shot at dusk.'
const HTTPS_PORTRAIT = 'https://cdn.example/vera.png'

const roster: BeatCastMember[] = [
  { id: VERA_ID, name: VERA, portraitUrl: HTTPS_PORTRAIT },
  { id: MARCUS_ID, name: MARCUS },
  { id: LINA_ID, name: LINA },
]

describe('beat extract text', () => {
  it('joins unique beat fields and the scene prompt', () => {
    const text = buildBeatExtractText({
      logline: LOGLINE,
      visualHook: VISUAL_HOOK,
      imagePrompt: LOGLINE,
      scenePrompt: LOGLINE,
    })
    expect(text).toBe(`${LOGLINE}\n${VISUAL_HOOK}`)
  })
})

describe('matchCastByExtractedNames', () => {
  it('returns an empty list when nothing is extracted', () => {
    expect(matchCastByExtractedNames([], roster)).toEqual([])
  })

  it('matches one exact name case-insensitively', () => {
    expect(matchCastByExtractedNames(['vera'], roster).map(member => member.id)).toEqual([
      VERA_ID,
    ])
  })

  it('matches several names and drops unknown ones', () => {
    const matched = matchCastByExtractedNames([VERA, 'Crowd', MARCUS], roster)
    expect(matched.map(member => member.name)).toEqual([VERA, MARCUS])
  })

  it('matches a full roster name from a shorter extract', () => {
    const wide: BeatCastMember[] = [{ id: VERA_ID, name: VERA_KADE }]
    expect(findRosterMember(VERA, wide)?.id).toBe(VERA_ID)
  })

  it('dedupes the same character listed twice', () => {
    expect(matchCastByExtractedNames([VERA, 'vera'], roster)).toHaveLength(1)
  })
})

describe('extractVisibleBeatCast', () => {
  it('returns an empty list when the model reports nobody', async () => {
    const matched = await extractVisibleBeatCast({
      beatText: VISUAL_HOOK,
      roster,
      hintedNames: [VERA],
      extract: async () => ({ names: [] }),
    })
    expect(matched).toEqual([])
  })

  it('returns matched roster members for one and many names', async () => {
    const one = await extractVisibleBeatCast({
      beatText: LOGLINE,
      roster,
      hintedNames: [],
      extract: async () => ({ names: [VERA] }),
    })
    const many = await extractVisibleBeatCast({
      beatText: LOGLINE,
      roster,
      hintedNames: [],
      extract: async () => ({ names: [VERA, MARCUS, LINA] }),
    })
    expect(one.map(member => member.name)).toEqual([VERA])
    expect(many.map(member => member.name)).toEqual([VERA, MARCUS, LINA])
  })

  it('falls back to hinted names when extract fails', async () => {
    const matched = await extractVisibleBeatCast({
      beatText: LOGLINE,
      roster,
      hintedNames: [MARCUS],
      extract: async () => {
        throw new Error('extract failed')
      },
    })
    expect(matched.map(member => member.name)).toEqual([MARCUS])
  })

  it('falls back to hinted names when extracted names miss the roster', async () => {
    const matched = await extractVisibleBeatCast({
      beatText: LOGLINE,
      roster,
      hintedNames: [LINA],
      extract: async () => ({ names: ['Crowd'] }),
    })
    expect(matched.map(member => member.name)).toEqual([LINA])
  })
})

describe('buildBeatCastExtractPrompt', () => {
  it('includes roster, hinted names, and beat text', () => {
    const prompt = buildBeatCastExtractPrompt({
      beatText: LOGLINE,
      rosterNames: [VERA, MARCUS],
      hintedNames: [VERA],
    })
    expect(prompt).toContain(BeatCastExtractPromptLabel.Roster)
    expect(prompt).toContain(VERA)
    expect(prompt).toContain(MARCUS)
    expect(prompt).toContain(BeatCastExtractPromptLabel.Hinted)
    expect(prompt).toContain(BeatCastExtractPromptLabel.Beat)
    expect(prompt).toContain(LOGLINE)
  })
})
