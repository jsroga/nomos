import React, { useRef, useState, useEffect } from 'react'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { Tile } from './Tile'
import { RepaintCanvas } from './RepaintCanvas'

const TILE_SIZE = 512

export const WorldCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })

  const viewport = useWorldStore(state => state.viewport)
  const setViewport = useWorldStore(state => state.setViewport)
  const tiles = useWorldStore(state => state.tiles)
  const isRepaintMode = useWorldStore(state => state.isRepaintMode)
  const setRepaintMode = useWorldStore(state => state.setRepaintMode)
  const setSelectedTile = useWorldStore(state => state.setSelectedTile)
  const repaintResult = useWorldStore(state => state.repaintResult)
  const setRepaintResult = useWorldStore(state => state.setRepaintResult)
  const clearRepaintStrokes = useWorldStore(state => state.clearRepaintStrokes)
  const setDebugInfo = useWorldStore(state => state.setDebugInfo)

  // DEBUG: Log interactions
  const logEvent = (name: string, e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    // Don't spam mouse move logs unless needed
    if (name !== 'onMouseMove') {
      console.log(`[WorldCanvas] ${name}`, {
        target: target.tagName + (typeof target.className === 'string' ? '.' + target.className.split(' ')[0] : ''),
        isRepaintMode,
        clientX: e.clientX,
        clientY: e.clientY
      })
    }
  }

  // Handle Panning
  const handleMouseDown = (e: React.MouseEvent) => {
    logEvent('onMouseDown', e)
    if (isRepaintMode) {
      //   console.log('WorldCanvas: Blocked by repaint mode')
      return
    }
    if (e.button === 0) { // Left click
      setIsDragging(true)
      setLastMousePos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    // logEvent('onMouseMove', e) 
    if (isDragging) {
      const dx = e.clientX - lastMousePos.x
      const dy = e.clientY - lastMousePos.y

      setViewport({
        ...viewport,
        x: viewport.x + dx,
        y: viewport.y + dy
      })

      setLastMousePos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    logEvent('onMouseUp', e)
    setIsDragging(false)
  }

  // Handle Zooming with proper event listener (not passive)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      // Block zooming in repaint mode
      if (isRepaintMode) {
        e.preventDefault()
        return
      }

      e.preventDefault()

      const scaleChange = e.deltaY * -0.001
      const newScale = Math.max(0.1, Math.min(5, viewport.scale + scaleChange))

      // Get mouse position relative to container
      const rect = container.getBoundingClientRect()
      const mouseX = e.clientX - rect.left - rect.width / 2
      const mouseY = e.clientY - rect.top - rect.height / 2

      // Calculate how much the viewport needs to shift to keep the point under the cursor stationary
      const scaleFactor = newScale / viewport.scale
      const newViewportX = mouseX - scaleFactor * (mouseX - viewport.x)
      const newViewportY = mouseY - scaleFactor * (mouseY - viewport.y)

      setViewport({
        x: newViewportX,
        y: newViewportY,
        scale: newScale
      })
    }

    // Add event listener with passive: false to allow preventDefault
    container.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [viewport, setViewport, isRepaintMode])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignore shortcuts if typing in an input or textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // P - Enter paint mode
      if ((e.key === 'P' || e.key === 'p') && !isRepaintMode) {
        e.preventDefault()
        setRepaintMode(true)
      }

      // ESC - Exit paint mode or reject repaint
      if (e.key === 'Escape') {
        e.preventDefault()
        if (repaintResult) {
          setRepaintResult(null)
          clearRepaintStrokes()
          setDebugInfo(null)
        }
        if (isRepaintMode) {
          setRepaintMode(false)
          clearRepaintStrokes()
          setDebugInfo(null)
        }
      }

      // Enter - Apply repaint
      if (e.key === 'Enter' && repaintResult) {
        e.preventDefault()
        try {
          const { repaintService } = await import('@/domains/world-building-toolkit/services/RepaintService')
          await repaintService.applyRepaint(repaintResult)
          setRepaintResult(null)
          clearRepaintStrokes()
          setDebugInfo(null)
        } catch (error) {
          console.error('Apply repaint failed:', error)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isRepaintMode, repaintResult, setRepaintMode, setRepaintResult, clearRepaintStrokes, setDebugInfo])

  // Render Visible Tiles Logic (Optimization)
  // For now, render known tiles + immediate neighbors of known tiles
  const renderTiles = () => {
    const renderedTiles = []
    const knownCoords = new Set(Object.keys(tiles))

    // Add known tiles
    Object.values(tiles).forEach(tile => {
      renderedTiles.push(
        <Tile key={`${tile.x},${tile.y}`} x={tile.x} y={tile.y} size={TILE_SIZE} />
      )
    })

    // Add empty neighbor placeholders for potential generation
    // This logic can be refined to only show placeholders near viewport or existing tiles
    const potentialNeighbors = new Set<string>()
    Object.values(tiles).forEach(tile => {
      ;[
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ].forEach(([dx, dy]) => {
        const key = `${tile.x + dx},${tile.y + dy}`
        if (!knownCoords.has(key)) {
          potentialNeighbors.add(key)
        }
      })
    })

    // If no tiles exist, show 0,0
    if (Object.keys(tiles).length === 0) {
      potentialNeighbors.add('0,0')
    }

    potentialNeighbors.forEach(key => {
      const [x, y] = key.split(',').map(Number)
      renderedTiles.push(<Tile key={`empty-${x},${y}`} x={x} y={y} size={TILE_SIZE} />)
    })

    return renderedTiles
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-[#1a1a1a] overflow-hidden relative"
      style={{
        // Force cursor to default in repaint mode to see if browser default shows up
        cursor: isRepaintMode ? 'default' : (isDragging ? 'grabbing' : 'grab'),
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={() => setSelectedTile(null)} // Deselect on background click
    >
      <div
        className="absolute origin-center will-change-transform"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
          width: 0,
          height: 0,
          left: '50%',
          top: '50%',
        }}
      >
        {renderTiles()}
      </div>

      {/* UI Overlay for Scale */}
      <div className="absolute bottom-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-xs pointer-events-none">
        {Math.round(viewport.scale * 100)}%
      </div>

      <RepaintCanvas />
    </div>
  )
}
