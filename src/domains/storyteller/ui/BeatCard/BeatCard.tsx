import React, { useState } from 'react'
import { GripVertical, Loader2 } from 'lucide-react'
import { Textarea } from '@/components/Textarea'
import { BeatCard as BeatCardData } from '@/domains/storyteller/core/types/story-types'
import { beatImageService } from '@/domains/storyteller/services/beat-image-service'
import {
  BEAT_TYPE_BORDER_CLASS,
  BeatCardCopy,
  BeatCardShellClass,
  BeatCardType,
  BeatGenerationMode,
  isBeatCardType,
} from './constants/beat-card'
import { BeatCardActions } from './BeatCardActions'
import { BeatCardImageSection } from './BeatCardImageSection'
import { BeatImageBatchOverlay } from '@/domains/storyteller/state/useBeatImageBatchStore'

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
  batchOverlay?: BeatImageBatchOverlay | null
}

const getTypeColor = (type: string) => {
  if (isBeatCardType(type)) {
    return BEAT_TYPE_BORDER_CLASS[type]
  }
  return BEAT_TYPE_BORDER_CLASS[BeatCardType.Default]
}

function beatCardType(beat: Beat): string {
  if (beat.beatType) return beat.beatType
  if (beat.type) return beat.type
  return BeatCardType.Default
}

export function beatImageBusy(
  isGenerating: BeatGenerationMode | null,
  isBatchGenerating: boolean,
): boolean {
  if (isGenerating !== null) return true
  return isBatchGenerating
}

function beatOverlayCopy(
  batchOverlay: BeatImageBatchOverlay | null,
  isGenerating: BeatGenerationMode | null,
): string {
  if (batchOverlay === BeatImageBatchOverlay.Pending && isGenerating === null) {
    return BeatCardCopy.Pending
  }
  return BeatCardCopy.Generating
}

function beatActionsGenerating(
  isGenerating: BeatGenerationMode | null,
  isBatchGenerating: boolean,
): BeatGenerationMode | null {
  if (isGenerating) return isGenerating
  if (isBatchGenerating) return BeatGenerationMode.Image
  return null
}

function beatShowsBusyOverlay(
  isGenerating: BeatGenerationMode | null,
  isBatchGenerating: boolean,
): boolean {
  if (isGenerating !== null) return true
  return isBatchGenerating
}

function beatEditType(editState: Beat): string {
  if (editState.type) return editState.type
  if (editState.beatType) return editState.beatType
  return BeatCardType.Default
}

function beatCardShellClass(beatType: string, isEditing: boolean): string {
  const grab = isEditing ? '' : BeatCardShellClass.Grab
  return `min-h-[120px] border border-border text-foreground p-4 rounded-md border-l-[3px] ${getTypeColor(beatType)} flex flex-col group relative transition-colors ${grab}`
}

function toImageBeatCard(beat: Beat): BeatCardData {
  return {
    id: beat.id,
    sequence: beat.sequence,
    logline: beat.logline,
    beatType: beatCardType(beat),
    content: beat.content,
    status: beat.status,
    imageUrl: beat.imageUrl,
    imagePrompt: beat.imagePrompt,
  }
}

function BeatCardBusyOverlay({ visible, label }: { visible: boolean; label: string }) {
  if (!visible) return null
  return (
    <div className="absolute inset-0 z-10 rounded-md bg-background/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2">
      <Loader2 size={18} className="animate-spin text-primary" />
      <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

function BeatCardTypePicker({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <select
      className="bg-muted border border-border rounded-md px-2 py-1.5 text-xs font-mono uppercase tracking-wider text-foreground focus:border-primary outline-none"
      value={value}
      onChange={e => onChange(e.target.value)}
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
  )
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
  batchOverlay = null,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editState, setEditState] = useState(beat)
  const [isGenerating, setIsGenerating] = useState<BeatGenerationMode | null>(null)

  const beatType = beatCardType(beat)
  const isBatchGenerating = batchOverlay !== null
  const imageBusy = beatImageBusy(isGenerating, isBatchGenerating)
  const overlayLabel = beatOverlayCopy(batchOverlay, isGenerating)
  const actionsGenerating = beatActionsGenerating(isGenerating, isBatchGenerating)
  const showBusyOverlay = beatShowsBusyOverlay(isGenerating, isBatchGenerating)
  const editType = beatEditType(editState)

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
      className={beatCardShellClass(beatType, isEditing)}
    >
      <BeatCardBusyOverlay visible={showBusyOverlay} label={overlayLabel} />

      {!isEditing && (
        <div className="absolute top-3 right-3 opacity-40 group-hover:opacity-70 transition-opacity pointer-events-none">
          <GripVertical size={12} className="text-muted-foreground" />
        </div>
      )}

      <div className="flex justify-between items-center mb-2 gap-2">
        {isEditing ? (
          <BeatCardTypePicker
            value={editType}
            onChange={value => setEditState({ ...editState, type: value, beatType: value })}
          />
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
          isGenerating={actionsGenerating}
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
