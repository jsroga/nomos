import { beforeEach, describe, expect, it, vi } from 'vitest'
import { decodeRLE, imageDataToDataURL, rleToDataURL } from '../rle'

// Provide polyfill for ImageData in test environment
class MockImageData {
  data: Uint8ClampedArray
  width: number
  height: number
  colorSpace: PredefinedColorSpace = 'srgb'
  constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight: number, height?: number) {
    if (dataOrWidth instanceof Uint8ClampedArray) {
      this.data = dataOrWidth
      this.width = widthOrHeight
      this.height = height ?? 0
    } else {
      this.width = dataOrWidth
      this.height = widthOrHeight
      this.data = new Uint8ClampedArray(this.width * this.height * 4)
    }
  }
}

if (typeof globalThis.ImageData === 'undefined') {
  Object.defineProperty(globalThis, 'ImageData', {
    value: MockImageData,
    writable: true,
  })
}

describe('rle decoder and utilities', () => {
  describe('decodeRLE', () => {
    it('decodes a simple 2x2 mask with custom color', () => {
      // 2x2 = 4 pixels. Values: 1 2 (start at pixel index 1, run length 2 -> pixels 1 and 2)
      const rle = '1 2'
      const customColor = { r: 255, g: 100, b: 50 }
      const imageData = decodeRLE(rle, 2, 2, customColor)

      expect(imageData.width).toBe(2)
      expect(imageData.height).toBe(2)
      expect(imageData.data.length).toBe(16) // 4 pixels * 4 bytes

      // Pixel 0 (index 0..3): transparent
      expect(imageData.data[0]).toBe(0)
      expect(imageData.data[1]).toBe(0)
      expect(imageData.data[2]).toBe(0)
      expect(imageData.data[3]).toBe(0)

      // Pixel 1 (index 4..7): custom color with alpha 200
      expect(imageData.data[4]).toBe(255)
      expect(imageData.data[5]).toBe(100)
      expect(imageData.data[6]).toBe(50)
      expect(imageData.data[7]).toBe(200)

      // Pixel 2 (index 8..11): custom color with alpha 200
      expect(imageData.data[8]).toBe(255)
      expect(imageData.data[9]).toBe(100)
      expect(imageData.data[10]).toBe(50)
      expect(imageData.data[11]).toBe(200)

      // Pixel 3 (index 12..15): transparent
      expect(imageData.data[12]).toBe(0)
      expect(imageData.data[13]).toBe(0)
      expect(imageData.data[14]).toBe(0)
      expect(imageData.data[15]).toBe(0)
    })

    it('decodes multiple runs', () => {
      // 3x3 = 9 pixels. Runs: "0 1 4 2 8 1"
      const rle = '0 1 4 2 8 1'
      const color = { r: 10, g: 20, b: 30 }
      const imageData = decodeRLE(rle, 3, 3, color)

      // Pixel 0
      expect(imageData.data[0]).toBe(10)
      expect(imageData.data[3]).toBe(200)

      // Pixel 1: transparent
      expect(imageData.data[4]).toBe(0)
      expect(imageData.data[7]).toBe(0)

      // Pixel 4 & 5
      expect(imageData.data[16]).toBe(10)
      expect(imageData.data[19]).toBe(200)
      expect(imageData.data[20]).toBe(10)
      expect(imageData.data[23]).toBe(200)

      // Pixel 8
      expect(imageData.data[32]).toBe(10)
      expect(imageData.data[35]).toBe(200)
    })

    it('cycles through default colors when color is not provided', () => {
      const img1 = decodeRLE('0 1', 1, 1)
      const img2 = decodeRLE('0 1', 1, 1)

      expect(img1.data[3]).toBe(200)
      expect(img2.data[3]).toBe(200)
      expect(img1.data[0] + img1.data[1] + img1.data[2]).toBeGreaterThan(0)
      expect(img2.data[0] + img2.data[1] + img2.data[2]).toBeGreaterThan(0)
    })

    it('ignores out of bounds pixel indices safely', () => {
      // 2x2 = 4 pixels (valid indices 0..3). Run starts at 2 with length 5 (indices 2,3,4,5,6)
      const rle = '2 5'
      const color = { r: 100, g: 100, b: 100 }
      const imageData = decodeRLE(rle, 2, 2, color)

      expect(imageData.data[8]).toBe(100) // index 2
      expect(imageData.data[12]).toBe(100) // index 3
    })

    it('handles negative or invalid start position gracefully', () => {
      const rle = '-2 3'
      const color = { r: 50, g: 50, b: 50 }
      const imageData = decodeRLE(rle, 2, 2, color)

      expect(imageData.data[0]).toBe(50)
      expect(imageData.data[3]).toBe(200)
    })

    it('handles incomplete / odd-length value sequences', () => {
      const rle = '0 1 2' // trailing '2' with no length
      const color = { r: 70, g: 80, b: 90 }
      const imageData = decodeRLE(rle, 2, 2, color)

      expect(imageData.data[0]).toBe(70) // index 0 painted
      expect(imageData.data[4]).toBe(0) // index 1 transparent
    })
  })

  describe('imageDataToDataURL and rleToDataURL', () => {
    beforeEach(() => {
      const mockPutImageData = vi.fn()
      const mockToDataURL = vi.fn().mockReturnValue('data:image/png;base64,mockedPngData')

      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockImplementation((ctxType: string) => {
          if (ctxType === '2d') {
            return {
              putImageData: mockPutImageData,
            }
          }
          return null
        }),
        toDataURL: mockToDataURL,
      }

      if (typeof globalThis.document === 'undefined') {
        Object.defineProperty(globalThis, 'document', {
          value: {
            createElement: vi.fn().mockImplementation((tagName: string) => {
              if (tagName === 'canvas') {
                return mockCanvas
              }
              return {}
            }),
          },
          writable: true,
        })
      } else {
        Object.defineProperty(document, 'createElement', {
          value: vi.fn().mockImplementation((tagName: string) => {
            if (tagName === 'canvas') {
              return mockCanvas
            }
            return document.createElement(tagName)
          }),
          writable: true,
        })
      }
    })

    it('converts ImageData to a data URL via canvas', () => {
      const imageData = new ImageData(new Uint8ClampedArray(16), 2, 2)
      const dataUrl = imageDataToDataURL(imageData)

      expect(dataUrl).toBe('data:image/png;base64,mockedPngData')
    })

    it('throws error if canvas 2D context fails', () => {
      Object.defineProperty(document, 'createElement', {
        value: () => ({
          getContext: vi.fn().mockReturnValue(null),
        }),
        writable: true,
      })

      const imageData = new ImageData(new Uint8ClampedArray(16), 2, 2)
      expect(() => imageDataToDataURL(imageData)).toThrow('Failed to create canvas context')
    })

    it('rleToDataURL decodes and converts to data URL', () => {
      const dataUrl = rleToDataURL('0 1', 1, 1)
      expect(dataUrl).toBe('data:image/png;base64,mockedPngData')
    })
  })
})
