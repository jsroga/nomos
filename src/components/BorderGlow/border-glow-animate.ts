function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3)
}

function easeInCubic(x: number): number {
  return x * x * x
}

export enum BorderGlowEase {
  OutCubic = 'out-cubic',
  InCubic = 'in-cubic',
}

export function borderGlowEase(kind: BorderGlowEase): (t: number) => number {
  return kind === BorderGlowEase.InCubic ? easeInCubic : easeOutCubic
}

export function animateBorderGlowValue(input: {
  start?: number
  end?: number
  duration?: number
  delay?: number
  ease?: (t: number) => number
  onUpdate: (value: number) => void
  onEnd?: () => void
}): void {
  const start = input.start ?? 0
  const end = input.end ?? 100
  const duration = input.duration ?? 1000
  const delay = input.delay ?? 0
  const ease = input.ease ?? easeOutCubic
  const origin = performance.now() + delay
  const tick = () => {
    const elapsed = performance.now() - origin
    const t = Math.min(elapsed / duration, 1)
    input.onUpdate(start + (end - start) * ease(t))
    if (t < 1) {
      requestAnimationFrame(tick)
      return
    }
    input.onEnd?.()
  }
  window.setTimeout(() => {
    requestAnimationFrame(tick)
  }, delay)
}
