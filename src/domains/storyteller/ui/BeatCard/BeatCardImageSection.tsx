import React from 'react'
import { Skeleton } from '@/components/Skeleton'

interface BeatCardImageSectionProps {
  imageUrl?: string
  imagePrompt?: string
  projectId: string
  beatId: string
  onExpand?: (id: string) => void
}

export const BeatCardImageSection: React.FC<BeatCardImageSectionProps> = ({
  imageUrl,
  imagePrompt,
  projectId,
  beatId,
  onExpand,
}) => {
  if (!imageUrl && !imagePrompt) {
    return null
  }

  return (
    <div
      className="mt-3 w-full aspect-video rounded-md overflow-hidden border border-border relative group/image cursor-zoom-in"
      onClick={() => imageUrl && onExpand?.(beatId)}
    >
      {imageUrl ? (
        <img
          src={`/projects/${projectId}/${imageUrl}`}
          alt={imagePrompt || 'Beat storyboard'}
          className="w-full h-full object-cover transition-transform duration-300 group-hover/image:scale-[1.02]"
        />
      ) : (
        <div className="w-full h-full relative">
          <Skeleton className="w-full h-full absolute inset-0 rounded-none" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-[10px] text-muted-foreground animate-pulse">
              Generating…
            </span>
          </div>
        </div>
      )}
      {imagePrompt && imageUrl && (
        <div className="absolute inset-0 bg-black/80 p-2 font-mono text-[10px] text-white opacity-0 group-hover/image:opacity-100 transition-opacity overflow-y-auto">
          {imagePrompt}
        </div>
      )}
    </div>
  )
}
