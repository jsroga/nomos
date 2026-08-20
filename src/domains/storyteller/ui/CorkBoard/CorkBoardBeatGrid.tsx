import React from 'react'
import { Plus } from 'lucide-react'
import { BeatCard } from '../BeatCard'
import { BeatCardLoading } from '../BeatCard/BeatCardLoading'
import { BeatCard as BeatData } from '@/domains/storyteller/core/types/story-types'
import { beatImageBatchOverlay } from '@/domains/storyteller/state/useBeatImageBatchStore'
import { CorkBoardLoadingKey } from './constants/cork-board'
import { corkBoardLoadingPlaceholderCount } from './cork-board-list-mode'

interface CorkBoardBeatGridProps {
  beats: BeatData[]
  projectId: string
  onUpdate: (id: string, updates: Partial<BeatData>) => void
  onDelete: (id: string) => void
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragOver: (e: React.DragEvent, id: string) => void
  onDrop: (e: React.DragEvent, id: string) => void
  onExpand: (id: string) => void
  onCreate: () => void
  confirmDialog: React.ReactNode
  showLoadingCard?: boolean
  pendingImageBeatIds?: readonly string[]
  activeGeneratingBeatId?: string | null
}

export const CorkBoardBeatGrid: React.FC<CorkBoardBeatGridProps> = ({
  beats,
  projectId,
  onUpdate,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onExpand,
  onCreate,
  confirmDialog,
  showLoadingCard = false,
  pendingImageBeatIds = [],
  activeGeneratingBeatId = null,
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {beats
      .sort((a, b) => a.sequence - b.sequence)
      .map(beat => (
        <BeatCard
          key={beat.id}
          beat={beat}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onExpand={onExpand}
          projectId={projectId}
          batchOverlay={beatImageBatchOverlay({
            beatId: beat.id,
            imageUrl: beat.imageUrl,
            pendingBeatIds: pendingImageBeatIds,
            activeBeatId: activeGeneratingBeatId,
          })}
        />
      ))}

    {Array.from({ length: corkBoardLoadingPlaceholderCount(showLoadingCard) }, (_, index) => (
      <BeatCardLoading key={`${CorkBoardLoadingKey.Placeholder}-${index}`} />
    ))}

    <button
      type="button"
      onClick={onCreate}
      className="min-h-[120px] border-2 border-dashed border-border rounded-md flex flex-col items-center justify-center hover:bg-muted/30 hover:border-primary/40 cursor-pointer transition-colors group text-left"
    >
      <div className="w-10 h-10 rounded-md bg-muted border border-border flex items-center justify-center mb-2 group-hover:border-primary/30 group-hover:bg-primary/10 transition-colors">
        <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
      </div>
      <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground group-hover:text-foreground">
        Add Beat
      </span>
    </button>
    {confirmDialog}
  </div>
)
