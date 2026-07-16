import React from 'react'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { Button } from '@/components/Button'
import { SidebarSection, SidebarLabel, SidebarSliderRow } from '@/components/DomainSidebar'
import { ZoomIn } from 'lucide-react'
import type { WorldGenSidebarState } from '@/domains/world-building-toolkit/state/hooks/useWorldGenSidebar'

type SidebarUpscaleSectionProps = Pick<
  WorldGenSidebarState,
  | 'isDebugMode'
  | 'upscaleProvider'
  | 'handleUpscaleProviderChange'
  | 'upscaleCreativity'
  | 'setUpscaleCreativity'
  | 'selectedTile'
  | 'upscalingTiles'
  | 'handleUpscale'
>

export const SidebarUpscaleSection: React.FC<SidebarUpscaleSectionProps> = ({
  isDebugMode,
  upscaleProvider,
  handleUpscaleProviderChange,
  upscaleCreativity,
  setUpscaleCreativity,
  selectedTile,
  upscalingTiles,
  handleUpscale,
}) => {
  const isUpscaling = selectedTile
    ? Boolean(upscalingTiles[`${selectedTile.x},${selectedTile.y}`])
    : false

  return (
    <SidebarSection separator title="Upscale" icon={<ZoomIn size={12} />}>
      <div className="space-y-3">
        {isDebugMode && (
          <div className="space-y-1">
            <SidebarLabel>Provider</SidebarLabel>
            <select
              value={upscaleProvider}
              onChange={e => handleUpscaleProviderChange(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-md py-1.5 px-2 text-[11px] text-zinc-300 font-mono focus:border-indigo-500/50 focus:outline-none"
            >
              <option value="stability">Stability AI (4k)</option>
              <option value="replicate">Replicate (Creative)</option>
              <option value="midjourney">Midjourney (LegNext)</option>
            </select>
          </div>
        )}
        <SidebarSliderRow
          label="Creativity"
          value={upscaleCreativity}
          min={0}
          max={1}
          step={0.1}
          onChange={setUpscaleCreativity}
        />
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
      </div>
    </SidebarSection>
  )
}
