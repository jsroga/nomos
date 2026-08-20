import { describe, expect, it } from 'vitest'
import { beatImageBusy } from '../BeatCard'
import { BeatGenerationMode } from '../constants/beat-card'

describe('beatImageBusy', () => {
  it('locks only while this beat or the batch is generating an image', () => {
    expect(beatImageBusy(null, false)).toBe(false)
    expect(beatImageBusy(BeatGenerationMode.Image, false)).toBe(true)
    expect(beatImageBusy(null, true)).toBe(true)
  })
})
