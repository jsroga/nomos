import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchMaskAsDataUrl,
  loadImage,
  resizeMask,
} from '../select-mode-image-utils'

class MockImage {
  src = ''
  crossOrigin = ''
  onload: (() => void) | null = null
  onerror: ((e: unknown) => void) | null = null

  constructor() {
    setTimeout(() => {
      if (this.src.includes('fail')) {
        this.onerror?.(new Error('Image decode error'))
      } else {
        this.onload?.()
      }
    }, 0)
  }
}

if (typeof globalThis.Image === 'undefined') {
  Object.defineProperty(globalThis, 'Image', {
    value: MockImage,
    writable: true,
  })
}

describe('select-mode-image-utils', () => {
  beforeEach(() => {
    const mockDrawImage = vi.fn()
    const mockToDataURL = vi.fn().mockReturnValue('data:image/png;base64,mockCanvasResult')

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue({
        drawImage: mockDrawImage,
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

  describe('loadImage', () => {
    it('loads image successfully and sets crossOrigin for http URLs', async () => {
      const img = await loadImage('https://example.com/mask.png')
      expect(img.src).toBe('https://example.com/mask.png')
      expect(img.crossOrigin).toBe('Anonymous')
    })

    it('rejects with descriptive error when image fails to load', async () => {
      await expect(loadImage('https://example.com/fail.png')).rejects.toThrow(
        'Failed to load image'
      )
    })
  })

  describe('fetchMaskAsDataUrl', () => {
    it('fetches mask image and draws onto canvas returning dataUrl', async () => {
      const dataUrl = await fetchMaskAsDataUrl('https://example.com/mask.png', 256, 256)
      expect(dataUrl).toBe('data:image/png;base64,mockCanvasResult')
    })

    it('returns null on error without throwing', async () => {
      const dataUrl = await fetchMaskAsDataUrl('https://example.com/fail.png', 256, 256)
      expect(dataUrl).toBeNull()
    })
  })

  describe('resizeMask', () => {
    it('resizes mask onto canvas and returns new dataUrl', async () => {
      const dataUrl = await resizeMask('data:image/png;base64,maskData', 100, 100, 200, 200)
      expect(dataUrl).toBe('data:image/png;base64,mockCanvasResult')
    })

    it('throws error when image loading fails during resize', async () => {
      await expect(
        resizeMask('https://example.com/fail.png', 100, 100, 200, 200)
      ).rejects.toThrow()
    })
  })
})
