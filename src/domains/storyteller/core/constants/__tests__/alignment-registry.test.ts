import { describe, expect, it } from 'vitest'
import {
  ALIGNMENT_REGISTRY,
  AlignmentSection,
} from '../alignment-registry'

const WRITE_SECTIONS: readonly AlignmentSection[] = [
  AlignmentSection.WorldDescription,
  AlignmentSection.WorldRules,
  AlignmentSection.Factions,
  AlignmentSection.Inspirations,
  AlignmentSection.PlotTwists,
  AlignmentSection.EpisodeRoadmap,
  AlignmentSection.Cast,
  AlignmentSection.Items,
  AlignmentSection.Events,
  AlignmentSection.Soundtracks,
  AlignmentSection.EpisodePremise,
]

describe('ALIGNMENT_REGISTRY', () => {
  it('has one row per AlignmentSection', () => {
    const sections = ALIGNMENT_REGISTRY.map(rule => rule.section)
    expect(new Set(sections).size).toBe(sections.length)
    for (const section of Object.values(AlignmentSection)) {
      expect(sections).toContain(section)
    }
  })

  it('covers every bible write target plus beats', () => {
    const values = ALIGNMENT_REGISTRY.map(rule => String(rule.section))
    for (const section of WRITE_SECTIONS) {
      expect(values).toContain(String(section))
    }
    expect(values).toContain(String(AlignmentSection.Beats))
  })

  it('matches episode-scoped rows by sequence', () => {
    const premise = ALIGNMENT_REGISTRY.find(rule => rule.section === AlignmentSection.EpisodePremise)
    const beats = ALIGNMENT_REGISTRY.find(rule => rule.section === AlignmentSection.Beats)
    expect(premise?.related).toContain(AlignmentSection.EpisodeRoadmap)
    expect(beats?.related).toContain(AlignmentSection.EpisodePremise)
    expect(beats?.related).toContain(AlignmentSection.EpisodeRoadmap)
  })
})
