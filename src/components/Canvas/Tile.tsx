import React from 'react'
import { useWorldStore } from '@/store/useWorldStore'
import { cn } from '@/lib/utils'

interface TileProps {
  x: number
  y: number
  size: number
}

export const Tile: React.FC<TileProps> = ({ x, y, size }) => {
  const tile = useWorldStore(state => state.getTile(x, y))
  const selectedTile = useWorldStore(state => state.selectedTile)
  const setSelectedTile = useWorldStore(state => state.setSelectedTile)
  const currentProject = useWorldStore(state => state.currentProject)

  const isSelected = selectedTile?.x === x && selectedTile?.y === y

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedTile({ x, y })
  }

  // Construct image URL: /projects/<projectId>/<filename>
  const imageUrl =
    tile && currentProject ? `/projects/${currentProject.id}/${tile.image_filename}` : null

  return (
    <div
      className={cn(
        'absolute border border-border/20 transition-all duration-200',
        isSelected && 'border-primary border-2 z-10 shadow-[0_0_15px_rgba(var(--primary),0.5)]'
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
        <img
          src={imageUrl}
          alt={tile?.tile_prompt || 'Generated Tile'}
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full bg-card/50 flex items-center justify-center text-muted-foreground/20 text-4xl select-none hover:bg-card/80 transition-colors cursor-pointer">
          +
        </div>
      )}

      {/* Coordinates overlay for debugging/context */}
      <div className="absolute top-1 left-1 text-[10px] text-muted-foreground/50 pointer-events-none">
        {x},{y}
      </div>
    </div>
  )
}
