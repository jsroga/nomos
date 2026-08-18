import {
  WorldCanvasDomTag,
  WorldCanvasToolShortcut,
} from '@/domains/2d-canvas/ui/components/Canvas/constants/world-canvas'

export function isWorldCanvasTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.tagName === WorldCanvasDomTag.Input ||
      target.tagName === WorldCanvasDomTag.Textarea ||
      target.isContentEditable)
  )
}

export function worldCanvasEventKey(key: string | undefined): string | undefined {
  if (typeof key !== 'string') return undefined
  return key.toLowerCase()
}

export function isWorldCanvasSpaceRelease(key: string | undefined, typing: boolean): boolean {
  if (typing) return false
  return worldCanvasEventKey(key) === WorldCanvasToolShortcut.Space
}
