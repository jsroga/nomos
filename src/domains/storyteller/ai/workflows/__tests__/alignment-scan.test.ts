import { describe, expect, it, vi } from 'vitest'
import { AlignmentScanLabel, AlignmentSection } from '@/domains/storyteller/core/constants/alignment-registry'
import type { AssembledCanon } from '../fix-inconsistencies-contract'
import {
  buildAlignmentScanJobs,
  collectAlignmentFindings,
} from '../alignment-scan'

const CANON: AssembledCanon = {
  empty: false,
  projectId: 'project-1',
  bibleJson: '{"worldDescription":"A frozen ward"}',
  charactersJson: '[{"name":"Vera"}]',
  worldRulesJson: '[{"rule":"The ledger kills"}]',
  sectionsJson: {
    [AlignmentSection.WorldDescription]: '"A frozen ward"',
    [AlignmentSection.WorldRules]: '[{"rule":"The ledger kills"}]',
    [AlignmentSection.Factions]: '[]',
    [AlignmentSection.Inspirations]: '{}',
    [AlignmentSection.PlotTwists]: '[]',
    [AlignmentSection.EpisodeRoadmap]:
      '[{"title":"The Ledger","logline":"Vera hides a name."},{"title":"The Bells","logline":"The wardens arrive."}]',
    [AlignmentSection.Cast]: '[{"name":"Vera"}]',
    [AlignmentSection.Items]: '[]',
    [AlignmentSection.Events]: '[]',
    [AlignmentSection.Soundtracks]: '[]',
    [AlignmentSection.EpisodePremise]: '[]',
    [AlignmentSection.Beats]: '[]',
  },
  episodes: [
    {
      episodeId: 'ep-1',
      title: 'The Ledger',
      sequence: 1,
      premiseJson: '{"logline":"Vera hides a name in the clinic ledger."}',
      beatsJson: '[{"logline":"Vera opens the ward"}]',
    },
  ],
  bibleLocked: false,
  lockedBeatIds: [],
  lockedCharacterIds: [],
}

describe('buildAlignmentScanJobs', () => {
  it('emits one job per filled registry row, including roadmap vs episode 1', () => {
    const jobs = buildAlignmentScanJobs(CANON)
    const sections = jobs.map(job => job.section)
    expect(sections).toContain(AlignmentSection.EpisodeRoadmap)
    expect(sections).toContain(AlignmentSection.WorldDescription)
    expect(sections).toContain(AlignmentSection.EpisodePremise)
    expect(sections).toContain(AlignmentSection.Beats)

    const premise = jobs.find(job => job.section === AlignmentSection.EpisodePremise)
    expect(premise?.episodeSequence).toBe(1)
    expect(premise?.prompt).toContain(AlignmentScanLabel.Section)
    expect(premise?.prompt).toContain(AlignmentSection.EpisodeRoadmap)
    expect(premise?.prompt).toContain('The Ledger')

    const beats = jobs.find(job => job.section === AlignmentSection.Beats)
    expect(beats?.episodeId).toBe('ep-1')
    expect(beats?.prompt).toContain(AlignmentSection.EpisodePremise)
  })

  it('skips empty non-episode sections and includes filled ones', () => {
    expect(buildAlignmentScanJobs(CANON).some(job => job.section === AlignmentSection.Factions)).toBe(
      false
    )
    const filled = buildAlignmentScanJobs({
      ...CANON,
      sectionsJson: {
        ...CANON.sectionsJson,
        [AlignmentSection.Factions]: '[{"name":"Wardens"}]',
      },
    })
    expect(filled.some(job => job.section === AlignmentSection.Factions)).toBe(true)
  })
})

describe('collectAlignmentFindings', () => {
  it('invokes the critic once per registry job including roadmap vs episode N', async () => {
    const jobs = buildAlignmentScanJobs(CANON)
    const scanChunk = vi.fn(async () => [])
    await collectAlignmentFindings(jobs, scanChunk)
    expect(scanChunk).toHaveBeenCalledTimes(jobs.length)
    expect(
      jobs.some(
        job =>
          job.section === AlignmentSection.EpisodePremise &&
          job.episodeSequence === 1 &&
          job.prompt.includes(AlignmentSection.EpisodeRoadmap)
      )
    ).toBe(true)
  })
})
