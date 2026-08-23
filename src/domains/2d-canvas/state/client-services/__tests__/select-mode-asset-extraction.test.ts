import { beforeEach, describe, expect, it, vi } from 'vitest'
import { extractAsset } from '../select-mode-asset-extraction'

const mockImageResult = {
  width: 512,
  height: 512,
  src: 'mock_src',
}

vi.mock('../select-mode-image-utils', () => ({
  loadImage: vi.fn().mockImplementation((url: string) => {
    return Promise.resolve({
      ...mockImageResult,
      src: url,
    })
  }),
}))

describe('select-mode-asset-extraction', () => {
  beforeEach(() => {
    const mockDrawImage = vi.fn()
    const mockPutImageData = vi.fn()
    const mockToDataURL = vi.fn().mockReturnValue('data:image/png;base64,mockExtractedAssetData')

    const fakeContextPixels = new Uint8ClampedArray(512 * 512 * 4)
    const fakeMaskPixels = new Uint8ClampedArray(512 * 512 * 4)

    for (let y = 100; y < 110; y++) {
      for (let x = 100; x < 110; x++) {
        const idx = (y * 512 + x) * 4
        fakeContextPixels[idx] = 255
        fakeContextPixels[idx + 1] = 0
        fakeContextPixels[idx + 2] = 0
        fakeContextPixels[idx + 3] = 255

        fakeMaskPixels[idx + 3] = 255
      }
    }

    const mockCanvas = {
      width: 512,
      height: 512,
      getContext: vi.fn().mockReturnValue({
        drawImage: mockDrawImage,
        getImageData: vi.fn().mockImplementation((_x, _y, w, _h) => {
          if (w === 512) {
            return {
              data: fakeMaskPixels,
              width: 512,
              height: 512,
            }
          }
          return {
            data: fakeMaskPixels,
            width: w,
            height: w,
          }
        }),
        createImageData: vi.fn().mockReturnValue({
          data: new Uint8ClampedArray(512 * 512 * 4),
          width: 512,
          height: 512,
        }),
        putImageData: mockPutImageData,
      }),
      toDataURL: mockToDataURL,
    }

    if (typeof globalThis.document === 'undefined') {
      Object.defineProperty(globalThis, 'document', {
        value: {
          createElement: vi.fn().mockReturnValue(mockCanvas),
        },
        writable: true,
      })
    } else {
      Object.defineProperty(document, 'createElement', {
        value: vi.fn().mockReturnValue(mockCanvas),
        writable: true,
      })
    }
  })

  it('extracts asset dataUrl and computes world bounds with scaling', async () => {
    const result = await extractAsset(
      'https://example.com/context.png',
      'https://example.com/mask.png',
      { x: 0, y: 0, width: 256, height: 256 }
    )

    expect(result.dataUrl).toBe('data:image/png;base64,mockExtractedAssetData')
    expect(result.bounds).toBeDefined()
    expect(result.bounds.width).toBeGreaterThan(0)
    expect(result.bounds.height).toBeGreaterThan(0)
  })
})
