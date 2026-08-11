import { cn } from '@/shared/data/utils'
import { ChevronRight } from 'lucide-react'
import { ParsedDescriptionMeta } from '../types/episode-roadmap-card'
import { EpisodeRoadmapEpisode } from '../types/episode-roadmap-card'
import { ActBeat, StructuralBeat } from '../utils/episode-roadmap-beats'
import { EpisodeActStructure } from './EpisodeActStructure'
import { EpisodeKeyBeats } from './EpisodeKeyBeats'
import { EpisodeRefText } from './EpisodeRefText'
import { EpisodeStoryThreads } from './EpisodeStoryThreads'
import { EpisodeStructuralBeatsGrid } from './EpisodeStructuralBeatsGrid'
import { EpisodeWritersRoom } from './EpisodeWritersRoom'

interface EpisodeRoadmapCollapsedProps {
  index: number
  title: string
  synopsis: string
  isExpanded: boolean
  projectId?: string
  onToggle: () => void
}

export function EpisodeRoadmapCollapsed({
  index,
  title,
  synopsis,
  isExpanded,
  projectId,
  onToggle,
}: EpisodeRoadmapCollapsedProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-4 py-3.5 px-4 cursor-pointer transition-all duration-200 rounded-lg',
        'hover:bg-white/[0.03]',
        isExpanded && 'bg-white/[0.02]'
      )}
      onClick={onToggle}
    >
      <div
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm transition-colors mt-0.5',
          isExpanded
            ? 'bg-purple-500/20 text-purple-300'
            : 'bg-white/5 text-muted-foreground group-hover:bg-purple-500/10 group-hover:text-purple-400'
        )}
      >
        {index + 1}
      </div>

      <div className="flex-1 min-w-0">
        <h4
          className={cn(
            'font-semibold text-sm transition-colors',
            isExpanded ? 'text-white' : 'text-foreground/90 group-hover:text-white'
          )}
        >
          {title}
        </h4>
        {synopsis && (
          <div className="text-xs text-muted-foreground/70 mt-1 line-clamp-2 leading-relaxed">
            <EpisodeRefText text={synopsis} projectId={projectId} />
          </div>
        )}
      </div>

      <ChevronRight
        size={16}
        className={cn(
          'flex-shrink-0 text-muted-foreground/40 transition-transform duration-200 mt-1',
          isExpanded && 'rotate-90'
        )}
      />
    </div>
  )
}

interface EpisodeRoadmapExpandedBodyProps {
  episode: EpisodeRoadmapEpisode
  synopsis: string
  cleanDescription: string
  projectId?: string
  actBeats: ActBeat[]
  structuralBeats: StructuralBeat[]
  parsedMeta: ParsedDescriptionMeta
  factions: { id: string; name: string }[]
  showWritersRoom: boolean
}

export function EpisodeRoadmapExpandedBody({
  episode,
  synopsis,
  cleanDescription,
  projectId,
  actBeats,
  structuralBeats,
  parsedMeta,
  factions,
  showWritersRoom,
}: EpisodeRoadmapExpandedBodyProps) {
  return (
    <div className="pl-14 pr-4 pb-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
      {synopsis && (
        <div className="text-sm text-muted-foreground/80 leading-relaxed">
          <EpisodeRefText text={synopsis} projectId={projectId} />
        </div>
      )}
      {cleanDescription && cleanDescription !== synopsis && (
        <div className="text-sm text-muted-foreground/80 leading-relaxed">
          <EpisodeRefText text={cleanDescription} projectId={projectId} />
        </div>
      )}

      <EpisodeActStructure actBeats={actBeats} projectId={projectId} />
      <EpisodeStructuralBeatsGrid structuralBeats={structuralBeats} projectId={projectId} />
      <EpisodeStoryThreads episode={episode} projectId={projectId} />
      <EpisodeKeyBeats episode={episode} projectId={projectId} />
      {showWritersRoom && (
        <EpisodeWritersRoom episode={episode} parsedMeta={parsedMeta} factions={factions} />
      )}
    </div>
  )
}
