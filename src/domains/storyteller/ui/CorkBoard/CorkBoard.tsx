import React, { useState, useEffect, memo } from 'react'
import { BeatCard } from '../BeatCard'
import { BeatCard as BeatData } from '@/domains/storyteller/core/types/StoryTypes'
import { useParams } from 'next/navigation'
import { Plus, Image as ImageIcon, Loader2, Sparkles } from 'lucide-react'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { beatImageService } from '../../services/BeatImageService'
import { Message } from '../AgentLog'
import { ImageLightbox } from '@/components/ImageLightbox'
import { Button } from '@/components/Button'

interface CorkBoardProps {
  beats: BeatData[]
  episodeId?: string
  onAddMessage?: (message: Message) => void
  onSendMessage?: (message: string) => void

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
  onSendMessage,

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
  const params = useParams<{ projectId: string }>()
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

  const handleUpdate = async (id: string, updates: Partial<BeatData>) => {
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
    if (!projectId) return

    // When no beats exist, ask the agent to generate 8-12 beats
    if (beats.length === 0) {
      if (onSendMessage) {
        onSendMessage(
          'Generate 8-12 story beats for this episode. Each beat should have a logline, beat type, visual hook, and characters involved. Cover the full arc from setup through climax to resolution.'
        )
      }
      return
    }

    // When beats exist, generate images for them
    setIsGeneratingBeats(true)
    if (onAddMessage) {
      onAddMessage({
        sender: 'VisualDirector',
        content: `**Storyboard Generation Started**\n\nI'm creating visual storyboards for ${beats.length} beats...\n\n*Generating...*`,
        type: 'ai',
      })
    }
    try {
      for (const beat of beats) {
        await beatImageService.generateImageForBeat(projectId, beat, (id, updates) => {
          setBeats(prev => prev.map(b => (b.id === id ? { ...b, ...updates } : b)))
        })
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
        <div className="bg-card border border-border rounded-md p-4 flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-mono text-[11px] font-medium uppercase tracking-widest text-foreground flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5 text-primary" />
                Combined Storyboard
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1">Gemini Visual Summary</p>
            </div>
            {onGenerateCombined && (
              <Button
                variant="outline"
                size="sm"
                onClick={onGenerateCombined}
                disabled={isGeneratingCombined || beats.length === 0}
                className="gap-2 rounded-md"
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

          <div className="flex-1 min-h-[200px] flex items-center justify-center bg-muted/30 rounded-md border border-border relative overflow-hidden group">
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

      <div className="flex justify-between items-center px-1 mb-1">
        <h3 className="font-mono text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          Beat Board
        </h3>
        <button
          onClick={handleGenerateBeats}
          disabled={isGeneratingBeats}
          className="flex items-center gap-2 px-3 py-1.5 bg-muted border border-border text-foreground hover:bg-primary/10 hover:border-primary/30 rounded-md text-[11px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGeneratingBeats ? (
            <Loader2 size={12} className="animate-spin" />
          ) : beats.length === 0 ? (
            <Sparkles size={12} />
          ) : (
            <ImageIcon size={12} />
          )}
          {isGeneratingBeats
            ? 'Generating…'
            : beats.length === 0
              ? 'Generate Beats'
              : 'Generate Images'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
              onSendMessage={onSendMessage}
              projectId={projectId}
            />
          ))}

        {/* Add New Card Placeholder */}
        <button
          type="button"
          onClick={handleCreate}
          className="min-h-[120px] border-2 border-dashed border-border rounded-md flex flex-col items-center justify-center hover:bg-muted/30 hover:border-primary/40 cursor-pointer transition-colors group text-left"
        >
          <div className="w-10 h-10 rounded-md bg-muted border border-border flex items-center justify-center mb-2 group-hover:border-primary/30 group-hover:bg-primary/10 transition-colors">
            <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
          </div>
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground group-hover:text-foreground">Add Beat</span>
        </button>
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
