import React from 'react'
import { ArrowRight } from 'lucide-react'
import { ActBeat } from '../utils/episode-roadmap-beats'
import { EpisodeRefText } from './EpisodeRefText'

interface EpisodeActStructureProps {
  actBeats: ActBeat[]
  projectId?: string
}

export function EpisodeActStructure({ actBeats, projectId }: EpisodeActStructureProps) {
  if (actBeats.length === 0) return null

  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
          Act Structure
        </span>
      </div>
      <div className="flex items-start gap-3">
        {actBeats.map((beat, i) => (
          <React.Fragment key={beat.label}>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-semibold text-purple-400/70 uppercase tracking-wider block mb-1">
                {beat.label}
              </span>
              <div className="text-xs text-muted-foreground/70 leading-relaxed">
                <EpisodeRefText text={beat.value} projectId={projectId} />
              </div>
            </div>
            {i < actBeats.length - 1 && (
              <ArrowRight size={14} className="text-muted-foreground/20 flex-shrink-0 mt-3" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
