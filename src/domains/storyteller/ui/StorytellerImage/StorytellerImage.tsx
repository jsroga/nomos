import React, { useState } from 'react'
import { Sparkles, Image as ImageIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/Button'
import { cn } from '@/shared/data/utils'
import {
  STORYTELLER_IMAGE_ASPECT_SQUARE,
  STORYTELLER_IMAGE_EMPTY_LABEL,
  StorytellerImageCopy,
} from '@/domains/storyteller/ui/StorytellerImage/constants/storyteller-image'

interface StorytellerImageProps {
  src?: string | null
  alt: string
  className?: string
  isLoading?: boolean
  onGenerate?: () => void
  onImageClick?: () => void
  emptyLabel?: string
  aspectRatio?: string
  overlay?: React.ReactNode
  children?: React.ReactNode
  isPrimary?: boolean
}

function StorytellerImageLoadingOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <div
      className="absolute inset-0 z-20 rounded-lg bg-background/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2"
      aria-busy="true"
      aria-live="polite"
    >
      <Loader2 size={18} className="animate-spin text-primary" />
      <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {StorytellerImageCopy.Generating}
      </span>
    </div>
  )
}

export const StorytellerImage: React.FC<StorytellerImageProps> = ({
  src,
  alt,
  className,
  isLoading = false,
  onGenerate,
  onImageClick,
  emptyLabel = STORYTELLER_IMAGE_EMPTY_LABEL,
  aspectRatio = STORYTELLER_IMAGE_ASPECT_SQUARE,
  overlay,
  children,
  isPrimary = false,
}) => {
  const [imgError, setImgError] = useState(false)
  const canOpenImage = Boolean(onImageClick) && !isLoading

  if (!src || imgError) {
    return (
      <div
        className={cn(
          'relative bg-muted/20 border border-dashed border-border rounded-lg flex flex-col items-center justify-center p-4 text-center group hover:bg-muted/30 transition-colors',
          aspectRatio,
          className
        )}
      >
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
          <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
        </div>
        <p className="text-xs text-muted-foreground mb-3 font-medium">
          {isLoading ? StorytellerImageCopy.Generating : emptyLabel}
        </p>
        {onGenerate && !isLoading ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs hover:border-primary/50 hover:text-primary transition-all"
            onClick={e => {
              e.stopPropagation()
              onGenerate()
            }}
          >
            <Sparkles className="w-3 h-3" /> Generate
          </Button>
        ) : null}
        <StorytellerImageLoadingOverlay visible={isLoading} />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative rounded-lg overflow-hidden group bg-background',
        aspectRatio,
        isPrimary ? 'border-2 border-yellow-400' : 'border border-border',
        canOpenImage ? 'cursor-zoom-in' : undefined,
        className
      )}
      onClick={canOpenImage ? onImageClick : undefined}
    >
      <img
        src={src}
        alt={alt}
        onError={() => setImgError(true)}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />

      {!isLoading && overlay ? (
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-full h-full p-2 flex flex-col items-center justify-center bg-gradient-to-t from-black/80 via-transparent to-black/40">
            {overlay}
          </div>
        </div>
      ) : null}

      {children}
      <StorytellerImageLoadingOverlay visible={isLoading} />
    </div>
  )
}
