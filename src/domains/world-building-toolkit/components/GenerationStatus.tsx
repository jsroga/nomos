import React from 'react'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { Loader2 } from 'lucide-react'

export const GenerationStatus: React.FC = () => {
  const generatingTiles = useWorldStore(state => state.generatingTiles)
  const upscalingTiles = useWorldStore(state => state.upscalingTiles)
  const repaintingTiles = useWorldStore(state => state.repaintingTiles)

  const generatingCount = Object.keys(generatingTiles).length
  const upscalingCount = Object.keys(upscalingTiles).length
  const repaintingCount = Object.keys(repaintingTiles).length
  const totalCount = generatingCount + upscalingCount + repaintingCount

  if (totalCount === 0) return null

  return (
    <div className="fixed top-4 right-4 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-3 z-50 min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <Loader2 className="animate-spin text-primary" size={16} />
        <span className="text-sm font-medium">
          {totalCount} operation{totalCount > 1 ? 's' : ''} in progress
        </span>
      </div>
      <div className="space-y-1 max-h-[200px] overflow-y-auto">
        {/* Generating Tiles */}
        {Object.values(generatingTiles).map(tile => (
          <div
            key={`gen-${tile.x},${tile.y}`}
            className="text-xs flex items-center gap-2 py-1"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
            <span className="text-yellow-500">Generating</span>
            <span className="text-muted-foreground">({tile.x}, {tile.y})</span>
          </div>
        ))}

        {/* Upscaling Tiles */}
        {Object.values(upscalingTiles).map(tile => (
          <div
            key={`up-${tile.x},${tile.y}`}
            className="text-xs flex items-center gap-2 py-1"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-orange-500">Upscaling</span>
            <span className="text-muted-foreground">({tile.x}, {tile.y})</span>
          </div>
        ))}

        {/* Repainting Tiles */}
        {Object.values(repaintingTiles).map(tile => (
          <div
            key={`rep-${tile.x},${tile.y}`}
            className="text-xs flex items-center gap-2 py-1"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
            <span className="text-purple-500">Repainting</span>
            <span className="text-muted-foreground">({tile.x}, {tile.y})</span>
          </div>
        ))}
      </div>
    </div>
  )
}
