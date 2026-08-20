import React from 'react'
import { Sparkles, Star, Trash2, Plus, Loader2 } from 'lucide-react'
import { StorytellerImage } from '../../StorytellerImage'
import { BibleOverviewMoodboardCopy } from '../constants/bible-overview'
import {
  moodboardImageAlt,
  moodboardImageClickHandler,
  resolveMoodboardImageUrl,
} from '../utils/bible-overview-moodboard'
import { formatMoodboardGeneratingCopy } from '@/domains/storyteller/services/constants/moodboard-generation-service'
import {
  addMoodboardImage,
  regenerateMoodboardImage,
  removeMoodboardImage,
} from '../utils/bible-overview-moodboard-actions'

interface MoodboardImageTileProps {
  imagePath: string
  index: number
  projectId: string
  isPrimary: boolean
  isLoading: boolean
  isReadOnly: boolean
  isGenerating: boolean
  isFullBoardGenerating: boolean
  progressPercent: string | null
  displayMoodImages: string[]
  providerConfig: Record<string, unknown>
  hasOverviewContext: boolean
  onSetPrimaryImage: (index: number) => void
  onRefetchMoodboardData: () => Promise<void>
  confirmDelete: () => Promise<boolean>
  onExpand?: (index: number) => void
}

export const MoodboardImageTile: React.FC<MoodboardImageTileProps> = ({
  imagePath,
  index,
  projectId,
  isPrimary,
  isLoading,
  isReadOnly,
  isGenerating,
  isFullBoardGenerating,
  progressPercent,
  displayMoodImages,
  providerConfig,
  hasOverviewContext,
  onSetPrimaryImage,
  onRefetchMoodboardData,
  confirmDelete,
  onExpand,
}) => {
  const generateDisabled = isLoading || isFullBoardGenerating
  const imageUrl = resolveMoodboardImageUrl(imagePath, projectId)

  return (
    <StorytellerImage
      src={imageUrl}
      alt={moodboardImageAlt(index)}
      isLoading={isLoading}
      isPrimary={isPrimary}
      className="group relative"
      emptyLabel={
        isLoading
          ? formatMoodboardGeneratingCopy(progressPercent)
          : BibleOverviewMoodboardCopy.NoImage
      }
      onImageClick={moodboardImageClickHandler(onExpand, isLoading, index)}
      overlay={
        !isReadOnly && !isLoading ? (
          <div className="flex gap-2">
            <button
              onClick={e => {
                e.stopPropagation()
                onSetPrimaryImage(index)
              }}
              className={`p-2 rounded-full transition-colors ${isPrimary ? 'bg-yellow-400 text-black' : 'bg-white/20 hover:bg-yellow-400 text-white hover:text-black backdrop-blur-md'}`}
              title={isPrimary ? 'Remove as primary' : 'Set as primary background'}
            >
              <Star size={16} className={isPrimary ? 'fill-current' : ''} />
            </button>
            <button
              onClick={async e => {
                e.stopPropagation()
                await regenerateMoodboardImage({
                  projectId,
                  isGenerating: generateDisabled,
                  hasOverviewContext,
                  config: providerConfig,
                  promptIndex: index,
                  onRefetchMoodboardData,
                })
              }}
              disabled={generateDisabled}
              className={`p-2 rounded-full text-white transition-colors ${generateDisabled ? 'bg-pink-500/50 cursor-not-allowed' : 'bg-pink-500/80 hover:bg-pink-500 backdrop-blur-md'}`}
              title="Regenerate"
            >
              <Sparkles size={16} />
            </button>
            <button
              onClick={async e => {
                e.stopPropagation()
                await removeMoodboardImage({
                  projectId,
                  isGenerating,
                  displayMoodImages,
                  imageIndex: index,
                  confirmDelete,
                  onRefetchMoodboardData,
                })
              }}
              disabled={isGenerating}
              className={`p-2 rounded-full text-white transition-all shadow-md ${isGenerating
                ? 'bg-red-500/30 cursor-not-allowed'
                : 'bg-red-500/80 hover:bg-red-500 hover:scale-110 active:scale-95 backdrop-blur-md'
                }`}
              title="Remove"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ) : undefined
      }
    >
      {isPrimary && !isLoading ? (
        <div className="absolute top-1 left-1 z-20">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 drop-shadow-md" />
        </div>
      ) : null}
    </StorytellerImage>
  )
}

interface MoodboardAddTileProps {
  isReadOnly: boolean
  isFullBoardGenerating: boolean
  isAddingNew: boolean
  progressPercent: string | null
  projectId: string
  nextIndex: number
  providerConfig: Record<string, unknown>
  hasOverviewContext: boolean
  onRefetchMoodboardData: () => Promise<void>
}

export const MoodboardAddTile: React.FC<MoodboardAddTileProps> = ({
  isReadOnly,
  isFullBoardGenerating,
  isAddingNew,
  progressPercent,
  projectId,
  nextIndex,
  providerConfig,
  hasOverviewContext,
  onRefetchMoodboardData,
}) => {
  const addDisabled = isAddingNew || isFullBoardGenerating

  if (isReadOnly) {
    return null
  }

  return (
    <button
      onClick={async () => {
        await addMoodboardImage({
          projectId,
          isGenerating: addDisabled,
          hasOverviewContext,
          config: providerConfig,
          nextIndex,
          onRefetchMoodboardData,
        })
      }}
      disabled={addDisabled}
      className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all ${addDisabled
        ? 'border-muted-foreground/20 bg-muted/5 cursor-not-allowed opacity-50'
        : 'border-pink-500/30 bg-pink-500/5 hover:border-pink-500/60 hover:bg-pink-500/10 cursor-pointer'
        }`}
      title="Add new moodboard image"
    >
      {isAddingNew ? (
        <>
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {formatMoodboardGeneratingCopy(progressPercent)}
          </span>
        </>
      ) : (
        <>
          <Plus
            className={`w-8 h-8 ${addDisabled ? 'text-muted-foreground/30' : 'text-pink-500/60'}`}
          />
          <span className={`text-xs ${addDisabled ? 'text-muted-foreground/30' : 'text-pink-500/60'}`}>
            Add Image
          </span>
        </>
      )}
    </button>
  )
}
