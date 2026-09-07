import { TourStepPosition } from '@/shared/tours/constants/tour-positions'
import { TourDomEvent, TourSelectorId } from '@/shared/tours/constants/tour-ui'

const PADDING = 16
const CONTENT_WIDTH = 300
const CONTENT_HEIGHT = 200
const MIN_TARGET_PX = 1

export type ElementPosition = {
  top: number
  left: number
  width: number
  height: number
}

function isHiddenTourTarget(element: HTMLElement): boolean {
  let current: HTMLElement | null = element
  while (current) {
    if (current.hidden) return true
    current = current.parentElement
  }
  return false
}

function isTourTargetOnScreen(element: HTMLElement): boolean {
  if (isHiddenTourTarget(element)) return false
  const rect = element.getBoundingClientRect()
  return rect.width >= MIN_TARGET_PX && rect.height >= MIN_TARGET_PX
}

export function getElementPosition(id: string): ElementPosition | null {
  if (id === TourSelectorId.Body) {
    return {
      top: 0,
      left: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    }
  }

  const element = document.getElementById(id)
  if (!element || !isTourTargetOnScreen(element)) return null
  const rect = element.getBoundingClientRect()
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  }
}

export function calculateContentPosition(
  elementPos: ElementPosition,
  position: `${TourStepPosition}` = TourStepPosition.Bottom,
): ElementPosition {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let left = elementPos.left
  let top = elementPos.top

  switch (position) {
    case TourStepPosition.Top:
      top = elementPos.top - CONTENT_HEIGHT - PADDING
      left = elementPos.left + elementPos.width / 2 - CONTENT_WIDTH / 2
      break
    case TourStepPosition.Bottom:
      top = elementPos.top + elementPos.height + PADDING
      left = elementPos.left + elementPos.width / 2 - CONTENT_WIDTH / 2
      break
    case TourStepPosition.Left:
      left = elementPos.left - CONTENT_WIDTH - PADDING
      top = elementPos.top + elementPos.height / 2 - CONTENT_HEIGHT / 2
      break
    case TourStepPosition.Right:
      left = elementPos.left + elementPos.width + PADDING
      top = elementPos.top + elementPos.height / 2 - CONTENT_HEIGHT / 2
      break
    case TourStepPosition.Center:
      left = (viewportWidth - CONTENT_WIDTH) / 2
      top = (viewportHeight - CONTENT_HEIGHT) / 2
      break
  }

  return {
    top: Math.max(PADDING, Math.min(top, viewportHeight - CONTENT_HEIGHT - PADDING)),
    left: Math.max(PADDING, Math.min(left, viewportWidth - CONTENT_WIDTH - PADDING)),
    width: CONTENT_WIDTH,
    height: CONTENT_HEIGHT,
  }
}

export function isClickWithinTourArea(
  event: { clientX: number; clientY: number },
  elementPosition: ElementPosition,
  stepWidth?: number,
  stepHeight?: number,
): boolean {
  const width = stepWidth || elementPosition.width
  const height = stepHeight || elementPosition.height

  return (
    event.clientX >= elementPosition.left &&
    event.clientX <= elementPosition.left + width &&
    event.clientY >= elementPosition.top &&
    event.clientY <= elementPosition.top + height
  )
}

export function buildTourClipPath(
  elementPosition: ElementPosition,
  stepWidth?: number,
  stepHeight?: number,
): string {
  const width = stepWidth || elementPosition.width
  const height = stepHeight || elementPosition.height
  const right = elementPosition.left + width
  const bottom = elementPosition.top + height

  return `polygon(
    0% 0%,
    0% 100%,
    100% 100%,
    100% 0%,
    ${elementPosition.left}px 0%,
    ${elementPosition.left}px ${elementPosition.top}px,
    ${right}px ${elementPosition.top}px,
    ${right}px ${bottom}px,
    ${elementPosition.left}px ${bottom}px,
    ${elementPosition.left}px 0%
  )`
}

export { TourDomEvent }
