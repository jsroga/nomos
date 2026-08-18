import React from 'react'
import { useWorldStore } from '@/domains/2d-canvas'
import { AlertCircle } from 'lucide-react'
import { useTileViewState } from '@/domains/2d-canvas/ui/components/Canvas/use-tile-view-state'
import {
  resolveTileImageSrc,
  tileBorderClassName,
} from '@/domains/2d-canvas/ui/components/Canvas/tile-view-utils'
import { TileProgressOverlay } from './TileProgressOverlay'
import { TileBorderClass } from '@/domains/2d-canvas/ui/constants/tile-view-styles'

interface TileProps {
  x: number
  y: number
  size: number
}

export const Tile: React.FC<TileProps> = React.memo(function Tile({ x, y, size }) {
  const {
    tile,
    currentProject,
    tileError,
    tileProgressData,
    isSelectMode,
    isSelected,
    isGenerating,
    isUpscaling,
    isRepainting,
    isEnhancing,
    isBusy,
  } = useTileViewState(x, y)

  const handleClick = (e: React.MouseEvent) => {
    if (isSelectMode) return
    e.stopPropagation()
    useWorldStore.getState().setSelectedTile({ x, y })
  }

  const filename = tile?.image_filename
  const [retryCount, setRetryCount] = React.useState(0)
  const imgSrc = React.useMemo(
    () => resolveTileImageSrc(filename, currentProject?.id, retryCount),
    [filename, currentProject?.id, retryCount],
  )

  React.useEffect(() => {
    setRetryCount(0)
  }, [filename])

  const handleImageError = () => {
    if (retryCount < 5) {
      setTimeout(() => setRetryCount(prev => prev + 1), 1000 * (retryCount + 1))
    }
  }

  return (
    <div
      className={tileBorderClassName({
        isSelected,
        isGenerating,
        isUpscaling,
        isRepainting,
        isEnhancing,
        tileError,
      })}
      style={{
        width: size,
        height: size,
        left: x * size,
        top: y * size,
      }}
      onClick={handleClick}
    >
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={`Tile at ${x},${y}`}
          className="w-full h-full object-cover"
          draggable={false}
          onError={handleImageError}
        />
      ) : (
        <div className="w-full h-full bg-[#282828] flex items-center justify-center text-muted-foreground/40 text-4xl select-none hover:bg-[#333333] transition-colors cursor-pointer">
          +
        </div>
      )}

      {tileError && !isBusy && (
        <div
          className="absolute top-1 right-1 z-20 rounded-full bg-red-500 p-0.5 cursor-help"
          title={tileError}
        >
          <AlertCircle className="text-white" size={14} />
        </div>
      )}

      <div className="absolute top-1 left-1 text-[10px] text-muted-foreground/50 pointer-events-none">
        {x},{y}
      </div>

      {isBusy ? (
        <TileProgressOverlay tileProgressData={tileProgressData} empty={!imgSrc} />
      ) : null}

      {isBusy ? <div className={TileBorderClass.RingBusy} /> : isSelected ? <div className={TileBorderClass.Ring} /> : null}
    </div>
  )
})
