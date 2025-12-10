/* eslint-disable indent */
import React, { useRef, useEffect, useCallback } from 'react'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'

// Helper: World -> Screen (for rendering)
const worldToScreen = (
  worldX: number,
  worldY: number,
  width: number,
  height: number,
  currentViewport: { x: number; y: number; scale: number }
) => {
  const centerX = width / 2
  const centerY = height / 2
  const screenX = centerX + currentViewport.x + worldX * currentViewport.scale
  const screenY = centerY + currentViewport.y + worldY * currentViewport.scale
  return { x: screenX, y: screenY }
}

export const RepaintCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Use refs for mutable state needed in the render loop to avoid dependency staleness
  const mousePosRef = useRef<{ x: number; y: number } | null>(null)
  const requestRef = useRef<number | null>(null)

  // Store state
  const isRepaintMode = useWorldStore(state => state.isRepaintMode)
  const brushSize = useWorldStore(state => state.brushSize)
  const addRepaintStroke = useWorldStore(state => state.addRepaintStroke)
  const repaintStrokes = useWorldStore(state => state.repaintStrokes)
  const repaintResult = useWorldStore(state => state.repaintResult)
  const viewport = useWorldStore(state => state.viewport)

  // Helper: Screen -> World (for events)
  const screenToWorld = useCallback(
    (screenX: number, screenY: number, width: number, height: number) => {
      const centerX = width / 2
      const centerY = height / 2
      const worldX = (screenX - centerX - viewport.x) / viewport.scale
      const worldY = (screenY - centerY - viewport.y) / viewport.scale
      return { x: worldX, y: worldY }
    },
    [viewport]
  )

  // Helper: World -> Screen (for rendering)
  // We define this outside or inside the loop, but it needs current viewport

  // 1. Render Loop (The "Game Loop")
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Update size if mismatch (handling resize natively in the loop)
    // This handles the "0x0" issue dynamically
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    // Check if we need to resize the backing store
    // We use Math.floor to avoid float sub-pixel jitter causing infinite resizes
    const targetWidth = Math.floor(rect.width * dpr)
    const targetHeight = Math.floor(rect.height * dpr)

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth
      canvas.height = targetHeight
      // Reset context state after resize
      ctx.scale(dpr, dpr)
    }

    // Visual size for CSS (should match rect)
    if (canvas.style.width !== `${rect.width}px` || canvas.style.height !== `${rect.height}px`) {
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
    }

    // ACTUAL DRAWING
    // We use logic coordinates (CSS pixels) because we scaled the context by DPR
    const width = rect.width
    const height = rect.height

    ctx.clearRect(0, 0, width, height)

    if (repaintResult) {
      // If result exists, we stop drawing overlay (or maybe we should draw it underneath?)
      // For now, follow existing logic: hide strokes
      return
    }

    // Draw Strokes
    if (repaintStrokes.length > 0) {
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'

      for (const point of repaintStrokes) {
        const screen = worldToScreen(point.x, point.y, width, height, viewport)
        const radius = (point.radius || brushSize / 2) * viewport.scale

        ctx.beginPath()
        ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Draw Cursor
    const mPos = mousePosRef.current
    if (mPos && isRepaintMode) {
      const radius = (brushSize / 2) * viewport.scale

      ctx.beginPath()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.lineWidth = 2
      ctx.arc(mPos.x, mPos.y, radius, 0, Math.PI * 2)
      ctx.stroke()

      ctx.beginPath()
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)'
      ctx.lineWidth = 1
      ctx.arc(mPos.x, mPos.y, radius, 0, Math.PI * 2)
      ctx.stroke()
    }

    requestRef.current = requestAnimationFrame(render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repaintStrokes, brushSize, viewport, repaintResult, isRepaintMode])

  // Start/Stop Loop
  useEffect(() => {
    requestRef.current = requestAnimationFrame(render)
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
  }, [render])

  // 2. Event Handlers (Directly updating refs/store)
  const isDrawingRef = useRef(false)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isRepaintMode || repaintResult) return
    e.preventDefault()
    e.stopPropagation()

    isDrawingRef.current = true
    addStroke(e)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isRepaintMode) return
    e.preventDefault()
    e.stopPropagation()

    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Update ref for render loop
    mousePosRef.current = { x, y }

    if (isDrawingRef.current && !repaintResult) {
      addStroke(e)
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isDrawingRef.current = false
  }

  const handleMouseLeave = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isDrawingRef.current = false
    mousePosRef.current = null
  }

  const addStroke = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()

    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const worldPos = screenToWorld(mouseX, mouseY, rect.width, rect.height)

    addRepaintStroke({ x: worldPos.x, y: worldPos.y, radius: brushSize / 2 })
  }

  const renderResultImage = () => {
    if (!repaintResult || !canvasRef.current) return null

    // Note: We use the same transform logic here for CSS
    // We need to ensure viewport.x/y matches the visual transform

    return (
      <img
        src={repaintResult.imageUrl}
        alt="Repaint Result"
        className="absolute z-40 pointer-events-none origin-top-left"
        style={{
          left: '50%',
          top: '50%',
          transform: `translate(${viewport.x + repaintResult.bounds.x * viewport.scale}px, ${viewport.y + repaintResult.bounds.y * viewport.scale}px)`,
          width: repaintResult.bounds.width * viewport.scale,
          height: repaintResult.bounds.height * viewport.scale,
        }}
      />
    )
  }

  if (!isRepaintMode) return null

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-50 w-full h-full touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{
          cursor: repaintResult ? 'default' : 'none',
          pointerEvents: 'all', // Critical
        }}
      />
      {renderResultImage()}
    </>
  )
}
