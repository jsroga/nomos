import { describe, expect, it } from 'vitest'
import { BeatStatus, BeatType } from '@/domains/storyteller/core/types/enums'
import { proposedBeatFromData } from '@/domains/storyteller/ai/tools/beat-tool-operations'

describe('proposedBeatFromData', () => {
  it('builds a beat payload without requiring a database row', () => {
    const beat = proposedBeatFromData(
      'ep-1',
      2,
      {
        logline: 'A body ages overnight.',
        actionTaken: 'She opens the ledger.',
        consequence: 'The year is blank.',
        storyStateChange: 'Time is no longer honest.',
        visualHook: 'A clock with no hands.',
      },
      'beat-1'
    )

    expect(beat.id).toBe('beat-1')
    expect(beat.episodeId).toBe('ep-1')
    expect(beat.sequence).toBe(2)
    expect(beat.beatType).toBe(BeatType.SETUP)
    expect(beat.status).toBe(BeatStatus.PROPOSED)
    expect(beat.logline).toBe('A body ages overnight.')
  })
})
