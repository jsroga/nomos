import { describe, expect, it } from 'vitest'
import {
  MoodboardFallbackScene,
  buildFallbackPrompts,
  moodboardReplaceStyleRef,
} from '../moodboard-trigger-prompts'

const CONTEXT = {
  worldDesc: 'A basalt coast',
  overview: 'A keeper holds the last lamp against the tide.',
}

describe('buildFallbackPrompts', () => {
  it('returns short slot scenes', () => {
    expect(buildFallbackPrompts(CONTEXT)).toEqual([
      MoodboardFallbackScene.Environment,
      MoodboardFallbackScene.DailyLife,
      MoodboardFallbackScene.CharacterPortrait,
    ])
  })
})

describe('moodboardReplaceStyleRef', () => {
  const keyUrl = 'https://cdn.example/key.png'

  it('uses the first https mood image when regenerating a later tile', () => {
    expect(
      moodboardReplaceStyleRef({ moodImages: [keyUrl, 'https://cdn.example/later.png'] }, undefined, 2),
    ).toEqual({ replaceIndex: 2, styleReferenceUrl: keyUrl })
  })

  it('skips sref for a full board or key-tile regen', () => {
    expect(moodboardReplaceStyleRef({ moodImages: [keyUrl] }, undefined, undefined)).toEqual({
      replaceIndex: undefined,
      styleReferenceUrl: undefined,
    })
    expect(moodboardReplaceStyleRef({ moodImages: [keyUrl] }, undefined, 0)).toEqual({
      replaceIndex: 0,
      styleReferenceUrl: undefined,
    })
  })
})
