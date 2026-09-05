import { describe, expect, it } from 'vitest'
import { applyUpdatesToStoryPlan } from '../action-config'

const TRACK_A = { title: 'Ashes', artist: 'Vex', youtubeUrl: 'https://www.youtube.com/watch?v=aaaaaaaaaaa' }
const TRACK_B = { title: 'Stillness', artist: 'Vex', youtubeUrl: 'https://www.youtube.com/watch?v=bbbbbbbbbbb' }
const TRACK_A_REVISED = { title: 'Ashes', artist: 'Nomos', youtubeUrl: 'https://www.youtube.com/watch?v=ccccccccccc' }

describe('applyUpdatesToStoryPlan — soundtracks replace', () => {
  it('replaces the soundtrack list instead of appending to it', () => {
    const plan = { soundtracks: [TRACK_A, TRACK_B] }
    const next = applyUpdatesToStoryPlan(plan, { soundtracks: [TRACK_A_REVISED] })
    expect(next.soundtracks).toEqual([TRACK_A_REVISED])
  })

  it('does not merge a same-titled track into the previous entry', () => {
    const plan = { soundtracks: [TRACK_A] }
    const next = applyUpdatesToStoryPlan(plan, { soundtracks: [TRACK_A_REVISED] })
    // smartMergeArray keys on `title`, which previously kept the stale artist/url.
    expect(next.soundtracks).toEqual([TRACK_A_REVISED])
  })

  it('clears the list when a regenerate returns nothing', () => {
    const plan = { soundtracks: [TRACK_A, TRACK_B] }
    const next = applyUpdatesToStoryPlan(plan, { soundtracks: [] })
    expect(next.soundtracks).toEqual([])
  })

  it('replaces additive collections like worldRules', () => {
    const plan = { worldRules: [{ rule: 'Megacorps are above the law' }] }
    const next = applyUpdatesToStoryPlan(plan, { worldRules: [{ rule: 'The dead keep voting' }] })
    expect(next.worldRules).toEqual([{ rule: 'The dead keep voting' }])
  })
})
