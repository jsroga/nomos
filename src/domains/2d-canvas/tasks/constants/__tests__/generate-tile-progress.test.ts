import { describe, expect, it } from 'vitest'
import { GenerateTileProgress, nextTileProgress } from '../generate-tile-progress'

describe('nextTileProgress', () => {
  it('does not rewind waiting_apiframe back to generating', () => {
    expect(
      nextTileProgress(GenerateTileProgress.Waiting, GenerateTileProgress.Generating),
    ).toBe(GenerateTileProgress.Waiting)
  })

  it('advances past download into upload instead of dropping to 70', () => {
    expect(
      nextTileProgress(GenerateTileProgress.Downloaded, GenerateTileProgress.Uploading),
    ).toBe(GenerateTileProgress.Uploading)
  })
})
