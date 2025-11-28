import React from 'react'
import { useWorldStore } from '@/store/useWorldStore'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface TileProps {
  x: number
  y: number
  size: number
}

export const Tile: React.FC<TileProps> = ({ x, y, size }) => {
  const tile = useWorldStore(state => state.getTile(x, y))
  const selectedTiles = useWorldStore(state => state.selectedTiles)
  const toggleTileSelection = useWorldStore(state => state.toggleTileSelection)
  const currentProject = useWorldStore(state => state.currentProject)
  const generatingTiles = useWorldStore(state => state.generatingTiles)

  const isSelected = selectedTiles.some(t => t.x === x && t.y === y)
  const isGenerating = !!generatingTiles[`${x},${y}`]

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Single selection only
    useWorldStore.getState().setSelectedTile({ x, y })
  }

  // Construct image URL: /projects/<projectId>/<filename>
  const imageUrl =
    tile && currentProject ? `/projects/${currentProject.id}/${tile.image_filename}` : null

  return (
    <div
      className={cn(
        'absolute border border-border/20 transition-all duration-200',
        isSelected && 'border-primary border-2 z-10 shadow-[0_0_15px_rgba(var(--primary),0.5)]',
        isGenerating && 'border-yellow-500 border-2'
      )}
      style={{
        width: size,
        height: size,
        left: x * size,
        top: y * size,
      }}
      onClick={handleClick}
    >
      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt={tile?.tile_prompt || 'Generated Tile'}
            className={cn(
              'w-full h-full object-cover',
              isGenerating && 'opacity-50'
            )}
            draggable={false}
          />
          {isGenerating && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Loader2 className="animate-spin text-white" size={32} />
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full bg-card/50 flex items-center justify-center text-muted-foreground/20 text-4xl select-none hover:bg-card/80 transition-colors cursor-pointer">
          {isGenerating ? (
            <Loader2 className="animate-spin text-primary" size={32} />
          ) : (
            '+'
          )}
        </div>
      )}

      {/* Coordinates overlay for debugging/context */}
      <div className="absolute top-1 left-1 text-[10px] text-muted-foreground/50 pointer-events-none">
        {x},{y}
      </div>
    </div>
  )
}
