import { describe, expect, it } from 'vitest'
import {
  buildStoryboardBeatPrompt,
  partitionBeatCastRefs,
  StoryboardBeatStyleCopy,
} from '../constants/storyboard-beat-prompt'
import type { BeatCastMember } from '@/domains/storyteller/services/constants/beat-cast-extract'

const SCENE = 'Two figures argue on the pier'
const VERA = 'Vera'
const MARCUS = 'Marcus'
const LINA = 'Lina'
const VERA_ID = 'vera-id'
const MARCUS_ID = 'marcus-id'
const LINA_ID = 'lina-id'
const VERA_URL = 'https://cdn.example/vera.png'
const MARCUS_URL = 'https://cdn.example/marcus.png'
const LINA_URL = 'https://cdn.example/lina.png'

describe('buildStoryboardBeatPrompt', () => {
  it('keeps the black-and-white storyboard lock with no cast', () => {
    const prompt = buildStoryboardBeatPrompt(SCENE)
    expect(prompt.startsWith(`${SCENE}. ${StoryboardBeatStyleCopy.Lock}`)).toBe(true)
    expect(prompt).toContain(StoryboardBeatStyleCopy.Mono)
    expect(prompt).not.toContain(StoryboardBeatStyleCopy.LikenessIntro)
    expect(prompt).not.toContain(StoryboardBeatStyleCopy.UnreferencedIntro)
  })

  it('names one likeness reference in attachment order', () => {
    const prompt = buildStoryboardBeatPrompt(SCENE, {
      referencedNames: [VERA],
      unreferencedNames: [],
    })
    expect(prompt).toContain(StoryboardBeatStyleCopy.Lock)
    expect(prompt).toContain(StoryboardBeatStyleCopy.LikenessIntro)
    expect(prompt).toContain(`1. ${VERA}`)
    expect(prompt).toContain(StoryboardBeatStyleCopy.LikenessRule)
    expect(prompt).not.toContain(StoryboardBeatStyleCopy.UnreferencedIntro)
  })

  it('names several likeness refs and characters without portraits', () => {
    const prompt = buildStoryboardBeatPrompt(SCENE, {
      referencedNames: [VERA, MARCUS],
      unreferencedNames: [LINA],
    })
    expect(prompt).toContain(`1. ${VERA}`)
    expect(prompt).toContain(`2. ${MARCUS}`)
    expect(prompt).toContain(StoryboardBeatStyleCopy.UnreferencedIntro)
    expect(prompt).toContain(LINA)
  })
})

describe('partitionBeatCastRefs', () => {
  const members: BeatCastMember[] = [
    { id: VERA_ID, name: VERA },
    { id: MARCUS_ID, name: MARCUS },
    { id: LINA_ID, name: LINA },
  ]

  it('returns no refs when nobody has a public portrait', () => {
    expect(partitionBeatCastRefs(members, {})).toEqual({
      referenced: [],
      unreferencedNames: [VERA, MARCUS, LINA],
    })
  })

  it('keeps reference URLs in extract order and caps extras', () => {
    const refs = partitionBeatCastRefs(
      members,
      {
        [VERA_ID]: VERA_URL,
        [MARCUS_ID]: MARCUS_URL,
        [LINA_ID]: LINA_URL,
      },
      2,
    )
    expect(refs.referenced).toEqual([
      { name: VERA, url: VERA_URL },
      { name: MARCUS, url: MARCUS_URL },
    ])
    expect(refs.unreferencedNames).toEqual([LINA])
  })
})
