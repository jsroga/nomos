import React from 'react'
import { Trash2, Edit2, Check, X, Sparkles, ImageIcon } from 'lucide-react'
import { Button } from '@/components/Button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/Tooltip'
import { cn } from '@/shared/data/utils'
import { BeatGenerationMode } from './constants/beat-card'

interface BeatCardActionsProps {
  isEditing: boolean
  isGenerating: BeatGenerationMode | null
  onSave: () => void
  onCancelEdit: () => void
  onStartEdit: () => void
  onDelete: () => void
  onGenerateContent?: () => void
  onGenerateImage?: () => void
}

export const BeatCardActions: React.FC<BeatCardActionsProps> = ({
  isEditing,
  isGenerating,
  onSave,
  onCancelEdit,
  onStartEdit,
  onDelete,
  onGenerateContent,
  onGenerateImage,
}) => (
  <div className={cn('flex gap-0.5', !isEditing && 'opacity-70 group-hover:opacity-100 transition-opacity')}>
    {isEditing ? (
      <>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 rounded-md text-emerald-400 hover:bg-emerald-500/10"
          onClick={onSave}
        >
          <Check size={12} />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 rounded-md text-muted-foreground hover:bg-muted"
          onClick={onCancelEdit}
        >
          <X size={12} />
        </Button>
      </>
    ) : (
      <TooltipProvider delayDuration={200}>
        {onGenerateContent && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className={cn(
                  'h-7 w-7 p-0 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10',
                  isGenerating === BeatGenerationMode.Content && 'animate-pulse text-primary'
                )}
                onClick={onGenerateContent}
                disabled={isGenerating !== null}
              >
                <Sparkles size={12} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs rounded-md">
              Generate scene content
            </TooltipContent>
          </Tooltip>
        )}
        {onGenerateImage && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className={cn(
                  'h-7 w-7 p-0 rounded-md text-muted-foreground hover:text-cyan-400 hover:bg-cyan-500/10',
                  isGenerating === BeatGenerationMode.Image && 'animate-pulse text-cyan-400'
                )}
                onClick={onGenerateImage}
                disabled={isGenerating !== null}
              >
                <ImageIcon size={12} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs rounded-md">
              Generate storyboard image
            </TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={onStartEdit}
            >
              <Edit2 size={12} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs rounded-md">
            Edit beat
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={onDelete}
            >
              <Trash2 size={12} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs rounded-md">
            Delete beat
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )}
  </div>
)
