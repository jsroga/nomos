import type { Dispatch, SetStateAction } from 'react'
import { BeatCard as BeatData } from '@/domains/storyteller/core/types/story-types'
import { CORK_BOARD_DRAG_EFFECT_MOVE, CorkBoardDragMime } from './utils/cork-board'
import { reorderBeatsById } from './utils/cork-board-beats'

export const useCorkBoardDragDrop = (
  beats: BeatData[],
  setBeats: Dispatch<SetStateAction<BeatData[]>>,
  onReorder?: (ordered: BeatData[]) => void | Promise<void>,
) => {
  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = CORK_BOARD_DRAG_EFFECT_MOVE
    e.dataTransfer.setData(CorkBoardDragMime.BeatId, id)
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = CORK_BOARD_DRAG_EFFECT_MOVE
  }

  const onDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const draggedId = e.dataTransfer.getData(CorkBoardDragMime.BeatId)
    const updatedBeats = reorderBeatsById(beats, draggedId, targetId)
    if (!updatedBeats) return
    setBeats(updatedBeats)
    void onReorder?.(updatedBeats)
  }

  return { onDragStart, onDragOver, onDrop }
}
