import { AlertTriangle, Sparkles } from 'lucide-react'
import { EpisodeRoadmapEpisode } from '../types/episode-roadmap-card'
import { EpisodeRefText } from './EpisodeRefText'

interface EpisodeKeyBeatsProps {
  episode: EpisodeRoadmapEpisode
  projectId?: string
}

export function EpisodeKeyBeats({ episode, projectId }: EpisodeKeyBeatsProps) {
  const hasKeyBeats = episode.hook || episode.cliffhanger
  if (!hasKeyBeats) return null

  return (
    <div className="flex flex-wrap gap-4 text-xs pt-2 border-t border-white/5">
      {episode.hook && (
        <div className="flex items-start gap-2 flex-1 min-w-[200px]">
          <Sparkles size={12} className="text-yellow-500/60 mt-0.5 flex-shrink-0" />
          <div>
            <span className="text-[10px] font-semibold text-yellow-400/70 uppercase tracking-wider block mb-0.5">
              Hook
            </span>
            <span className="text-muted-foreground/60 italic">
              "<EpisodeRefText text={episode.hook} projectId={projectId} />"
            </span>
          </div>
        </div>
      )}
      {episode.cliffhanger && (
        <div className="flex items-start gap-2 flex-1 min-w-[200px]">
          <AlertTriangle size={12} className="text-red-400/60 mt-0.5 flex-shrink-0" />
          <div>
            <span className="text-[10px] font-semibold text-red-400/70 uppercase tracking-wider block mb-0.5">
              Cliffhanger
            </span>
            <span className="text-muted-foreground/60 italic">
              "<EpisodeRefText text={episode.cliffhanger} projectId={projectId} />"
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
