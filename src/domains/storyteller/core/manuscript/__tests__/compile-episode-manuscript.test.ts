import { describe, expect, it } from 'vitest'
import { compileEpisodeManuscript } from '@/domains/storyteller/core/manuscript/compile-episode-manuscript'
import { BeatStatus, ManuscriptMode } from '@/domains/storyteller/core/types/enums'
import type { BeatCard } from '@/domains/storyteller/core/types/story-types'

const BEATS: BeatCard[] = [
  {
    id: 'b2',
    sequence: 2,
    logline: 'Street',
    beatType: 'scene',
    content: 'INT. STREET - DAY\nMarcus runs.',
    status: BeatStatus.APPROVED,
  },
  {
    id: 'b1',
    sequence: 1,
    logline: 'Chapel',
    beatType: 'scene',
    content: 'INT. CHAPEL - NIGHT\nVera waits.',
    status: BeatStatus.APPROVED,
  },
  {
    id: 'b3',
    sequence: 3,
    logline: 'Cut',
    beatType: 'scene',
    content: 'INT. CUT - DAY\nDropped.',
    status: BeatStatus.REJECTED,
  },
]

describe('compileEpisodeManuscript', () => {
  it('concatenates approved beat drafts in sequence order', () => {
    const compiled = compileEpisodeManuscript(BEATS, ManuscriptMode.Script)
    expect(compiled.startsWith('INT. CHAPEL - NIGHT')).toBe(true)
    expect(compiled.indexOf('INT. CHAPEL')).toBeLessThan(compiled.indexOf('INT. STREET'))
    expect(compiled).not.toContain('Dropped')
  })
})
