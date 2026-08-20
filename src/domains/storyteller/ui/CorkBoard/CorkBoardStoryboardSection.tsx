import React, { useState } from 'react'
import { Button } from '@/components/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/DropdownMenu'
import { ChevronDown, Loader2, Sparkles, Video } from 'lucide-react'
import type { ApiframeVideoModel } from '@/shared/ai/constants/apiframe'
import {
  isStoryboardVideoPreset,
  STORYBOARD_VIDEO_PRESETS,
  StoryboardVideoPreset,
  storyboardVideoFromPreset,
  type StoryboardVideoLook,
} from '@/shared/ai/storyboard-video-env'
import { HtmlElementType } from '@/shared/data/constants/protocol'
import {
  CorkBoardCopy,
  CorkBoardUrlScheme,
  corkBoardVideoPresetLabel,
} from './constants/cork-board'
import { isStoryboardVideoUrl, storyboardEmptyCopy } from './storyboard-media'

interface CorkBoardStoryboardSectionProps {
  storyboardUrl?: string | null
  isGeneratingCombined?: boolean
  onGenerateCombined?: (model: ApiframeVideoModel, look: StoryboardVideoLook) => void
  beatCount: number
  hasBeatImages: boolean
  onExpandStoryboard: () => void
  getUrl: (url: string | null) => string
}

export const CorkBoardStoryboardSection: React.FC<CorkBoardStoryboardSectionProps> = ({
  storyboardUrl,
  isGeneratingCombined,
  onGenerateCombined,
  beatCount,
  hasBeatImages,
  onExpandStoryboard,
  getUrl,
}) => {
  const [videoPreset, setVideoPreset] = useState<StoryboardVideoPreset>(
    StoryboardVideoPreset.KlingStoryboard,
  )
  const hasBeats = beatCount > 0
  const canGenerate = hasBeats && hasBeatImages
  const isVideo = isStoryboardVideoUrl(storyboardUrl)
  const mediaUrl = storyboardUrl ? getUrl(storyboardUrl) : ''
  const buttonLabel = isGeneratingCombined
    ? CorkBoardCopy.Generating
    : storyboardUrl
      ? CorkBoardCopy.CombinedRegenerate
      : CorkBoardCopy.CombinedGenerate
  const controlsDisabled = isGeneratingCombined || !canGenerate

  return (
    <div className="grid grid-cols-1 gap-4 mb-6">
      <div className="bg-card border border-border rounded-md p-4 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-mono text-[11px] font-medium uppercase tracking-widest text-foreground flex items-center gap-2">
              <Video className="w-3.5 h-3.5 text-primary" />
              {CorkBoardCopy.CombinedHeading}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1">
              {CorkBoardCopy.CombinedSubtitle}
            </p>
          </div>
          {onGenerateCombined && (
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild disabled={controlsDisabled}>
                  <Button
                    type={HtmlElementType.Button}
                    variant="outline"
                    size="sm"
                    disabled={controlsDisabled}
                    aria-label={CorkBoardCopy.VideoModelMenu}
                    className="gap-1 rounded-md"
                  >
                    {corkBoardVideoPresetLabel(videoPreset)}
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuRadioGroup
                    value={videoPreset}
                    onValueChange={value => {
                      if (isStoryboardVideoPreset(value)) setVideoPreset(value)
                    }}
                  >
                    {STORYBOARD_VIDEO_PRESETS.map(preset => (
                      <DropdownMenuRadioItem key={preset} value={preset}>
                        {corkBoardVideoPresetLabel(preset)}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const selected = storyboardVideoFromPreset(videoPreset)
                  onGenerateCombined(selected.model, selected.look)
                }}
                disabled={controlsDisabled}
                className="gap-2 rounded-md"
              >
                {isGeneratingCombined ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                {buttonLabel}
              </Button>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-[200px] flex items-center justify-center bg-muted/30 rounded-md border border-border relative overflow-hidden group">
          {isVideo && mediaUrl ? (
            <video
              src={mediaUrl}
              controls
              playsInline
              className="w-full h-full object-cover"
            />
          ) : storyboardUrl ? (
            <div onClick={onExpandStoryboard} className="cursor-zoom-in w-full h-full">
              <img
                src={mediaUrl}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                alt={CorkBoardCopy.CombinedHeading}
              />
            </div>
          ) : (
            <div className="text-center text-muted-foreground text-xs p-4">
              {storyboardEmptyCopy({ hasBeats, hasBeatImages })}
            </div>
          )}
          {isGeneratingCombined ? (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex flex-col items-center justify-center z-10">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <p className="text-xs text-muted-foreground mt-2">
                {CorkBoardCopy.Generating}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export const resolveCorkBoardUrl = (url: string | null, projectId: string): string => {
  if (!url) return ''
  if (url.startsWith(CorkBoardUrlScheme.Http) || url.startsWith('/')) return url
  if (url.startsWith('projects/')) return `/${url}`
  return `/projects/${projectId}/${url}`
}
