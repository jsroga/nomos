import { describe, expect, it } from 'vitest'
import {
  TILE_STAGE_LABELS,
  TileProgressLabel,
  TileProgressStage,
} from '../tile-stage-labels'

describe('TILE_STAGE_LABELS', () => {
  it('labels fidelity enhance stages for the tile overlay', () => {
    expect(TILE_STAGE_LABELS[TileProgressStage.Enhancing]).toBe(TileProgressLabel.Enhancing)
    expect(TILE_STAGE_LABELS[TileProgressStage.PendingReview]).toBe(TileProgressLabel.Review)
    expect(TILE_STAGE_LABELS[TileProgressStage.Uploading]).toBe(TileProgressLabel.Uploading)
  })
})
