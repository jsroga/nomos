import React, { useRef, useEffect, useState } from 'react'
import { useWorldStore } from '@/store/useWorldStore'
import { Tile } from './Tile'

const TILE_SIZE = 512 // Base size of a tile in pixels

export const Canvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const { tiles, viewport, setViewport, selectedTile, setSelectedTile } = useWorldStore()
  const [isDragging, setIsDragging] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })

  // Handle Panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 0) {
      // Middle or Left click
      setIsDragging(true)
      setLastMousePos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - lastMousePos.x
      const dy = e.clientY - lastMousePos.y
      setViewport({ x: viewport.x + dx, y: viewport.y + dy })
      setLastMousePos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    // Zoom logic
    const scaleAmount = -e.deltaY * 0.001
    const newZoom = Math.min(Math.max(viewport.zoom + scaleAmount, 0.1), 5)
    setViewport({ zoom: newZoom })
  }

  // Render visible tiles + surroundings
  // For now, let's just render all existing tiles + a 3x3 grid around the selected tile (or center if none)
  // Optimization: Only render tiles in viewport. For MVP, we render all + candidates.

  const renderTiles = () => {
    const renderedTiles = []
    const processedKeys = new Set<string>()

    // 1. Render existing tiles
    Object.values(tiles).forEach(tile => {
      processedKeys.add(`${tile.x},${tile.y}`)
      renderedTiles.push(
        <Tile
          key={`${tile.x},${tile.y}`}
          x={tile.x}
          y={tile.y}
          tile={tile}
          size={TILE_SIZE}
          isSelected={selectedTile?.x === tile.x && selectedTile?.y === tile.y}
          onClick={() => setSelectedTile(tile.x, tile.y)}
        />
      )
    })

    // 2. Render recommendation/empty spots around existing tiles
    // If no tiles exist, render center (0,0)
    if (Object.keys(tiles).length === 0) {
      renderedTiles.push(
        <Tile
          key="0,0"
          x={0}
          y={0}
          size={TILE_SIZE}
          isSelected={selectedTile?.x === 0 && selectedTile?.y === 0}
          onClick={() => setSelectedTile(0, 0)}
        />
      )
    } else {
      // Find all adjacent empty spots to existing tiles
      const candidates = new Set<string>()
      Object.values(tiles).forEach(tile => {
        const neighbors = [
          { x: tile.x + 1, y: tile.y },
          { x: tile.x - 1, y: tile.y },
          { x: tile.x, y: tile.y + 1 },
          { x: tile.x, y: tile.y - 1 },
        ]
        neighbors.forEach(n => {
          const key = `${n.x},${n.y}`
          if (!tiles[key]) {
            candidates.add(key)
          }
        })
      })

      candidates.forEach(key => {
        const [x, y] = key.split(',').map(Number)
        renderedTiles.push(
          <Tile
            key={key}
            x={x}
            y={y}
            size={TILE_SIZE}
            isSelected={selectedTile?.x === x && selectedTile?.y === y}
            onClick={() => setSelectedTile(x, y)}
          />
        )
      })
    }

    return renderedTiles
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-neutral-900 overflow-hidden relative cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Grid Background (Optional, for visual reference) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle, #fff 1px, transparent 1px)`,
          backgroundSize: `${TILE_SIZE * viewport.zoom}px ${TILE_SIZE * viewport.zoom}px`,
          backgroundPosition: `${viewport.x}px ${viewport.y}px`,
        }}
      />

      <div
        className="absolute origin-top-left transition-transform duration-75 ease-out"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        }}
      >
        {/* Center Marker */}
        <div className="absolute top-0 left-0 w-2 h-2 bg-red-500 rounded-full -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none" />

        {renderTiles()}
      </div>

      {/* HUD / Info */}
      <div className="absolute bottom-4 left-4 text-white/50 text-xs pointer-events-none">
        Viewport: {Math.round(viewport.x)}, {Math.round(viewport.y)} | Zoom:{' '}
        {viewport.zoom.toFixed(2)}
      </div>
    </div>
  )
}
