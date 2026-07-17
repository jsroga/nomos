import { useState, type Dispatch, type SetStateAction } from 'react'
import { BeatCard as BeatData } from '@/domains/storyteller/core/types/story-types'
import { CORK_BOARD_DRAG_EFFECT_MOVE } from './constants/cork-board'

export const useCorkBoardDragDrop = (
  beats: BeatData[],
  setBeats: Dispatch<SetStateAction<BeatData[]>>
) => {
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = CORK_BOARD_DRAG_EFFECT_MOVE
  }

  const onDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    if (!draggedId || draggedId === id) return
  }

  const onDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedId || draggedId === targetId) return

    const draggedIndex = beats.findIndex(b => b.id === draggedId)
    const targetIndex = beats.findIndex(b => b.id === targetId)
    if (draggedIndex === -1 || targetIndex === -1) return

    const newBeats = [...beats]
    const [removed] = newBeats.splice(draggedIndex, 1)
    newBeats.splice(targetIndex, 0, removed)
    const updatedBeats = newBeats.map((b, idx) => ({ ...b, sequence: idx + 1 }))
    setBeats(updatedBeats)
    setDraggedId(null)
  }

  return { onDragStart, onDragOver, onDrop }
}
