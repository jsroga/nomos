import React from 'react'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { Button } from '@/components/Button'
import { SidebarSection } from '@/components/DomainSidebar'
import { ZoomIn } from 'lucide-react'
import type { WorldGenSidebarState } from '@/domains/2d-canvas/state/hooks/useWorldGenSidebar'

type SidebarUpscaleSectionProps = Pick<
  WorldGenSidebarState,
  'selectedTile' | 'upscalingTiles' | 'handleUpscale'
>

export const SidebarUpscaleSection: React.FC<SidebarUpscaleSectionProps> = ({
  selectedTile,
  upscalingTiles,
  handleUpscale,
}) => {
  const isUpscaling = selectedTile
    ? Boolean(upscalingTiles[`${selectedTile.x},${selectedTile.y}`])
    : false

  return (
    <SidebarSection separator title="Upscale" icon={<ZoomIn size={12} />}>
      <div id={TOUR_STEP_IDS.WORLDGEN_UPSCALE}>
        <Button
          variant="ghost"
          className="w-full gap-2 hover:bg-accent hover:text-accent-foreground text-primary border border-primary/40 hover:border-primary/60 font-mono"
          onClick={handleUpscale}
          disabled={!selectedTile || isUpscaling}
        >
          <ZoomIn size={14} />
          Upscale (4x)
        </Button>
      </div>
    </SidebarSection>
  )
}
