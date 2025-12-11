/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface TileProps {
  x: number
  y: number
  size: number
}

export const Tile: React.FC<TileProps> = ({ x, y, size }) => {
  // IMPORTANT: Access tiles directly, not via getTile(), so Zustand tracks the dependency
  const tile = useWorldStore(state => state.tiles[`${x},${y}`])
  const selectedTiles = useWorldStore(state => state.selectedTiles)
  const toggleTileSelection = useWorldStore(state => state.toggleTileSelection)
  const currentProject = useWorldStore(state => state.currentProject)
  const generatingTiles = useWorldStore(state => state.generatingTiles)
  const upscalingTiles = useWorldStore(state => state.upscalingTiles)
  const repaintingTiles = useWorldStore(state => state.repaintingTiles)
  const enhancingTiles = useWorldStore(state => state.enhancingTiles)

  const isSelected = selectedTiles.some(t => t.x === x && t.y === y)
  const isGenerating = !!generatingTiles[`${x},${y}`]
  const isUpscaling = !!upscalingTiles[`${x},${y}`]
  const isRepainting = !!repaintingTiles[`${x},${y}`]
  const isEnhancing = !!enhancingTiles[`${x},${y}`]

  const isSelectMode = useWorldStore(state => state.isSelectMode)

  const handleClick = (e: React.MouseEvent) => {
    if (isSelectMode) {
      // Allow propagation to WorldCanvas for point addition
      return
    }

    e.stopPropagation()

    // Single selection only
    useWorldStore.getState().setSelectedTile({ x, y })
  }

  // Construct image URL: /projects/<projectId>/<filename>
  const [imgSrc, setImgSrc] = React.useState<string | null>(null)
  const [retryCount, setRetryCount] = React.useState(0)

  // Track filename to add cache-busting when it changes
  const filename = tile?.image_filename

  React.useEffect(() => {
    if (tile && currentProject && filename) {
      // Always add timestamp to prevent caching when filename changes
      const suffix = `?t=${Date.now()}`
      // Check if filename is already a full URL (e.g., from Vercel Blob)
      if (filename.startsWith('http://') || filename.startsWith('https://')) {
        setImgSrc(`${filename}${filename.includes('?') ? '&' : '?'}t=${Date.now()}`)
      } else {
        setImgSrc(`/projects/${currentProject.id}/${filename}${suffix}`)
      }
      // Reset retry count when filename changes
      setRetryCount(0)
    } else {
      setImgSrc(null)
    }
  }, [tile, currentProject, filename, retryCount])

  const handleImageError = () => {
    // Retry loading image a few times (helps if file system is slow to write)
    if (retryCount < 5) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1)
      }, 1000 * (retryCount + 1))
    }
  }

  return (
    <div
      className={cn(
        'absolute border border-border/20 transition-all duration-200',
        isSelected && 'border-primary border-2 z-10 shadow-[0_0_15px_rgba(var(--primary),0.5)]',
        isGenerating && 'border-yellow-500 border-2',
        isUpscaling && 'border-orange-500 border-2',
        isRepainting && 'border-purple-500 border-2',
        isEnhancing && 'border-violet-500 border-2'
      )}
      style={{
        width: size,
        height: size,
        left: x * size,
        top: y * size,
      }}
      onClick={handleClick}
    >
      {imgSrc ? (
        <>
          <img
            src={imgSrc}
            alt={`Tile at ${x},${y}`}
            className={cn(
              'w-full h-full object-cover',
              (isGenerating || isUpscaling || isRepainting || isEnhancing) && 'opacity-50'
            )}
            draggable={false}
            onError={handleImageError}
          />
          {(isGenerating || isUpscaling || isRepainting || isEnhancing) && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Loader2 className="animate-spin text-white" size={32} />
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full bg-[#282828] flex items-center justify-center text-muted-foreground/40 text-4xl select-none hover:bg-[#333333] transition-colors cursor-pointer">
          {isGenerating ? <Loader2 className="animate-spin text-primary" size={32} /> : '+'}
        </div>
      )}

      {/* Coordinates overlay for debugging/context */}
      <div className="absolute top-1 left-1 text-[10px] text-muted-foreground/50 pointer-events-none">
        {x},{y}
      </div>
    </div>
  )
}
