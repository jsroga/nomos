import React from 'react'
import { Button } from '@/components/Button'
import { SidebarSection, SidebarLabel, SidebarSliderRow } from '@/components/DomainSidebar'
import { Loader2, Sparkles } from 'lucide-react'
import type { WorldGenSidebarState } from '@/domains/2d-canvas/state/hooks/useWorldGenSidebar'
import { GoogleModelId } from '@/shared/data/constants/protocol'

type SidebarFidelitySectionProps = Pick<
  WorldGenSidebarState,
  | 'isDebugMode'
  | 'fidelityCreativity'
  | 'setFidelityCreativity'
  | 'selectedTile'
  | 'enhancingTiles'
  | 'handleEnhanceFidelity'
>

export const SidebarFidelitySection: React.FC<SidebarFidelitySectionProps> = ({
  isDebugMode,
  fidelityCreativity,
  setFidelityCreativity,
  selectedTile,
  enhancingTiles,
  handleEnhanceFidelity,
}) => {
  const isEnhancing = selectedTile
    ? Boolean(enhancingTiles[`${selectedTile.x},${selectedTile.y}`])
    : false

  return (
    <SidebarSection separator title="Enhance Fidelity" icon={<Sparkles size={12} />}>
      <div className="space-y-3">
        {isDebugMode && (
          <div className="space-y-1">
            <SidebarLabel>Provider</SidebarLabel>
            <div className="text-[11px] text-zinc-400 font-mono px-2 py-1.5 bg-zinc-900/50 border border-zinc-800 rounded-md">
              Gemini ({GoogleModelId.Gemini3ProImagePreview})
            </div>
          </div>
        )}
        <SidebarSliderRow
          label="Creativity"
          value={fidelityCreativity}
          min={0}
          max={1}
          step={0.1}
          onChange={setFidelityCreativity}
        />
        <Button
          onClick={handleEnhanceFidelity}
          variant="ghost"
          className="w-full gap-2 hover:bg-accent hover:text-accent-foreground text-primary border border-primary/40 hover:border-primary/60 font-mono"
          disabled={!selectedTile || isEnhancing}
        >
          {isEnhancing ? (
            <>
              <Loader2 className="animate-spin" size={14} />
              Enhancing...
            </>
          ) : (
            <>
              <Sparkles size={14} />
              Enhance Fidelity
            </>
          )}
        </Button>
      </div>
    </SidebarSection>
  )
}
