import React from 'react'
import { cn } from '@/shared/data/utils'
import { StructuralBeat } from '../utils/episode-roadmap-beats'
import { EpisodeRefText } from './EpisodeRefText'

interface EpisodeStructuralBeatsGridProps {
  structuralBeats: StructuralBeat[]
  projectId?: string
}

export function EpisodeStructuralBeatsGrid({
  structuralBeats,
  projectId,
}: EpisodeStructuralBeatsGridProps) {
  if (structuralBeats.length === 0) return null

  return (
    <div
      className={cn(
        'grid gap-4',
        structuralBeats.length === 1
          ? 'grid-cols-1'
          : structuralBeats.length <= 2
            ? 'grid-cols-1 md:grid-cols-2'
            : 'grid-cols-1 md:grid-cols-2'
      )}
    >
      {structuralBeats.map(beat => {
        const Icon = beat.icon
        return (
          <div key={beat.label} className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Icon size={12} className={cn(beat.color, 'opacity-70')} />
              <span
                className={cn(
                  'text-[10px] font-semibold uppercase tracking-widest',
                  beat.color,
                  'opacity-70'
                )}
              >
                {beat.label}
              </span>
            </div>
            <div className="text-xs text-muted-foreground/70 leading-relaxed">
              <EpisodeRefText text={beat.value} projectId={projectId} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
