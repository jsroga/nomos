import React, { memo } from 'react'
import { BeatCard as BeatData } from '@/domains/storyteller/core/types/story-types'
import { Image as ImageIcon, Loader2, Sparkles } from 'lucide-react'
import type { Message } from '@/shared/chat'
import { ImageLightbox } from '@/components/ImageLightbox'
import { CorkBoardStoryboardSection } from './CorkBoardStoryboardSection'
import { CorkBoardBeatGrid } from './CorkBoardBeatGrid'
import { useCorkBoardState } from './useCorkBoardState'

interface CorkBoardProps {
  beats: BeatData[]
  episodeId?: string
  onAddMessage?: (message: Message) => void
  onSendMessage?: (message: string) => void
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
  storyboardUrl,
  isGeneratingCombined,
  onGenerateCombined,
  projectId: propProjectId,
}) {
  const board = useCorkBoardState({
    initialBeats,
    episodeId,
    onAddMessage,
    onSendMessage,
    propProjectId,
  })

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
          Beat Board
        </h3>
        <button
          onClick={board.handleGenerateBeats}
          disabled={board.isGeneratingBeats}
          className="flex items-center gap-2 px-3 py-1.5 bg-muted border border-border text-foreground hover:bg-primary/10 hover:border-primary/30 rounded-md text-[11px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {board.isGeneratingBeats ? (
            <Loader2 size={12} className="animate-spin" />
          ) : board.beats.length === 0 ? (
            <Sparkles size={12} />
          ) : (
            <ImageIcon size={12} />
          )}
          {board.isGeneratingBeats
            ? 'Generating…'
            : board.beats.length === 0
              ? 'Generate Beats'
              : 'Generate Images'}
        </button>
      </div>

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
      />

      <ImageLightbox
        isOpen={!!board.expandedBeatId && board.expandedBeatId !== 'poster_view'}
        onClose={() => board.setExpandedBeatId(null)}
        imageSrc={
          board.expandedBeat?.imageUrl
            ? `/projects/${board.projectId}/${board.expandedBeat.imageUrl}`
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
