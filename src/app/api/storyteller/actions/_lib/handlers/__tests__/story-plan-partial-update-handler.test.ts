import { describe, expect, it } from 'vitest'
import { ActionType } from '@/domains/storyteller/core/types/enums'
import { buildStoryPlanPartialUpdates } from '../story-plan-partial-update-handler'

describe('buildStoryPlanPartialUpdates', () => {
  it('omits empty soundtracks so they cannot replace stored tracks', () => {
    expect(
      buildStoryPlanPartialUpdates({
        type: ActionType.UPDATE_SOUNDTRACKS,
        payload: { soundtracks: [] },
      }),
    ).toEqual({})
  })

  it('omits inspirations when every bucket is empty', () => {
    expect(
      buildStoryPlanPartialUpdates({
        type: ActionType.UPDATE_INSPIRATIONS,
        payload: { inspirations: { books: [], movies: [], games: [] } },
      }),
    ).toEqual({})
  })
})
