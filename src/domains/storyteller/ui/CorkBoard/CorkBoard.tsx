import React, { memo, useEffect } from 'react'
import { BeatCard as BeatData } from '@/domains/storyteller/core/types/story-types'
import type { Message } from '@/shared/chat'
import { ImageLightbox } from '@/components/ImageLightbox'
import { CorkBoardStoryboardSection } from './CorkBoardStoryboardSection'
import { CorkBoardBeatGrid } from './CorkBoardBeatGrid'
import { CorkBoardBeatActions } from './CorkBoardBeatActions'
import { CorkBoardEmptyState } from './CorkBoardEmptyState'
import { CorkBoardCopy } from './constants/cork-board'
import {
  CorkBoardListMode,
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
  premise?: unknown
  isChatBusy?: boolean
  storyboardUrl?: string | null
  isGeneratingCombined?: boolean
  onGenerateCombined?: () => void
  projectId?: string
}

export const CorkBoard: React.FC<CorkBoardProps> = memo(function CorkBoard({
  beats: initialBeats,
  episodeId,
  onAddMessage,
  onSendMessage,
  onRefreshBeats,
  premise,
  isChatBusy,
  storyboardUrl,
  isGeneratingCombined,
  onGenerateCombined,
  projectId: propProjectId,
}) {
  const pendingBoardHydration = useStorytellerUiStore(state => state.pendingBoardHydration)
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

  return (
    <div className="space-y-4 pb-20">
      <CorkBoardStoryboardSection
        storyboardUrl={storyboardUrl}
        isGeneratingCombined={isGeneratingCombined}
        onGenerateCombined={onGenerateCombined}
        beatCount={board.beats.length}
        onExpandStoryboard={() => board.setExpandedBeatId('storyboard_view')}
        getUrl={board.getUrl}
      />

      <ImageLightbox
        isOpen={board.expandedBeatId === 'storyboard_view'}
        onClose={() => board.setExpandedBeatId(null)}
        imageSrc={board.getUrl(storyboardUrl || '')}
        imageAlt="Combined Storyboard"
        hasNext={false}
        hasPrev={false}
      />

      <div className="flex justify-between items-center px-1 mb-1">
        <h3 className="font-mono text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          {CorkBoardCopy.BeatBoardHeading}
        </h3>
        <CorkBoardBeatActions
          beatCount={board.beats.length}
          isGeneratingImages={board.isGeneratingBeats}
          isChatBusy={board.isChatBusy}
          onGenerateText={() => {
            void board.handleGenerateTextBeats()
          }}
          onGenerateNext={board.handleGenerateNextBeat}
          onGenerateImages={board.handleGenerateImages}
        />
      </div>

      {corkBoardListMode({
        beatCount: board.beats.length,
        isChatBusy: Boolean(board.isChatBusy),
        pendingBoardHydration,
      }) === CorkBoardListMode.Empty ? (
        <>
          <CorkBoardEmptyState
            isBusy={board.isChatBusy}
            onGenerate={() => {
              void board.handleGenerateTextBeats()
            }}
            onGenerateNext={board.handleGenerateNextBeat}
            onAddBeat={() => {
              void board.handleCreate()
            }}
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
          onSendMessage={onSendMessage}
          onCreate={board.handleCreate}
          confirmDialog={board.ConfirmDialogComponent}
          isChatBusy={board.isChatBusy}
          showLoadingCard={corkBoardShowsLoadingPlaceholders({
            isChatBusy: Boolean(board.isChatBusy),
            pendingBoardHydration,
          })}
        />
      )}

      <ImageLightbox
        isOpen={!!board.expandedBeatId && board.expandedBeatId !== 'poster_view'}
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
  )
})
