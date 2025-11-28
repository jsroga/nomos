import React, { useRef, useState, useEffect } from 'react'
import { useWorldStore } from '@/store/useWorldStore'
import { Tile } from './Tile'

const TILE_SIZE = 512

export const WorldCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })

  const viewport = useWorldStore(state => state.viewport)
  const setViewport = useWorldStore(state => state.setViewport)
  const tiles = useWorldStore(state => state.tiles)
  const setSelectedTile = useWorldStore(state => state.setSelectedTile)

  // Handle Panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 0) {
      // Middle or Left click for pan
      setIsDragging(true)
      setLastMousePos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - lastMousePos.x
      const dy = e.clientY - lastMousePos.y
      setViewport({
        ...viewport,
        x: viewport.x + dx,
        y: viewport.y + dy,
      })
      setLastMousePos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Handle Zooming with proper event listener (not passive)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const scaleAmount = -e.deltaY * 0.001
      const newScale = Math.min(Math.max(0.1, viewport.scale + scaleAmount), 5)
      setViewport({ ...viewport, scale: newScale })
    }

    // Add event listener with passive: false to allow preventDefault
    container.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [viewport, setViewport])

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
      className="w-full h-full bg-[#1a1a1a] overflow-hidden cursor-grab active:cursor-grabbing relative"
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
    </div>
  )
}
