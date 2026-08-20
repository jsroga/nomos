import { describe, expect, it } from 'vitest'
import {
  VisualOverviewLabel,
  VisualSubjectCopy,
  VisualSubjectKind,
  normalizeVisualSubject,
  stripMidjourneyFlags,
} from '../constants/visual-overview'
import {
  buildVisualSubjectSystemPrompt,
  fallbackVisualSubjects,
} from '../visual-subject-llm'

const CONTEXT = {
  worldDesc: 'A basalt coast',
  overview: 'A keeper holds the last lamp against the tide.',
}

describe('stripMidjourneyFlags', () => {
  it('removes --ar and --v tokens and their values', () => {
    expect(stripMidjourneyFlags('rainy harbour --ar 16:9 --v 7 cinematic')).toBe(
      'rainy harbour cinematic',
    )
  })
})

describe('normalizeVisualSubject', () => {
  it('clamps to five words and strips quotes', () => {
    expect(normalizeVisualSubject('"storm basalt lighthouse above a black cliff"')).toBe(
      'storm basalt lighthouse above a',
    )
  })
})

describe('buildVisualSubjectSystemPrompt', () => {
  it('uses world and overview only for a single subject', () => {
    const prompt = buildVisualSubjectSystemPrompt({
      context: CONTEXT,
      fallbacks: ['storm basalt lighthouse'],
    })
    expect(prompt).toContain(VisualSubjectCopy.Single)
    expect(prompt).toContain(`${VisualOverviewLabel.World}: ${CONTEXT.worldDesc}`)
    expect(prompt).toContain(`${VisualOverviewLabel.Overview}: ${CONTEXT.overview}`)
    expect(prompt).not.toContain('Genre:')
    expect(prompt).not.toContain('Tone:')
  })

  it('appends focus extra and numbered slots for a batch', () => {
    const prompt = buildVisualSubjectSystemPrompt({
      context: CONTEXT,
      extra: 'A weathered sailor with a silver scar',
      slots: ['Environment', 'Daily Life'],
      fallbacks: ['storm basalt lighthouse', 'harbor market'],
    })
    expect(prompt).toContain(VisualSubjectCopy.Batch)
    expect(prompt).toContain(`${VisualOverviewLabel.Focus}: A weathered sailor with a silver scar`)
    expect(prompt).toContain('1. Environment')
    expect(prompt).toContain('2. Daily Life')
  })

  it('names the character, not a place, for a portrait subject', () => {
    const prompt = buildVisualSubjectSystemPrompt({
      context: CONTEXT,
      extra: 'A weathered sailor with a silver scar',
      kind: VisualSubjectKind.Portrait,
      fallbacks: ['weathered sailor silver scar'],
    })
    expect(prompt).toContain(VisualSubjectCopy.Portrait)
    expect(prompt).toContain(
      `${VisualOverviewLabel.Character}: A weathered sailor with a silver scar`,
    )
    expect(prompt).not.toContain(VisualSubjectCopy.Single)
    expect(prompt).not.toContain(`${VisualOverviewLabel.Focus}:`)
  })

  it('describes movie-poster key art for a poster subject', () => {
    const prompt = buildVisualSubjectSystemPrompt({
      context: CONTEXT,
      extra: 'The lamp goes out at dawn',
      kind: VisualSubjectKind.Poster,
      fallbacks: ['lamp out at dawn'],
    })
    expect(prompt).toContain(VisualSubjectCopy.Poster)
    expect(prompt).toContain(`${VisualOverviewLabel.Episode}: The lamp goes out at dawn`)
    expect(prompt).not.toContain(VisualSubjectCopy.Single)
    expect(prompt).not.toContain(VisualSubjectCopy.Portrait)
  })
})

describe('fallbackVisualSubjects', () => {
  it('returns a single slot fallback when slotIndex is set', () => {
    expect(
      fallbackVisualSubjects({
        context: CONTEXT,
        slots: ['Environment', 'Daily Life'],
        slotIndex: 1,
        fallbacks: ['storm basalt lighthouse', 'harbor market'],
      }),
    ).toEqual(['harbor market'])
  })
})
