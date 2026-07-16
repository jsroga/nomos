import React from 'react'
import { Loader2 } from 'lucide-react'
import {
  TILE_STAGE_LABELS,
  TileProgressLabel,
} from '@/domains/world-building-toolkit/ui/constants/tile-stage-labels'

interface TileProgressOverlayProps {
  tileProgressData?: { progress: number; stage: string }
  empty?: boolean
}

export const TileProgressOverlay: React.FC<TileProgressOverlayProps> = ({
  tileProgressData,
  empty,
}) => {
  const progress = tileProgressData?.progress ?? 0
  const stage = tileProgressData?.stage ?? ''
  const label =
    TILE_STAGE_LABELS[stage] ?? (stage ? stage.replace(/_/g, ' ') : TileProgressLabel.Starting)
  const barWidth = Math.max(progress, progress > 0 ? 4 : 0)

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 gap-2">
      <Loader2 className="animate-spin text-white" size={empty ? 28 : 32} />

      {label && (
        <span className="text-[11px] font-mono font-semibold text-white uppercase tracking-widest leading-none drop-shadow">
          {label}
        </span>
      )}

      <div className="w-3/4 flex flex-col items-center gap-1">
        <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out shadow-[0_0_6px_hsl(var(--primary))]"
            style={{ width: `${barWidth}%` }}
          />
        </div>
        {progress > 0 && (
          <span className="text-[10px] font-mono text-white/70 tabular-nums">{progress}%</span>
        )}
      </div>
    </div>
  )
}
