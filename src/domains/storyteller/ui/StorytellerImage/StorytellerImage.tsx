import React, { useState } from 'react'
import { Sparkles, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/shared/data/utils'
// LiquidGlass removed


interface StorytellerImageProps {
  src?: string | null
  alt: string
  className?: string
  isLoading?: boolean
  onGenerate?: () => void
  emptyLabel?: string
  aspectRatio?: string
  overlay?: React.ReactNode
  children?: React.ReactNode // For things like primary indicator
  isPrimary?: boolean
}

export const StorytellerImage: React.FC<StorytellerImageProps> = ({
  src,
  alt,
  className,
  isLoading = false,
  onGenerate,
  emptyLabel = 'No Image',
  aspectRatio = 'aspect-square',
  overlay,
  children,
  isPrimary = false,
}) => {
  const [imgError, setImgError] = useState(false)

  // Resolve URL (handle local project paths)
  // Assuming usage context provides raw filename or full URL
  // But since this is a generic component, we should probably expect the caller to resolve the URL
  // OR we standardize it here. The panels were doing logic like:
  // img.startsWith('http') ? img : `/projects/${projectId}/${img}`
  // It's cleaner if the parent passes the fully resolved URL.

  // Loading State
  if (isLoading) {
    return (
      <div
        className={cn(
          'relative overflow-hidden group rounded-lg border border-border/50',
          aspectRatio,
          className
        )}
      >
        <div className="absolute inset-0 w-full h-full bg-muted/10 backdrop-blur-md">
          <div className="flex flex-col items-center justify-center w-full h-full p-4 relative z-20">
            <div className="relative">
              <img
                src="/favicon.svg"
                alt="Loading..."
                className="w-12 h-12 opacity-80 animate-pulse drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]"
              />
              {/* Spinning ring around logo */}
              <div className="absolute inset-[-8px] rounded-full border-2 border-primary/30 border-t-white/80 animate-spin" />
            </div>
            <p className="mt-4 text-xs font-mono text-white/90 font-bold tracking-widest uppercase animate-pulse">
              Dreaming...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Empty State
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
        <p className="text-xs text-muted-foreground mb-3 font-medium">{emptyLabel}</p>
        {onGenerate && (
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
        )}
      </div>
    )
  }

  // Image State
  return (
    <div
      className={cn(
        'relative rounded-lg overflow-hidden group bg-background',
        aspectRatio,
        isPrimary ? 'border-2 border-yellow-400' : 'border border-border',
        className
      )}
    >
      <img
        src={src}
        alt={alt}
        onError={() => setImgError(true)}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />

      {/* Overlay for Actions */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
        <div className="w-full h-full p-2 flex flex-col items-center justify-center bg-gradient-to-t from-black/80 via-transparent to-black/40">
          {overlay}
        </div>
      </div>

      {/* Static Children (Indicators like stars) */}
      {children}
    </div>
  )
}
