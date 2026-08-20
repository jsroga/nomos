import type { FC } from 'react'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import { Route } from 'lucide-react'
import { SeasonOverviewCard } from '../../SeasonOverviewCard'
import { EpisodeRoadmapCard } from '../../EpisodeRoadmapCard'
import { useBible } from './BibleContext'
import { BibleSectionHeader, BibleSectionShell } from './BibleSectionChrome'
import { BIBLE_ROADMAP_GENERATE_PROMPT } from '../constants/bible-roadmap'
import {
  resolveRoadmapSeasonStructure,
  resolveRoadmapSequences,
} from '../utils/bible-roadmap-display'

interface BibleRoadmapProps {}

type RoadmapSeason = React.ComponentProps<typeof SeasonOverviewCard>['seasonStructure']
type RoadmapEpisode = React.ComponentProps<typeof EpisodeRoadmapCard>['episode']

const RoadmapEditView: FC<{
  seasonStructure?: RoadmapSeason
  sequences: RoadmapEpisode[]
  projectId: string
}> = ({ seasonStructure, sequences, projectId }) => (
  <div className="space-y-6">
    {seasonStructure && <SeasonOverviewCard seasonStructure={seasonStructure} />}
    <div className="space-y-4">
      {sequences.length === 0 ? (
        <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
          No episodes defined. Click + to add one.
        </div>
      ) : (
        sequences.map((seq, idx) => (
          <EpisodeRoadmapCard key={idx} episode={seq} index={idx} projectId={projectId} />
        ))
      )}
    </div>
  </div>
)

const RoadmapDisplayView: FC<{
  seasonStructure?: RoadmapSeason
  sequences: RoadmapEpisode[]
  projectId: string
}> = ({ seasonStructure, sequences, projectId }) => (
  <div className="space-y-6">
    {seasonStructure && <SeasonOverviewCard seasonStructure={seasonStructure} />}
    {sequences.length === 0 ? (
      <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
        No roadmap defined yet. The journey is unwritten.
      </div>
    ) : (
      <div className="space-y-1">
        {sequences.map((seq, idx) => (
          <EpisodeRoadmapCard key={idx} episode={seq} index={idx} projectId={projectId} />
        ))}
      </div>
    )}
  </div>
)

export const BibleRoadmap: FC<BibleRoadmapProps> = () => {
  const {
    storyPlan,
    isEditing,
    localPlan,
    addSequence,
    isReadOnly,
    onSendMessage,
    loadingSections,
    pendingActions,
    projectId,
  } = useBible()

  const displaySequences = resolveRoadmapSequences(isEditing, localPlan, storyPlan)
  const displaySeasonStructure = resolveRoadmapSeasonStructure(isEditing, localPlan, storyPlan)
  const isLoading = loadingSections?.episodeRoadmap?.loading ?? false
  const pendingAction = pendingActions?.episodeRoadmap

  return (
    <BibleSectionShell
      isLoading={isLoading}
      loadingMessage="Generating roadmap..."
      pendingAction={pendingAction}
    >
      <BibleSectionHeader
        icon={<Route className="w-5 h-5 text-green-400/80" />}
        title="Roadmap"
        isEditing={isEditing}
        isReadOnly={isReadOnly}
        onAdd={addSequence}
        addTitle="Add Episode"
        onGenerate={
          onSendMessage
            ? () =>
                onSendMessage(BIBLE_ROADMAP_GENERATE_PROMPT, BibleSection.EPISODE_ROADMAP)
            : undefined
        }
        generateTitle="Generate Roadmap"
      />
      {isEditing ? (
        <RoadmapEditView
          seasonStructure={localPlan.seasonStructure ?? undefined}
          sequences={localPlan.sequences || []}
          projectId={projectId}
        />
      ) : (
        <RoadmapDisplayView
          seasonStructure={displaySeasonStructure ?? undefined}
          sequences={displaySequences}
          projectId={projectId}
        />
      )}
    </BibleSectionShell>
  )
}
