import React, { useState } from 'react'
import { Trash2, Edit2, Check, X, GripVertical, Sparkles, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

import { Skeleton } from '@/components/ui/skeleton'

interface Beat {
  id: string
  logline: string
  type: string
  sequence: number
  content?: string
  beatType?: string
  status?: string
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
  onSendMessage?: (message: string) => void
  projectId: string
}

export const BeatCard: React.FC<BeatCardProps> = ({
  beat,
  onUpdate,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onExpand,
  onSendMessage,
  projectId,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editState, setEditState] = useState(beat)
  const [isGenerating, setIsGenerating] = useState<'content' | 'image' | null>(null)

  const handleGenerateContent = () => {
    if (!onSendMessage) return
    setIsGenerating('content')
    const message = `Write detailed scene content for beat #${beat.sequence} "${beat.logline}". Include visual descriptions, dialogue, and subtext. Beat type: ${beat.beatType || beat.type}.`
    onSendMessage(message)
    // Reset after a short delay (chat will handle actual completion)
    setTimeout(() => setIsGenerating(null), 2000)
  }

  const handleGenerateImage = () => {
    if (!onSendMessage) return
    setIsGenerating('image')
    const message = `Generate a storyboard image for beat #${beat.sequence} "${beat.logline}". Create a cinematic visual that captures the mood and action.`
    onSendMessage(message)
    setTimeout(() => setIsGenerating(null), 2000)
  }

  const beatType = beat.beatType || beat.type || 'default'

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'setup':
        return 'border-l-blue-500 bg-blue-500/5'
      case 'complication':
        return 'border-l-red-500 bg-red-500/5'
      case 'revelation':
        return 'border-l-yellow-500 bg-yellow-500/5'
      case 'decision':
        return 'border-l-purple-500 bg-purple-500/5'
      case 'consequence':
        return 'border-l-orange-500 bg-orange-500/5'
      case 'resolution':
        return 'border-l-green-500 bg-green-500/5'
      default:
        return 'border-l-neutral-500 bg-neutral-500/5'
    }
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/20 text-green-400'
      case 'proposed':
        return 'bg-yellow-500/20 text-yellow-400'
      case 'locked':
        return 'bg-blue-500/20 text-blue-400'
      default:
        return 'bg-neutral-500/20 text-neutral-400'
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
      className={`min-h-[140px] bg-card/80 backdrop-blur border border-border/50 text-foreground p-4 rounded-lg shadow-xl transform transition-all duration-200 border-l-4 ${getTypeColor(beatType)} flex flex-col group relative ${!isEditing ? 'hover:-translate-y-1 hover:shadow-2xl cursor-grab active:cursor-grabbing' : ''}`}
    >
      {/* Drag handle */}
      {!isEditing && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-50 transition-opacity">
          <GripVertical size={14} className="text-muted-foreground" />
        </div>
      )}

      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex justify-between items-center">
        {isEditing ? (
          <select
            className="bg-background border border-border rounded px-2 py-1 text-xs"
            value={editState.type || editState.beatType}
            onChange={e =>
              setEditState({ ...editState, type: e.target.value, beatType: e.target.value })
            }
          >
            <option value="setup">Setup</option>
            <option value="complication">Complication</option>
            <option value="revelation">Revelation</option>
            <option value="decision">Decision</option>
            <option value="consequence">Consequence</option>
            <option value="resolution">Resolution</option>
          </select>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-primary">{beatType}</span>
            {beat.status && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${getStatusBadge(beat.status)}`}>
                {beat.status}
              </span>
            )}
          </div>
        )}
        <span className="text-primary font-mono">#{beat.sequence}</span>
      </div>

      {isEditing ? (
        <Textarea
          className="flex-1 resize-none text-sm bg-background border-border p-2 mb-2 min-h-[80px]"
          value={editState.logline}
          onChange={e => setEditState({ ...editState, logline: e.target.value })}
        />
      ) : (
        <p className="text-sm leading-relaxed flex-1 overflow-y-auto scrollbar-hide text-foreground/90">
          {beat.logline}
        </p>
      )}

      {/* Storyboard Image or Skeleton */}
      {(beat.imageUrl || beat.imagePrompt) && !isEditing && (
        <div
          className="mt-2 w-full aspect-video rounded overflow-hidden border border-border/50 relative group/image cursor-zoom-in"
          onClick={() => beat.imageUrl && onExpand?.(beat.id)}
        >
          {beat.imageUrl ? (
            <img
              src={`/projects/${projectId}/${beat.imageUrl}`}
              alt={beat.imagePrompt || 'Beat storyboard'}
              className="w-full h-full object-cover transition-transform duration-500 group-hover/image:scale-105"
            />
          ) : (
            <div className="w-full h-full relative">
              <Skeleton className="w-full h-full absolute inset-0 bg-white/5" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs text-white/30 font-medium animate-pulse">
                  Generating Scene...
                </span>
              </div>
            </div>
          )}

          {beat.imagePrompt && beat.imageUrl && (
            <div className="absolute inset-0 bg-black/80 p-2 text-[10px] text-white opacity-0 group-hover/image:opacity-100 transition-opacity overflow-y-auto">
              {beat.imagePrompt}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex justify-between items-end pt-2 border-t border-border/30">
        <div className="flex gap-1">
          {/* Character Avatars (Mock) */}
          <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/30"></div>
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isEditing ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                onClick={handleSave}
              >
                <Check size={14} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={() => setIsEditing(false)}
              >
                <X size={14} />
              </Button>
            </>
          ) : (
            <TooltipProvider delayDuration={300}>
              {/* Generate Content Button */}
              {onSendMessage && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`h-6 w-6 p-0 text-muted-foreground hover:text-purple-400 hover:bg-purple-500/10 ${isGenerating === 'content' ? 'animate-pulse text-purple-400' : ''}`}
                      onClick={handleGenerateContent}
                      disabled={isGenerating !== null}
                    >
                      <Sparkles size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Generate scene content
                  </TooltipContent>
                </Tooltip>
              )}
              {/* Generate Image Button */}
              {onSendMessage && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`h-6 w-6 p-0 text-muted-foreground hover:text-cyan-400 hover:bg-cyan-500/10 ${isGenerating === 'image' ? 'animate-pulse text-cyan-400' : ''}`}
                      onClick={handleGenerateImage}
                      disabled={isGenerating !== null}
                    >
                      <ImageIcon size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Generate storyboard image
                  </TooltipContent>
                </Tooltip>
              )}
              {/* Edit Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-blue-400 hover:bg-blue-500/10"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Edit beat
                </TooltipContent>
              </Tooltip>
              {/* Delete Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                    onClick={() => onDelete(beat.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Delete beat
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </div>
  )
}
