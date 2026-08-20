import { REPAINT_REVIEW_GAP_PX } from '@/domains/2d-canvas/ui/constants/repaint-review'

export interface RepaintBoundsRect {
  x: number
  y: number
  width: number
  height: number
}

export interface RepaintViewport {
  x: number
  y: number
  scale: number
}

export interface RepaintOverlayScreenRect {
  translateX: number
  translateY: number
  width: number
  height: number
}

export function repaintResultScreenRect(
  bounds: RepaintBoundsRect,
  viewport: RepaintViewport,
): RepaintOverlayScreenRect {
  const scale = viewport.scale || 1
  return {
    translateX: viewport.x + bounds.x * scale,
    translateY: viewport.y + bounds.y * scale,
    width: bounds.width * scale,
    height: bounds.height * scale,
  }
}

export function repaintResultImageTransform(rect: RepaintOverlayScreenRect): string {
  return `translate(${rect.translateX}px, ${rect.translateY}px)`
}

export function repaintReviewBarTransform(rect: RepaintOverlayScreenRect): string {
  return `translate(${rect.translateX + rect.width / 2}px, ${rect.translateY + rect.height + REPAINT_REVIEW_GAP_PX}px) translateX(-50%)`
}
