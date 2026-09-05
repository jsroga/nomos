import { describe, expect, it } from 'vitest'
import { nextUncoveredBeat } from '@/domains/storyteller/core/manuscript/next-uncovered-beat'
import { ManuscriptMode } from '@/domains/storyteller/core/types/enums'
import type { BeatCard } from '@/domains/storyteller/core/types/story-types'

const BEATS: BeatCard[] = [
  { id: 'b1', sequence: 1, logline: 'Chapel', beatType: 'scene' },
  { id: 'b2', sequence: 2, logline: 'Street', beatType: 'scene' },
  { id: 'b3', sequence: 3, logline: 'Roof', beatType: 'scene' },
]

describe('nextUncoveredBeat', () => {
  it('returns the first beat when the manuscript is empty', () => {
    expect(nextUncoveredBeat(BEATS, '', ManuscriptMode.Script)?.id).toBe('b1')
    expect(nextUncoveredBeat(BEATS, '   \n', ManuscriptMode.Novel)?.id).toBe('b1')
  })

  it('returns the beat after already-written spans', () => {
    const script = `INT. CHAPEL - NIGHT
Vera waits.

INT. STREET - DAY
Marcus runs.`
    expect(nextUncoveredBeat(BEATS, script, ManuscriptMode.Script)?.id).toBe('b3')
  })

  it('returns null when every beat already has a span', () => {
    const script = `INT. A - DAY
a

INT. B - DAY
b

INT. C - DAY
c`
    expect(nextUncoveredBeat(BEATS, script, ManuscriptMode.Script)).toBeNull()
  })
})
