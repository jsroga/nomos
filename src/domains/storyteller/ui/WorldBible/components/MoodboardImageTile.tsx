import React from 'react'
import { Sparkles, Star, Loader2, Trash2, Plus } from 'lucide-react'
import { StorytellerImage } from '../../StorytellerImage'
import { BibleOverviewMoodboardCopy } from '../constants/bible-overview'
import { resolveMoodboardImageUrl } from '../utils/bible-overview-moodboard'
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
  progressPercent: string | null
  legnextFromServer: boolean
  displayMoodImages: string[]
  providerConfig: Record<string, unknown>
  onSetPrimaryImage: (index: number) => void
  onRefetchMoodboardData: () => Promise<void>
  confirmDelete: () => Promise<boolean>
}

export const MoodboardImageTile: React.FC<MoodboardImageTileProps> = ({
  imagePath,
  index,
  projectId,
  isPrimary,
  isLoading,
  isReadOnly,
  isGenerating,
  progressPercent,
  legnextFromServer,
  displayMoodImages,
  providerConfig,
  onSetPrimaryImage,
  onRefetchMoodboardData,
  confirmDelete,
}) => {
  const imageUrl = resolveMoodboardImageUrl(imagePath, projectId)
  const loadingLabel = progressPercent
    ? `${progressPercent}%`
    : BibleOverviewMoodboardCopy.Generating

  return (
    <StorytellerImage
      src={imageUrl}
      alt={`Mood ${index + 1}`}
      isLoading={isLoading}
      isPrimary={isPrimary}
      className="group relative"
      emptyLabel={isLoading ? loadingLabel : BibleOverviewMoodboardCopy.NoImage}
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
                  isGenerating,
                  config: providerConfig,
                  legnextFromServer,
                  promptIndex: index,
                  onRefetchMoodboardData,
                })
              }}
              disabled={isGenerating}
              className={`p-2 rounded-full text-white transition-colors ${isGenerating ? 'bg-pink-500/50 cursor-not-allowed' : 'bg-pink-500/80 hover:bg-pink-500 backdrop-blur-md'}`}
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
      {isPrimary ? (
        <div className="absolute top-1 left-1 z-20">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 drop-shadow-md" />
        </div>
      ) : null}
      {isLoading ? (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex flex-col items-center justify-center z-30">
          <Loader2 className="w-8 h-8 text-pink-500 animate-spin mb-2" />
          <span className="text-xs font-bold text-pink-500">{loadingLabel}</span>
        </div>
      ) : null}
    </StorytellerImage>
  )
}

interface MoodboardAddTileProps {
  isReadOnly: boolean
  isGenerating: boolean
  isAddingNew: boolean
  progressPercent: string | null
  projectId: string
  legnextFromServer: boolean
  nextIndex: number
  providerConfig: Record<string, unknown>
  onRefetchMoodboardData: () => Promise<void>
}

export const MoodboardAddTile: React.FC<MoodboardAddTileProps> = ({
  isReadOnly,
  isGenerating,
  isAddingNew,
  progressPercent,
  projectId,
  legnextFromServer,
  nextIndex,
  providerConfig,
  onRefetchMoodboardData,
}) => {
  if (isReadOnly) {
    return null
  }

  return (
    <button
      onClick={async () => {
        await addMoodboardImage({
          projectId,
          isGenerating,
          config: providerConfig,
          legnextFromServer,
          nextIndex,
          onRefetchMoodboardData,
        })
      }}
      disabled={isGenerating}
      className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all ${isGenerating
        ? 'border-muted-foreground/20 bg-muted/5 cursor-not-allowed opacity-50'
        : 'border-pink-500/30 bg-pink-500/5 hover:border-pink-500/60 hover:bg-pink-500/10 cursor-pointer'
        }`}
      title="Add new moodboard image"
    >
      {isAddingNew ? (
        <div className="flex flex-col items-center gap-2 animate-pulse">
          <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
          <span className="text-[10px] text-pink-400 font-medium">
            {progressPercent ? `${progressPercent}%` : BibleOverviewMoodboardCopy.Generating}
          </span>
        </div>
      ) : (
        <>
          <Plus
            className={`w-8 h-8 ${isGenerating ? 'text-muted-foreground/30' : 'text-pink-500/60'}`}
          />
          <span className={`text-xs ${isGenerating ? 'text-muted-foreground/30' : 'text-pink-500/60'}`}>
            Add Image
          </span>
        </>
      )}
    </button>
  )
}
