import { useEffect, type RefObject } from 'react'
import { useWorldStore } from '@/domains/world-building-toolkit'
import { WorldCanvasDomEvent } from './constants/world-canvas'

const MIN_SCALE = 0.1
const MAX_SCALE = 5
const SCALE_SENSITIVITY = 0.001

export function useWorldCanvasWheelZoom(containerRef: RefObject<HTMLDivElement | null>): void {
  const viewport = useWorldStore(state => state.viewport)
  const setViewport = useWorldStore(state => state.setViewport)
  const isRepaintMode = useWorldStore(state => state.isRepaintMode)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      if (isRepaintMode) {
        e.preventDefault()
        return
      }

      e.preventDefault()

      const scaleChange = e.deltaY * -SCALE_SENSITIVITY
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, viewport.scale + scaleChange))

      const rect = container.getBoundingClientRect()
      const mouseX = e.clientX - rect.left - rect.width / 2
      const mouseY = e.clientY - rect.top - rect.height / 2

      const scaleFactor = newScale / viewport.scale
      const newViewportX = mouseX - scaleFactor * (mouseX - viewport.x)
      const newViewportY = mouseY - scaleFactor * (mouseY - viewport.y)

      setViewport({
        x: newViewportX,
        y: newViewportY,
        scale: newScale,
      })
    }

    container.addEventListener(WorldCanvasDomEvent.Wheel, handleWheel, { passive: false })

    return () => {
      container.removeEventListener(WorldCanvasDomEvent.Wheel, handleWheel)
    }
  }, [containerRef, viewport, setViewport, isRepaintMode])
}
