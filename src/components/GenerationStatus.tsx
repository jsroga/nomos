import React from 'react'
import { useWorldStore } from '@/store/useWorldStore'
import { Loader2 } from 'lucide-react'

export const GenerationStatus: React.FC = () => {
  const generatingTiles = useWorldStore(state => state.generatingTiles)
  const generatingCount = Object.keys(generatingTiles).length

  if (generatingCount === 0) return null

  return (
    <div className="fixed top-4 right-4 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-3 z-50 min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <Loader2 className="animate-spin text-primary" size={16} />
        <span className="text-sm font-medium">
          Generating {generatingCount} tile{generatingCount > 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-1 max-h-[200px] overflow-y-auto">
        {Object.values(generatingTiles).map(tile => (
          <div
            key={`${tile.x},${tile.y}`}
            className="text-xs text-muted-foreground flex items-center gap-2 py-1"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span>Tile ({tile.x}, {tile.y})</span>
            <span className="ml-auto text-[10px]">
              {Math.floor((Date.now() - tile.startTime) / 1000)}s
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
