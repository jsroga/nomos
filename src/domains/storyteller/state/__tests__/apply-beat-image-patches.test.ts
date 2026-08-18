import { describe, expect, it } from 'vitest'
import { applyBeatImagePatches } from '../useBeatImageBatchStore'

describe('applyBeatImagePatches', () => {
  it('merges image fields onto matching beats', () => {
    const beats: Array<{ id: string; imageUrl?: string; imagePrompt?: string }> = [
      { id: 'a' },
      { id: 'b', imageUrl: 'old.png' },
    ]
    expect(
      applyBeatImagePatches(beats, {
        a: { imageUrl: 'new.png', imagePrompt: 'a clerk in the ward' },
      }),
    ).toEqual([
      { id: 'a', imageUrl: 'new.png', imagePrompt: 'a clerk in the ward' },
      { id: 'b', imageUrl: 'old.png' },
    ])
  })
})
