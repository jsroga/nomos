import React, { useState, useEffect } from 'react'
import { BeatCard } from './BeatCard'
import { Plus } from 'lucide-react'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'

interface CorkBoardProps {
  beats: any[] // Initial beats or passed from parent
  episodeId?: string // To fetch/create beats
}

export const CorkBoard: React.FC<CorkBoardProps> = ({ beats: initialBeats, episodeId }) => {
  const [beats, setBeats] = useState<any[]>(initialBeats)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const { confirm, ConfirmDialogComponent } = useConfirmDialog()

  // CRITICAL: Sync internal state when parent prop changes
  useEffect(() => {
    console.log('📋 CorkBoard: beats prop changed, syncing state. Count:', initialBeats?.length)
    setBeats(initialBeats || [])
  }, [initialBeats])

  useEffect(() => {
    if (episodeId) {
      fetch(`/api/storyteller/episodes/${episodeId}/beats`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setBeats(data)
        })
    }
  }, [episodeId])

  const handleCreate = async () => {
    if (!episodeId) return

    const newBeat = {
      logline: 'New Beat',
      beatType: 'setup',
      sequence: beats.length + 1,
      content: '',
    }

    const res = await fetch(`/api/storyteller/episodes/${episodeId}/beats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBeat),
    })
    const created = await res.json()
    setBeats([...beats, created])
  }

  const handleUpdate = async (id: string, updates: any) => {
    // Optimistic update
    setBeats(beats.map(b => (b.id === id ? { ...b, ...updates } : b)))

    await fetch(`/api/storyteller/beats/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Beat',
      description: 'Are you sure you want to delete this beat? This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'destructive',
    })
    if (!confirmed) return

    setBeats(beats.filter(b => b.id !== id))
    await fetch(`/api/storyteller/beats/${id}`, { method: 'DELETE' })
  }

  // Drag and Drop Logic
  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
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

    // Re-assign sequences
    const updatedBeats = newBeats.map((b, idx) => ({ ...b, sequence: idx + 1 }))
    setBeats(updatedBeats)
    setDraggedId(null)

    // Ideally, batch update sequences in backend
    // For now, we update locally.
    // TODO: Implement batch sequence update API
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
      {beats
        .sort((a, b) => a.sequence - b.sequence)
        .map(beat => (
          <BeatCard
            key={beat.id}
            beat={beat}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
          />
        ))}

      {/* Add New Card Placeholder */}
      <div
        onClick={handleCreate}
        className="aspect-[5/3] border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center hover:bg-white/5 cursor-pointer transition-colors group"
      >
        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-2 group-hover:bg-white/20 transition-colors">
          <Plus className="text-white/60" />
        </div>
        <span className="text-white/40 font-medium group-hover:text-white/60">Add Beat</span>
      </div>
      {ConfirmDialogComponent}
    </div>
  )
}
