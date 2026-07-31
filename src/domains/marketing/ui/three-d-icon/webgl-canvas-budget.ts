import { MarketingWebGlBudget } from '@/domains/marketing/constants/viewport-3d'

let activeCanvases = 0

export function tryAcquireWebGlCanvasSlot(): boolean {
  if (activeCanvases >= MarketingWebGlBudget.MaxConcurrentCanvases) {
    return false
  }
  activeCanvases += 1
  return true
}

export function releaseWebGlCanvasSlot(): void {
  activeCanvases = Math.max(0, activeCanvases - 1)
}

export function getActiveWebGlCanvasCount(): number {
  return activeCanvases
}
