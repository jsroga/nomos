import React, { useState } from 'react'
import { cn } from '@/shared/data/utils'
import { EpisodeRoadmapEpisode } from './types/episode-roadmap-card'
import { parseEpisodeDescription } from './utils/parse-episode-description'
import {
  buildActBeats,
  buildStructuralBeats,
  episodeSynopsis,
  episodeTitle,
  hasWritersNotes,
} from './utils/episode-roadmap-beats'
import {
  EpisodeRoadmapCollapsed,
  EpisodeRoadmapExpandedBody,
} from './components/EpisodeRoadmapViews'

export type { EpisodeRoadmapEpisode } from './types/episode-roadmap-card'

interface EpisodeRoadmapCardProps {
  episode: EpisodeRoadmapEpisode
  index: number
  isLast?: boolean
  className?: string
  factions?: { id: string; name: string }[]
  projectId?: string
}

export const EpisodeRoadmapCard: React.FC<EpisodeRoadmapCardProps> = ({
  episode,
  index,
  isLast: _isLast = false,
  className,
  factions = [],
  projectId,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const title = episodeTitle(episode, index)
  const synopsis = episodeSynopsis(episode)
  const { cleanText: cleanDescription, extracted: parsedMeta } = parseEpisodeDescription(
    episode.description || ''
  )
  const structuralBeats = buildStructuralBeats(episode)
  const actBeats = buildActBeats(episode)
  const showWritersRoom = hasWritersNotes(episode, parsedMeta)

  return (
    <div className={cn('group', className)}>
      <EpisodeRoadmapCollapsed
        index={index}
        title={title}
        synopsis={synopsis}
        isExpanded={isExpanded}
        projectId={projectId}
        onToggle={() => setIsExpanded(!isExpanded)}
      />

      {isExpanded && (
        <EpisodeRoadmapExpandedBody
          episode={episode}
          synopsis={synopsis}
          cleanDescription={cleanDescription}
          projectId={projectId}
          actBeats={actBeats}
          structuralBeats={structuralBeats}
          parsedMeta={parsedMeta}
          factions={factions}
          showWritersRoom={showWritersRoom}
        />
      )}
    </div>
  )
}
