import { describe, expect, it } from 'vitest'
import {
  BeatImageBatchOverlay,
  beatImageBatchOverlay,
  getBeatImageBatchStore,
} from '@/domains/storyteller/state/useBeatImageBatchStore'

describe('beatImageBatchOverlay', () => {
  it('marks queued beats without images as pending', () => {
    expect(
      beatImageBatchOverlay({
        beatId: 'b',
        pendingBeatIds: ['a', 'b'],
        activeBeatId: 'a',
      }),
    ).toBe(BeatImageBatchOverlay.Pending)
  })

  it('keeps the generating label for the active beat and for beats that already have images', () => {
    expect(
      beatImageBatchOverlay({
        beatId: 'a',
        pendingBeatIds: ['a', 'b'],
        activeBeatId: 'a',
      }),
    ).toBe(BeatImageBatchOverlay.Generating)
    expect(
      beatImageBatchOverlay({
        beatId: 'c',
        imageUrl: 'shot.png',
        pendingBeatIds: ['a', 'c'],
        activeBeatId: 'a',
      }),
    ).toBe(BeatImageBatchOverlay.Generating)
  })
})

describe('beat image batch cancel', () => {
  it('drops pending overlays immediately', () => {
    getBeatImageBatchStore().start('episode-1', ['a', 'b'])
    getBeatImageBatchStore().setActiveBeat('a')
    getBeatImageBatchStore().cancel()
    const store = getBeatImageBatchStore()
    expect(store.pendingBeatIds).toEqual([])
    expect(store.activeBeatId).toBeNull()
    expect(store.cancelled).toBe(true)
    getBeatImageBatchStore().clear()
  })
})
