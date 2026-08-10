import React from 'react'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { Button } from '@/components/Button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/Tooltip'
import { Loader2, Upload, Sparkles, Trash2 } from 'lucide-react'

interface SidebarGenerationActionToolbarProps {
  hasSelectedTile: boolean
  selectedTileExists: boolean
  isGenerating: boolean
  isUploading: boolean
  onGenerate: () => void
  onUploadClick: () => void
  onDeleteTile: () => void
}

export const SidebarGenerationActionToolbar: React.FC<SidebarGenerationActionToolbarProps> = ({
  hasSelectedTile,
  selectedTileExists,
  isGenerating,
  isUploading,
  onGenerate,
  onUploadClick,
  onDeleteTile,
}) => (
  <div className="flex gap-2 mb-3">
    <div id={TOUR_STEP_IDS.WORLDGEN_GENERATE} className="flex-1">
      <Button
        variant="ghost"
        onClick={onGenerate}
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
          onClick={onUploadClick}
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
            onClick={onDeleteTile}
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
)
