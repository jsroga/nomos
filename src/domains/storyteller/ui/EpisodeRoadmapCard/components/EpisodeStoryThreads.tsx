import { EpisodeRoadmapEpisode } from '../types/episode-roadmap-card'
import { EpisodeRefText } from './EpisodeRefText'

interface EpisodeStoryThreadsProps {
  episode: EpisodeRoadmapEpisode
  projectId?: string
}

export function EpisodeStoryThreads({ episode, projectId }: EpisodeStoryThreadsProps) {
  const hasStoryThreads = episode.mainPlotBeat || episode.bPlotBeat
  if (!hasStoryThreads) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/5">
      {episode.mainPlotBeat && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold text-indigo-400/80 uppercase tracking-widest">
            A-Story
          </span>
          <div className="text-xs text-muted-foreground/70 leading-relaxed">
            <EpisodeRefText text={episode.mainPlotBeat} projectId={projectId} />
          </div>
        </div>
      )}
      {episode.bPlotBeat && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold text-pink-400/80 uppercase tracking-widest">
            B-Story
          </span>
          <div className="text-xs text-muted-foreground/70 leading-relaxed">
            <EpisodeRefText text={episode.bPlotBeat} projectId={projectId} />
          </div>
        </div>
      )}
    </div>
  )
}
