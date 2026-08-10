// Bright colors for mask visualization
import {
  CANVAS_2D_CONTEXT,
  CANVAS_CONTEXT_FAILED_MESSAGE,
  CanvasElementTag,
  RLE_DECODE_LOG_PREFIX,
} from '@/domains/2d-canvas/core/constants/rle'

const MASK_COLORS = [
  { r: 59, g: 130, b: 246 }, // Blue
  { r: 16, g: 185, b: 129 }, // Green
  { r: 239, g: 68, b: 68 }, // Red
  { r: 168, g: 85, b: 247 }, // Purple
  { r: 245, g: 158, b: 11 }, // Orange
  { r: 236, g: 72, b: 153 }, // Pink
  { r: 6, g: 182, b: 212 }, // Cyan
  { r: 132, g: 204, b: 22 }, // Lime
]

let colorIndex = 0

/**
 * Decode SAM/fal.ai RLE (Run-Length Encoding) to a colored mask
 * Format: pairs of (start_position, run_length) in row-major order
 */
export function decodeRLE(
  rle: string,
  width: number,
  height: number,
  color?: { r: number; g: number; b: number }
): ImageData {
  const values = rle.split(' ').map(Number)
  const totalPixels = width * height
  const pixels = new Uint8ClampedArray(totalPixels * 4)

  // Use provided color or cycle through bright colors
  const maskColor = color || MASK_COLORS[colorIndex++ % MASK_COLORS.length]

  // Initialize all pixels as transparent (background)
  for (let i = 0; i < totalPixels * 4; i += 4) {
    pixels[i] = 0 // R
    pixels[i + 1] = 0 // G
    pixels[i + 2] = 0 // B
    pixels[i + 3] = 0 // A
  }

  console.log(RLE_DECODE_LOG_PREFIX, { width, height, totalPixels, color: maskColor })

  // Process pairs of (start_position, run_length)
  // Positions are directly in row-major order (no conversion needed)
  for (let i = 0; i < values.length; i += 2) {
    const startPos = values[i]
    const runLength = values[i + 1]

    if (startPos === undefined || runLength === undefined) break

    for (let j = 0; j < runLength; j++) {
      const pixelIdx = startPos + j
      if (pixelIdx < 0 || pixelIdx >= totalPixels) continue

      const idx = pixelIdx * 4
      pixels[idx] = maskColor.r // R
      pixels[idx + 1] = maskColor.g // G
      pixels[idx + 2] = maskColor.b // B
      pixels[idx + 3] = 200 // A (semi-transparent for overlay)
    }
  }

  return new ImageData(pixels, width, height)
}

/**
 * Convert ImageData to a data URL
 */
export function imageDataToDataURL(imageData: ImageData): string {
  const canvas = document.createElement(CanvasElementTag.Canvas)
  canvas.width = imageData.width
  canvas.height = imageData.height
  const ctx = canvas.getContext(CANVAS_2D_CONTEXT)
  if (!ctx) throw new Error(CANVAS_CONTEXT_FAILED_MESSAGE)

  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}

/**
 * Decode RLE and convert to a data URL
 */
export function rleToDataURL(rle: string, width: number, height: number): string {
  const imageData = decodeRLE(rle, width, height)
  return imageDataToDataURL(imageData)
}
