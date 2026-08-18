import React, { useState } from 'react'
import { GripVertical, Loader2 } from 'lucide-react'
import { Textarea } from '@/components/Textarea'
import { BeatCard as BeatCardData } from '@/domains/storyteller/core/types/story-types'
import { beatImageService } from '@/domains/storyteller/services/beat-image-service'
import {
  BEAT_TYPE_BORDER_CLASS,
  BeatCardCopy,
  BeatCardType,
  BeatGenerationMode,
  isBeatCardType,
} from './constants/beat-card'
import { BeatCardActions } from './BeatCardActions'
import { BeatCardImageSection } from './BeatCardImageSection'

interface Beat {
  id: string
  logline: string
  type?: string
  sequence: number
  content?: string
  beatType?: string
  status?: 'proposed' | 'approved' | 'rejected'
  imageUrl?: string
  imagePrompt?: string
}

interface BeatCardProps {
  beat: Beat
  onUpdate: (id: string, updates: Partial<Beat>) => void
  onDelete: (id: string) => void
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragOver: (e: React.DragEvent, id: string) => void
  onDrop: (e: React.DragEvent, id: string) => void
  onExpand?: (id: string) => void
  projectId: string
  isChatBusy?: boolean
  isBatchGenerating?: boolean
}

const getTypeColor = (type: string) => {
  if (isBeatCardType(type)) {
    return BEAT_TYPE_BORDER_CLASS[type]
  }
  return BEAT_TYPE_BORDER_CLASS[BeatCardType.Default]
}

function toImageBeatCard(beat: Beat): BeatCardData {
  return {
    id: beat.id,
    sequence: beat.sequence,
    logline: beat.logline,
    beatType: beat.beatType || beat.type || BeatCardType.Default,
    content: beat.content,
    status: beat.status,
    imageUrl: beat.imageUrl,
    imagePrompt: beat.imagePrompt,
  }
}

export const BeatCard: React.FC<BeatCardProps> = ({
  beat,
  onUpdate,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onExpand,
  projectId,
  isChatBusy = false,
  isBatchGenerating = false,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editState, setEditState] = useState(beat)
  const [isGenerating, setIsGenerating] = useState<BeatGenerationMode | null>(null)

  const beatType = beat.beatType || beat.type || BeatCardType.Default
  const imageBusy = isGenerating !== null || isChatBusy || isBatchGenerating

  const handleGenerateImage = async () => {
    if (imageBusy) return
    setIsGenerating(BeatGenerationMode.Image)
    try {
      await beatImageService.generateImageForBeat(projectId, toImageBeatCard(beat), (id, updates) => {
        onUpdate(id, {
          imageUrl: updates.imageUrl,
          imagePrompt: updates.imagePrompt,
        })
      })
    } finally {
      setIsGenerating(null)
    }
  }

  const handleSave = () => {
    onUpdate(beat.id, {
      logline: editState.logline,
      type: editState.type,
      content: editState.content,
    })
    setIsEditing(false)
  }

  return (
    <div
      draggable={!isEditing}
      onDragStart={e => onDragStart(e, beat.id)}
      onDragOver={e => onDragOver(e, beat.id)}
      onDrop={e => onDrop(e, beat.id)}
      className={`min-h-[120px] border border-border text-foreground p-4 rounded-md border-l-[3px] ${getTypeColor(beatType)} flex flex-col group relative transition-colors ${!isEditing ? 'cursor-grab active:cursor-grabbing hover:border-l-opacity-100' : ''}`}
    >
      {isGenerating || isBatchGenerating ? (
        <div className="absolute inset-0 z-10 rounded-md bg-background/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2">
          <Loader2 size={18} className="animate-spin text-primary" />
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {BeatCardCopy.Generating}
          </span>
        </div>
      ) : null}

      {!isEditing && (
        <div className="absolute top-3 right-3 opacity-40 group-hover:opacity-70 transition-opacity pointer-events-none">
          <GripVertical size={12} className="text-muted-foreground" />
        </div>
      )}

      <div className="flex justify-between items-center mb-2 gap-2">
        {isEditing ? (
          <select
            className="bg-muted border border-border rounded-md px-2 py-1.5 text-xs font-mono uppercase tracking-wider text-foreground focus:border-primary outline-none"
            value={editState.type || editState.beatType}
            onChange={e =>
              setEditState({ ...editState, type: e.target.value, beatType: e.target.value })
            }
          >
            <option value={BeatCardType.Setup}>Setup</option>
            <option value={BeatCardType.Complication}>Complication</option>
            <option value={BeatCardType.Revelation}>Revelation</option>
            <option value={BeatCardType.Confrontation}>Confrontation</option>
            <option value={BeatCardType.Transition}>Transition</option>
            <option value={BeatCardType.Decision}>Decision</option>
            <option value={BeatCardType.Consequence}>Consequence</option>
            <option value={BeatCardType.Climax}>Climax</option>
            <option value={BeatCardType.Resolution}>Resolution</option>
          </select>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              {beatType}
            </span>
          </div>
        )}
        <span className="font-mono text-[10px] text-muted-foreground tabular-nums flex-shrink-0">
          #{beat.sequence}
        </span>
      </div>

      {isEditing ? (
        <Textarea
          className="flex-1 resize-none text-sm bg-muted/50 border border-border rounded-md p-3 mb-3 min-h-[72px] focus:border-primary outline-none"
          value={editState.logline}
          onChange={e => setEditState({ ...editState, logline: e.target.value })}
        />
      ) : (
        <p className="text-sm leading-relaxed flex-1 overflow-y-auto scrollbar-hide text-foreground/95 min-h-[2.5rem]">
          {beat.logline}
        </p>
      )}

      {!isEditing && (
        <BeatCardImageSection
          imageUrl={beat.imageUrl}
          imagePrompt={beat.imagePrompt}
          projectId={projectId}
          beatId={beat.id}
          onExpand={onExpand}
        />
      )}

      <div className="mt-3 flex justify-end items-center pt-3 border-t border-border">
        <BeatCardActions
          isEditing={isEditing}
          isGenerating={isGenerating ?? (isBatchGenerating ? BeatGenerationMode.Image : null)}
          imageDisabled={imageBusy}
          onSave={handleSave}
          onCancelEdit={() => setIsEditing(false)}
          onStartEdit={() => setIsEditing(true)}
          onDelete={() => onDelete(beat.id)}
          onGenerateImage={handleGenerateImage}
        />
      </div>
    </div>
  )
}
