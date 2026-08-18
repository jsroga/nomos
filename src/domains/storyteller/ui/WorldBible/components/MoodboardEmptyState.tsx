import React from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { BibleOverviewMoodboardCopy } from '../constants/bible-overview'
import { clampProgressBarWidth } from '../utils/bible-overview-moodboard'
import { generateInitialMoodboard } from '../utils/bible-overview-moodboard-actions'
import { useStorytellerChatBusy } from '@/domains/storyteller/state/hooks/useStorytellerChatBusy'

interface MoodboardEmptyStateProps {
  isReadOnly: boolean
  isGenerating: boolean
  isAddingNew: boolean
  progressPercent: string | null
  projectId: string
  legnextFromServer: boolean
  hasWorldDescription: boolean
  getProviderConfig: () => Record<string, unknown>
  onRefetchMoodboardData: () => Promise<void>
}

export const MoodboardEmptyState: React.FC<MoodboardEmptyStateProps> = ({
  isReadOnly,
  isGenerating,
  isAddingNew,
  progressPercent,
  projectId,
  legnextFromServer,
  hasWorldDescription,
  getProviderConfig,
  onRefetchMoodboardData,
}) => {
  const isChatBusy = useStorytellerChatBusy()
  const generateDisabled = isGenerating || isChatBusy

  return (
    <div className="space-y-3">
      <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
        {BibleOverviewMoodboardCopy.NoMoodVisuals}
      </div>
      {!isReadOnly ? (
        <button
          onClick={async () => {
            await generateInitialMoodboard({
              projectId,
              isGenerating: generateDisabled,
              hasWorldDescription,
              config: getProviderConfig(),
              legnextFromServer,
              onRefetchMoodboardData,
            })
          }}
          disabled={generateDisabled}
          className={`w-full p-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-3 transition-all ${generateDisabled
            ? 'border-muted-foreground/20 bg-muted/5 cursor-not-allowed opacity-50'
            : 'border-pink-500/30 bg-pink-500/5 hover:border-pink-500/60 hover:bg-pink-500/10 cursor-pointer'
            }`}
        >
          {isAddingNew || isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 text-pink-500 animate-spin" />
              <span className="text-sm text-pink-500">
                {progressPercent
                  ? `Generating (${progressPercent}%)`
                  : BibleOverviewMoodboardCopy.Generating}
              </span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-pink-500/60" />
              <span className="text-sm text-pink-500/80">
                {BibleOverviewMoodboardCopy.GenerateWithMidjourney}
              </span>
            </>
          )}
        </button>
      ) : null}
    </div>
  )
}

interface MoodboardProgressBarProps {
  progressPercent: string | null
}

export const MoodboardProgressBar: React.FC<MoodboardProgressBarProps> = ({ progressPercent }) => (
  <div className="mb-4">
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div
        className="h-full rounded-full bg-pink-500/80 transition-all duration-500 ease-out"
        style={{ width: `${clampProgressBarWidth(progressPercent)}%` }}
      />
    </div>
  </div>
)
