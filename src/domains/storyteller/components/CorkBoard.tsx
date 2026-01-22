import React, { useState, useEffect, memo, useCallback } from 'react'
import { BeatCard } from './BeatCard'
import { BeatCard as BeatData } from '../graph/state'
import { useParams } from 'next/navigation'
import { Plus, Image as ImageIcon, Loader2, Sparkles, Film } from 'lucide-react'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import { beatImageService } from '../services/beat-image-service'
import { useGlobalStatusStore } from '@/store/useGlobalStatusStore'
import { Message } from './AgentLog'
import { ImageLightbox } from '@/components/ImageLightbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

interface CorkBoardProps {
  beats: BeatData[]
  episodeId?: string
  onAddMessage?: (message: Message) => void

  // Combined Storyboard (Gemini)
  storyboardUrl?: string | null
  isGeneratingCombined?: boolean
  onGenerateCombined?: () => void

  projectId?: string
}

// Memoize the entire CorkBoard to prevent re-renders from parent state changes
export const CorkBoard: React.FC<CorkBoardProps> = memo(function CorkBoard({
  beats: initialBeats,
  episodeId,
  onAddMessage,

  storyboardUrl,
  isGeneratingCombined,
  onGenerateCombined,
  projectId: propProjectId,
}) {
  const [beats, setBeats] = useState<BeatData[]>(initialBeats)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [isGeneratingBeats, setIsGeneratingBeats] = useState(false)
  const [expandedBeatId, setExpandedBeatId] = useState<string | null>(null)
  const { confirm, ConfirmDialogComponent } = useConfirmDialog()
  const params = useParams() as { projectId: string }
  const projectId = propProjectId || params.projectId || 'unknown'

  // ... (previous useEffects and handlers remain same until render) ...

  // CRITICAL: Sync internal state when parent prop changes
  useEffect(() => {
    // console.log('📋 CorkBoard: beats prop changed, syncing state. Count:', initialBeats?.length)
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

  const expandedBeatIndex = beats.findIndex(b => b.id === expandedBeatId)
  const expandedBeat = expandedBeatIndex !== -1 ? beats[expandedBeatIndex] : null

  const handleNext = () => {
    if (expandedBeatIndex !== -1 && expandedBeatIndex < beats.length - 1) {
      setExpandedBeatId(beats[expandedBeatIndex + 1].id)
    }
  }

  const handlePrev = () => {
    if (expandedBeatIndex > 0) {
      setExpandedBeatId(beats[expandedBeatIndex - 1].id)
    }
  }

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

  const handleUpdate = async (id: string, updates: Partial<BeatCard>) => {
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
      description: 'Are you sure you want to delete this beat?',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'destructive',
    })
    if (!confirmed) return
    setBeats(beats.filter(b => b.id !== id))
    await fetch(`/api/storyteller/beats/${id}`, { method: 'DELETE' })
  }

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
    const updatedBeats = newBeats.map((b, idx) => ({ ...b, sequence: idx + 1 }))
    setBeats(updatedBeats)
    setDraggedId(null)
  }

  const handleGenerateBeats = async () => {
    if (!projectId || beats.length === 0) return
    setIsGeneratingBeats(true)
    if (onAddMessage) {
      onAddMessage({
        sender: 'VisualDirector',
        content: `**Storyboard Generation Started**\n\nI'm creating visual storyboards for ${beats.length} beats...\n\n*Generating...*`,
        type: 'ai',
      })
    }
    try {
      let generatedCount = 0
      for (const beat of beats) {
        await beatImageService.generateImageForBeat(projectId, beat, (id, updates) => {
          setBeats(prev => prev.map(b => (b.id === id ? { ...b, ...updates } : b)))
        })
        generatedCount++
      }
    } catch (e) {
      console.error('Storyboard generation failed', e)
    } finally {
      setIsGeneratingBeats(false)
    }
  }

  const getUrl = (url: string | null) => {
    if (!url) return ''
    if (url.startsWith('http') || url.startsWith('/')) return url
    if (url.startsWith('projects/')) return `/${url}`
    return `/projects/${projectId}/${url}`
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="grid grid-cols-1 gap-4 mb-6">
        {/* SECTION 2: COMBINED STORYBOARD (Gemini) */}
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-500" />
                Combined Storyboard
              </h3>
              <p className="text-xs text-muted-foreground mt-1">Gemini Visual Summary</p>
            </div>
            {onGenerateCombined && (
              <Button
                variant="outline"
                size="sm"
                onClick={onGenerateCombined}
                disabled={isGeneratingCombined || beats.length === 0}
                className="gap-2"
              >
                {isGeneratingCombined ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                {isGeneratingCombined ? 'Planning...' : storyboardUrl ? 'Regenerate' : 'Generate'}
              </Button>
            )}
          </div>

          <div className="flex-1 min-h-[200px] flex items-center justify-center bg-black/20 rounded border border-border/50 relative overflow-hidden group">
            {isGeneratingCombined ? (
              <div className="text-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                <p className="text-xs text-muted-foreground">Synthesizing Scenes...</p>
              </div>
            ) : storyboardUrl ? (
              <div
                onClick={() => setExpandedBeatId('storyboard_view')}
                className="cursor-zoom-in w-full h-full"
              >
                <img
                  src={getUrl(storyboardUrl)}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  alt="Combined Storyboard"
                />
              </div>
            ) : (
              <div className="text-center text-muted-foreground text-xs p-4">
                No storyboard generated.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightboxes */}

      <ImageLightbox
        isOpen={expandedBeatId === 'storyboard_view'}
        onClose={() => setExpandedBeatId(null)}
        imageSrc={getUrl(storyboardUrl || '')}
        imageAlt="Combined Storyboard"
        hasNext={false}
        hasPrev={false}
      />

      <div className="flex justify-between items-center px-1">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
          Beat Board
        </h3>
        <button
          onClick={handleGenerateBeats}
          disabled={isGeneratingBeats || beats.length === 0}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGeneratingBeats ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <ImageIcon size={14} />
          )}
          {isGeneratingBeats ? 'Generating Storyboard...' : 'Generate Storyboard'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
              onExpand={setExpandedBeatId}
              projectId={projectId}
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

      <ImageLightbox
        isOpen={!!expandedBeatId && expandedBeatId !== 'poster_view'}
        onClose={() => setExpandedBeatId(null)}
        imageSrc={expandedBeat?.imageUrl ? `/projects/${projectId}/${expandedBeat.imageUrl}` : ''}
        imageAlt={expandedBeat?.imagePrompt || expandedBeat?.logline || undefined}
        onNext={handleNext}
        onPrev={handlePrev}
        hasNext={expandedBeatIndex < beats.length - 1}
        hasPrev={expandedBeatIndex > 0}
      />
    </div>
  )
})
