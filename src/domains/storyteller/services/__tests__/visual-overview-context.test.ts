import { describe, expect, it } from 'vitest'
import {
  buildVisualOverviewContext,
  isVisualOverviewReady,
  visualOverviewFromCanon,
  formatVisualOverviewBlock,
} from '../visual-overview-context'
import { VisualOverviewLabel } from '../constants/visual-overview'

describe('buildVisualOverviewContext', () => {
  it('joins executive summary and central question as overview', () => {
    const context = buildVisualOverviewContext({
      bibleWorldDescription: '  A basalt coast  ',
      executiveSummary: 'A keeper holds the last lamp.',
      centralQuestion: 'Who keeps the light?',
    })
    expect(context.worldDesc).toBe('A basalt coast')
    expect(context.overview).toBe('A keeper holds the last lamp.\nWho keeps the light?')
    expect(isVisualOverviewReady(context)).toBe(true)
  })

  it('requires a world description', () => {
    expect(
      isVisualOverviewReady({
        worldDesc: 'A basalt coast',
        overview: '',
      }),
    ).toBe(true)
    expect(isVisualOverviewReady({ worldDesc: '', overview: 'Overview' })).toBe(false)
  })
})

describe('visualOverviewFromCanon', () => {
  it('prefers pack world description and story-plan overview', () => {
    const context = visualOverviewFromCanon(
      { worldDescription: 'Bible world', executiveSummary: 'Bible summary' },
      {
        worldDescription: 'Pack world',
        storyPlan: {
          executiveSummary: 'Pack summary',
          centralQuestion: 'Who keeps the light?',
        },
      },
    )
    expect(context.worldDesc).toBe('Pack world')
    expect(context.overview).toBe('Pack summary\nWho keeps the light?')
    expect(formatVisualOverviewBlock(context)).toContain(`${VisualOverviewLabel.World}: Pack world`)
    expect(formatVisualOverviewBlock(context)).toContain(`${VisualOverviewLabel.Overview}: Pack summary`)
  })
})

describe('formatVisualOverviewBlock', () => {
  it('omits an empty overview line', () => {
    expect(
      formatVisualOverviewBlock({ worldDesc: 'A basalt coast', overview: '' }),
    ).toBe(`${VisualOverviewLabel.World}: A basalt coast`)
  })
})
