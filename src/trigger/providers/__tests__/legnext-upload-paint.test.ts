import { describe, expect, it } from 'vitest'
import { buildLegNextUploadPaintPayload } from '../legnext-upload-paint'

describe('buildLegNextUploadPaintPayload', () => {
  it('uses polygon areas for first tiles', () => {
    const result = buildLegNextUploadPaintPayload({
      imageUrl: 'https://example.com/context.png',
      remixPrompt: 'prompt',
      isFirstTile: true,
    })

    expect(result.maskMode).toBe('polygon-areas')
    expect(result.payload.canvas).toEqual({ width: 1024, height: 1024 })
    expect(result.payload.imgPos).toEqual({ width: 1024, height: 1024, x: 0, y: 0 })
    expect('areas' in result.payload.mask).toBe(true)
    if ('areas' in result.payload.mask) {
      expect(result.payload.mask.areas[0]).toEqual({
        width: 1024,
        height: 1024,
        points: [0, 0, 0, 1024, 1024, 1024, 1024, 0],
      })
    }
  })

  it('uses uploaded black and white mask url for follow-up tiles when available', () => {
    const result = buildLegNextUploadPaintPayload({
      imageUrl: 'https://example.com/context.png',
      remixPrompt: 'prompt',
      isFirstTile: false,
      maskUrl: 'https://example.com/mask.png',
    })

    expect(result.maskMode).toBe('mask-url')
    expect(result.payload.canvas).toEqual({ width: 1024, height: 1024 })
    expect(result.payload.imgPos).toEqual({ width: 1024, height: 1024, x: 0, y: 0 })
    expect(result.payload.mask).toEqual({ url: 'https://example.com/mask.png' })
  })

  it('falls back to center polygon mask for follow-up tiles when no mask url is available', () => {
    const result = buildLegNextUploadPaintPayload({
      imageUrl: 'https://example.com/context.png',
      remixPrompt: 'prompt',
      isFirstTile: false,
    })

    expect(result.maskMode).toBe('polygon-areas')
    expect('areas' in result.payload.mask).toBe(true)
    if ('areas' in result.payload.mask) {
      expect(result.payload.mask.areas[0]).toEqual({
        width: 512,
        height: 512,
        points: [256, 256, 256, 768, 768, 768, 768, 256],
      })
    }
  })

  it('uses explicit image dimensions and centers imgPos when image is smaller than canvas', () => {
    const result = buildLegNextUploadPaintPayload({
      imageUrl: 'https://example.com/small.png',
      remixPrompt: 'prompt',
      isFirstTile: true,
      imageWidth: 512,
      imageHeight: 512,
    })

    expect(result.payload.canvas).toEqual({ width: 1024, height: 1024 })
    expect(result.payload.imgPos).toEqual({ width: 512, height: 512, x: 256, y: 256 })
  })

  it('uses maskBounds for imgPos when maskUrl and maskBounds are provided (editable region per mask)', () => {
    const result = buildLegNextUploadPaintPayload({
      imageUrl: 'https://example.com/context.png',
      remixPrompt: 'prompt',
      isFirstTile: false,
      maskUrl: 'https://example.com/mask.png',
      maskBounds: { x: 0, y: 512, width: 1024, height: 512 },
    })

    expect(result.maskMode).toBe('mask-url')
    expect(result.payload.imgPos).toEqual({ width: 1024, height: 512, x: 0, y: 512 })
  })
})
