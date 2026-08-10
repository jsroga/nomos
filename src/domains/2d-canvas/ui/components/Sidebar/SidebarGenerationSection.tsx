import React from 'react'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { Button } from '@/components/Button'
import { SidebarSection, SidebarLabel, SidebarInput } from '@/components/DomainSidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/Tooltip'
import { Eye, EyeOff, MousePointer2, ImagePlus, Info } from 'lucide-react'
import type { WorldGenSidebarState } from '@/domains/2d-canvas/state/hooks/useWorldGenSidebar'
import { SidebarGenerationDebugPanel } from './SidebarGenerationDebugPanel'
import { SidebarGenerationActionToolbar } from './SidebarGenerationActionToolbar'

type SidebarGenerationSectionProps = Pick<
  WorldGenSidebarState,
  | 'isDebugMode'
  | 'generationDebugInfo'
  | 'showDebug'
  | 'setShowDebug'
  | 'setGenerationDebugInfo'
  | 'tilePrompt'
  | 'setTilePrompt'
  | 'selectedTiles'
  | 'tiles'
  | 'generatingTiles'
  | 'isUploading'
  | 'handleGenerate'
  | 'handleUploadTile'
  | 'handleDeleteTile'
  | 'fileInputRef'
>

export const SidebarGenerationSection: React.FC<SidebarGenerationSectionProps> = ({
  isDebugMode,
  generationDebugInfo,
  showDebug,
  setShowDebug,
  setGenerationDebugInfo,
  tilePrompt,
  setTilePrompt,
  selectedTiles,
  tiles,
  generatingTiles,
  isUploading,
  handleGenerate,
  handleUploadTile,
  handleDeleteTile,
  fileInputRef,
}) => {
  const selectedKey =
    selectedTiles.length > 0 ? `${selectedTiles[0].x},${selectedTiles[0].y}` : null
  const isGenerating = selectedKey ? Boolean(generatingTiles[selectedKey]) : false
  const hasSelectedTile = selectedTiles.length > 0
  const selectedTileExists = selectedKey ? Boolean(tiles[selectedKey]) : false

  return (
    <SidebarSection separator title="Generation" icon={<ImagePlus size={12} />}>
      {isDebugMode && generationDebugInfo && (
        <div className="flex items-center gap-2 mb-3">
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-xs gap-1 font-mono"
            onClick={() => setShowDebug(!showDebug)}
          >
            {showDebug ? <EyeOff size={12} /> : <Eye size={12} />}
            Debug
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-xs font-mono"
            onClick={() => setGenerationDebugInfo(null)}
          >
            Clear
          </Button>
        </div>
      )}

      <div className="space-y-1 mb-3" id={TOUR_STEP_IDS.WORLDGEN_PROMPT}>
        <SidebarLabel className="flex items-center gap-1">
          Tile Description
          <Tooltip>
            <TooltipTrigger asChild>
              <Info size={10} className="text-muted-foreground/60 cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Describe what should appear in this tile</p>
            </TooltipContent>
          </Tooltip>
        </SidebarLabel>
        <SidebarInput
          type="text"
          value={tilePrompt}
          onChange={e => setTilePrompt(e.target.value)}
          placeholder="e.g., church, forest, river..."
        />
      </div>

      {hasSelectedTile && (
        <div className="text-xs font-mono text-muted-foreground flex items-center gap-1 mb-3">
          <MousePointer2 size={10} />
          Selected: {selectedTiles[0].x}, {selectedTiles[0].y}
        </div>
      )}

      <SidebarGenerationActionToolbar
        hasSelectedTile={hasSelectedTile}
        selectedTileExists={selectedTileExists}
        isGenerating={isGenerating}
        isUploading={isUploading}
        onGenerate={handleGenerate}
        onUploadClick={() => fileInputRef.current?.click()}
        onDeleteTile={handleDeleteTile}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUploadTile}
        className="hidden"
      />

      {!hasSelectedTile && (
        <div className="text-[10px] text-muted-foreground text-center mb-3 opacity-60">
          Select a tile to enable generation
        </div>
      )}

      {isDebugMode && generationDebugInfo && showDebug && (
        <SidebarGenerationDebugPanel debug={generationDebugInfo} />
      )}
    </SidebarSection>
  )
}
