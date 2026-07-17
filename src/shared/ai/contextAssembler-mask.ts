const NEUTRAL_FILL_RGB = { r: 128, g: 128, b: 128 }
const NEUTRAL_FILL_TOLERANCE = 2

export async function buildEditableRegionMask(
  sourceCanvas: OffscreenCanvas,
  size: number
): Promise<Blob> {
  const maskCanvas = new OffscreenCanvas(size, size)
  const maskCtx = maskCanvas.getContext('2d')
  if (!maskCtx) throw new Error('Failed to acquire 2D canvas context')

  const sourceCtx = sourceCanvas.getContext('2d')
  if (!sourceCtx) throw new Error('Failed to acquire 2D canvas context')

  const imageData = sourceCtx.getImageData(0, 0, size, size)
  const maskImageData = maskCtx.createImageData(size, size)
  const source = imageData.data
  const target = maskImageData.data

  for (let i = 0; i < source.length; i += 4) {
    const r = source[i]
    const g = source[i + 1]
    const b = source[i + 2]
    const a = source[i + 3]
    const isNeutralEditableRegion =
      a > 0 &&
      Math.abs(r - NEUTRAL_FILL_RGB.r) <= NEUTRAL_FILL_TOLERANCE &&
      Math.abs(g - NEUTRAL_FILL_RGB.g) <= NEUTRAL_FILL_TOLERANCE &&
      Math.abs(b - NEUTRAL_FILL_RGB.b) <= NEUTRAL_FILL_TOLERANCE

    const value = isNeutralEditableRegion ? 255 : 0
    target[i] = value
    target[i + 1] = value
    target[i + 2] = value
    target[i + 3] = 255
  }

  maskCtx.putImageData(maskImageData, 0, 0)
  return maskCanvas.convertToBlob({ type: 'image/png' })
}
