import React, { memo, useEffect } from 'react'
import { CheckCircle } from 'lucide-react'
import { BeatCard as BeatData } from '@/domains/storyteller/core/types/story-types'
import type { Message } from '@/shared/chat'
import type { ApiframeVideoModel } from '@/shared/ai/constants/apiframe'
import type { StoryboardVideoLook } from '@/shared/ai/storyboard-video-env'
import { Button } from '@/components/Button'
import { ImageLightbox } from '@/components/ImageLightbox'
import { CorkBoardStoryboardSection } from './CorkBoardStoryboardSection'
import { CorkBoardBeatGrid } from './CorkBoardBeatGrid'
import { CorkBoardBeatActions } from './CorkBoardBeatActions'
import { CorkBoardEmptyState } from './CorkBoardEmptyState'
import { CorkBoardCopy, CorkBoardExpandedId } from './constants/cork-board'
import { beatsHaveExistingImages } from './cork-board-generation'
import { isStoryboardStillLightboxOpen } from './storyboard-media'
import {
  CorkBoardListMode,
  corkBoardIsAwaitingBeats,
  corkBoardListMode,
  corkBoardShowsLoadingPlaceholders,
} from './cork-board-list-mode'
import { useCorkBoardState } from './useCorkBoardState'
import {
  getStorytellerUiStore,
  useStorytellerUiStore,
} from '@/domains/storyteller/state/useStorytellerUiStore'

interface CorkBoardProps {
  beats: BeatData[]
  episodeId?: string
  onAddMessage?: (message: Message) => void
  onSendMessage?: (message: string) => void
  onRefreshBeats?: () => void
  onAddGeneratedBeats?: () => void | Promise<void>
  onContinueToDraft?: () => void
  premise?: unknown
  isChatBusy?: boolean
  storyboardUrl?: string | null
  isGeneratingCombined?: boolean
  onGenerateCombined?: (model: ApiframeVideoModel, look: StoryboardVideoLook) => void
  projectId?: string
}

export const CorkBoard: React.FC<CorkBoardProps> = memo(function CorkBoard({
  beats: initialBeats,
  episodeId,
  onAddMessage,
  onSendMessage,
  onRefreshBeats,
  onAddGeneratedBeats,
  onContinueToDraft,
  premise,
  isChatBusy,
  storyboardUrl,
  isGeneratingCombined,
  onGenerateCombined,
  projectId: propProjectId,
}) {
  const pendingBoardHydration = useStorytellerUiStore(state => state.pendingBoardHydration)
  const pendingBeatAdds = useStorytellerUiStore(state => state.pendingBeatAdds)
  const board = useCorkBoardState({
    initialBeats,
    episodeId,
    onAddMessage,
    onSendMessage,
    onRefreshBeats,
    premise,
    isChatBusy,
    propProjectId,
  })

  useEffect(() => {
    if (board.beats.length === 0) return
    getStorytellerUiStore().setPendingBoardHydration(false)
  }, [board.beats.length])

  const awaitingBeats = corkBoardIsAwaitingBeats({
    awaitingBoardRefresh: board.awaitingBoardRefresh,
    pendingBoardHydration,
  })

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 p-4">
        <CorkBoardStoryboardSection
        storyboardUrl={storyboardUrl}
        isGeneratingCombined={isGeneratingCombined}
        onGenerateCombined={onGenerateCombined}
        beatCount={board.beats.length}
        hasBeatImages={beatsHaveExistingImages(board.beats)}
        onExpandStoryboard={() =>
          board.setExpandedBeatId(CorkBoardExpandedId.StoryboardView)
        }
        getUrl={board.getUrl}
      />

      <ImageLightbox
        isOpen={isStoryboardStillLightboxOpen(board.expandedBeatId, storyboardUrl)}
        onClose={() => board.setExpandedBeatId(null)}
        imageSrc={board.getUrl(storyboardUrl || '')}
        imageAlt={CorkBoardCopy.CombinedHeading}
        hasNext={false}
        hasPrev={false}
      />

      <div className="flex justify-between items-center px-1 mb-1">
        <h3 className="font-mono text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          {CorkBoardCopy.BeatBoardHeading}
        </h3>
        {pendingBeatAdds.length === 0 ? (
          <CorkBoardBeatActions
            beatCount={board.beats.length}
            isGeneratingImages={board.isGeneratingBeats}
            isGeneratingTextBeats={board.awaitingBoardRefresh}
            onGenerateNext={board.handleGenerateNextBeat}
            onGenerateImages={() => {
              void board.handleGenerateImages()
            }}
            onCancelImages={board.handleCancelImages}
          />
        ) : null}
      </div>

      {corkBoardListMode({
        beatCount: board.beats.length,
        isAwaitingBeats: awaitingBeats,
      }) === CorkBoardListMode.Empty ? (
        <>
          <CorkBoardEmptyState
            isBusy={awaitingBeats}
            readyToAdd={pendingBeatAdds.length > 0}
            onGenerate={() => {
              void board.handleGenerateTextBeats()
            }}
            onGenerateNext={board.handleGenerateNextBeat}
            onAddBeat={() => {
              void board.handleCreate()
            }}
            onAddToWorld={
              onAddGeneratedBeats
                ? () => {
                    void onAddGeneratedBeats()
                  }
                : undefined
            }
          />
          {board.ConfirmDialogComponent}
        </>
      ) : (
        <CorkBoardBeatGrid
          beats={board.beats}
          projectId={board.projectId}
          onUpdate={board.handleUpdate}
          onDelete={board.handleDelete}
          onDragStart={board.onDragStart}
          onDragOver={board.onDragOver}
          onDrop={board.onDrop}
          onExpand={board.setExpandedBeatId}
          onCreate={board.handleCreate}
          confirmDialog={board.ConfirmDialogComponent}
          showLoadingCard={corkBoardShowsLoadingPlaceholders(awaitingBeats)}
          pendingImageBeatIds={board.pendingImageBeatIds}
          activeGeneratingBeatId={board.activeImageBeatId}
        />
      )}

      <ImageLightbox
        isOpen={!!board.expandedBeatId && board.expandedBeatId !== CorkBoardExpandedId.PosterView}
        onClose={() => board.setExpandedBeatId(null)}
        imageSrc={
          board.expandedBeat?.imageUrl
            ? board.getUrl(board.expandedBeat.imageUrl)
            : ''
        }
        imageAlt={board.expandedBeat?.imagePrompt || board.expandedBeat?.logline || undefined}
        onNext={board.handleNextBeat}
        onPrev={board.handlePrevBeat}
        hasNext={board.expandedBeatIndex < board.beats.length - 1}
        hasPrev={board.expandedBeatIndex > 0}
      />
      </div>
      {board.beats.length > 0 && onContinueToDraft ? (
        <div className="p-4 border-t border-border bg-background/95 backdrop-blur">
          <Button
            onClick={onContinueToDraft}
            className="w-full gap-2 rounded-md font-medium"
            size="lg"
          >
            <CheckCircle className="w-4 h-4" />
            {CorkBoardCopy.ContinueToDraft}
          </Button>
        </div>
      ) : null}
    </div>
  )
})
