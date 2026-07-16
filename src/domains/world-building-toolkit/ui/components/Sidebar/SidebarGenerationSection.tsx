import React from 'react'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { Button } from '@/components/Button'
import { SidebarSection, SidebarLabel, SidebarInput } from '@/components/DomainSidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/Tooltip'
import {
  Loader2,
  Eye,
  EyeOff,
  Upload,
  Sparkles,
  MousePointer2,
  ImagePlus,
  Info,
  Trash2,
} from 'lucide-react'
import type { WorldGenSidebarState } from '@/domains/world-building-toolkit/state/hooks/useWorldGenSidebar'
import { SidebarGenerationDebugPanel } from './SidebarGenerationDebugPanel'

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

      <div className="flex gap-2 mb-3">
        <div id={TOUR_STEP_IDS.WORLDGEN_GENERATE} className="flex-1">
          <Button
            variant="ghost"
            onClick={handleGenerate}
            disabled={!hasSelectedTile || isGenerating || isUploading}
            className="group w-full gap-2 text-purple-400 border border-purple-500/40 hover:bg-purple-500 hover:text-white hover:border-purple-500 font-mono disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isGenerating ? (
              <>
                <Loader2
                  className="animate-spin text-purple-400 group-hover:text-white transition-colors duration-200"
                  size={14}
                />
                <span className="text-purple-400 group-hover:text-white transition-colors duration-200">
                  Generate
                </span>
              </>
            ) : (
              <>
                <Sparkles
                  className="text-purple-400 group-hover:text-white transition-colors duration-200"
                  size={14}
                />
                <span className="text-purple-400 group-hover:text-white transition-colors duration-200">
                  Generate
                </span>
              </>
            )}
          </Button>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={!hasSelectedTile || isGenerating || isUploading}
              size="icon"
              className="disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Upload image</p>
          </TooltipContent>
        </Tooltip>

        {hasSelectedTile && selectedTileExists && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={handleDeleteTile}
                disabled={isGenerating}
                size="icon"
                className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Delete tile</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

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
