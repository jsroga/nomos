import type { PackedCropRect } from './context-pack-layout'

const CANVAS_2D_UNAVAILABLE = 'Failed to acquire 2D canvas context'

export async function buildHoleMask(
  width: number,
  height: number,
  hole: PackedCropRect
): Promise<Blob> {
  const maskCanvas = new OffscreenCanvas(width, height)
  const maskCtx = maskCanvas.getContext('2d')
  if (!maskCtx) throw new Error(CANVAS_2D_UNAVAILABLE)
  maskCtx.fillStyle = '#000000'
  maskCtx.fillRect(0, 0, width, height)
  maskCtx.fillStyle = '#ffffff'
  maskCtx.fillRect(hole.x, hole.y, hole.width, hole.height)
  return maskCanvas.convertToBlob({ type: 'image/png' })
}
