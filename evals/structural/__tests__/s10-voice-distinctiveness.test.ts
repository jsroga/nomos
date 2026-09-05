import { describe, expect, it } from 'vitest'
import { dumpedBeatFromUnknown } from '../beat-text'
import { ScorerId } from '../constants'
import { scoreVoiceDistinctiveness } from '../s10-voice-distinctiveness'
import type { DumpedBeat } from '../types'

const CONVERGED = `INT. HALL - NIGHT

VERA
I would have thought that you would have seen this coming, because it is the sort of thing that we have always done.

MARCUS
I would have thought that you would have seen this coming, because it is the sort of thing that we have always done.`

const DISTINCT = `INT. HALL - NIGHT

VERA
Shut it. Move. Now. Don't wait.

MARCUS
One might, of course, observe that the bells have rather always belonged to those of us who keep the ledgers, haven't they, my dear?`

function beatFromContent(content: string): DumpedBeat {
  const beat = dumpedBeatFromUnknown({
    id: 'beat-1',
    episodeId: 'episode-1',
    sequence: 1,
    logline: 'Chapel standoff',
    beatType: 'conflict',
    content,
  })
  if (!beat) {
    throw new Error('fixture beat must parse')
  }
  return beat
}

describe('S10 voice_distinctiveness', () => {
  it('scores a gap between converged speakers and hand-distinct voices', () => {
    const converged = scoreVoiceDistinctiveness([beatFromContent(CONVERGED)])
    const distinct = scoreVoiceDistinctiveness([beatFromContent(DISTINCT)])
    const convergedMin = Number(converged.metrics.minPairwiseDivergence)
    const distinctMin = Number(distinct.metrics.minPairwiseDivergence)
    expect(converged.id).toBe(ScorerId.VoiceDistinctiveness)
    expect(convergedMin).toBeLessThan(0.15)
    expect(distinctMin).toBeGreaterThan(0.35)
    expect(distinctMin - convergedMin).toBeGreaterThan(0.2)
  })
})
