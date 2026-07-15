import React from 'react'
import { Route, Plus, RefreshCw, Loader2 } from 'lucide-react'
import { SeasonOverviewCard } from '../SeasonOverviewCard'
import { EpisodeRoadmapCard } from '../EpisodeRoadmapCard'

import { useBible } from './BibleContext'
import { SectionPendingOverlay } from './SectionPendingOverlay'

interface BibleRoadmapProps { }

type RoadmapSeason = React.ComponentProps<typeof SeasonOverviewCard>['seasonStructure']
type RoadmapEpisode = React.ComponentProps<typeof EpisodeRoadmapCard>['episode']

const RoadmapEditView: React.FC<{
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

const RoadmapDisplayView: React.FC<{
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

const RoadmapHeader: React.FC<{
  isLoading: boolean
  pendingAction: React.ComponentProps<typeof SectionPendingOverlay>['pendingAction'] | undefined
  isEditing: boolean
  isReadOnly: boolean
  onSendMessage?: (msg: string, section?: string) => void
  onAddSequence: () => void
}> = ({ isLoading, pendingAction, isEditing, isReadOnly, onSendMessage, onAddSequence }) => (
  <>
    {pendingAction && (
      <SectionPendingOverlay pendingAction={pendingAction} onReview={pendingAction.onReview} />
    )}
    {isLoading && !pendingAction && (
      <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm rounded-lg flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Generating roadmap...</span>
        </div>
      </div>
    )}
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Route className="w-5 h-5 text-green-400/80" />
        <h3 className="font-syne font-bold text-lg">Roadmap</h3>
      </div>
      <div className="flex gap-2">
        {isEditing && (
          <button
            onClick={onAddSequence}
            className="p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105"
            title="Add Episode"
          >
            <Plus size={14} />
          </button>
        )}
        {!isReadOnly && onSendMessage && (
          <button
            onClick={() =>
              onSendMessage?.(
                'Break the season into a completely BRAND NEW roadmap of 8-12 episodes. Use a professional showrunner approach: define the inciting incident, midpoint, and finale first, then fill in the connective tissue. IMPORTANT: Take a completely new creative direction and do NOT repeat previous episodes.',
                'episodeRoadmap'
              )
            }
            className="p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105"
            title="Generate Roadmap"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>
    </div>
  </>
)

export const BibleRoadmap: React.FC<BibleRoadmapProps> = () => {
  const {
    storyPlan,
    isEditing,
    localPlan,
    updateSequence: _onSequenceChange,
    addSequence: onAddSequence,
    removeSequence: _onRemoveSequence,
    isReadOnly,
    onSendMessage,
    loadingSections,
    pendingActions,
    projectId,
  } = useBible()
  // Use localPlan for display when not editing to show latest saved data
  // Note: prefer non-empty arrays — an empty [] from a stale episode plan fetch must not block
  // episodeRoadmap.episodes from showing after a roadmap approval.
  const resolveSequences = <T,>(seqs: T[] | undefined | null) =>
    seqs && seqs.length > 0 ? seqs : undefined
  const displaySequences = isEditing
    ? (localPlan.sequences || [])
    : (resolveSequences(localPlan.sequences) ||
      storyPlan.episodeRoadmap?.episodes ||
      storyPlan.episodeRoadmap?.sequences ||
      resolveSequences(storyPlan.sequences) ||
      [])

  // episodeRoadmap.seasonStructure is a loose record field in the schema
  const roadmapSeasonStructure = storyPlan.episodeRoadmap?.seasonStructure
  const displaySeasonStructure = isEditing
    ? localPlan.seasonStructure
    : localPlan.seasonStructure ||
      storyPlan.seasonStructure ||
      (typeof roadmapSeasonStructure === 'string' ? roadmapSeasonStructure : undefined)

  // Check for loading state - roadmap uses 'episodeRoadmap' section key
  const isLoading = loadingSections?.episodeRoadmap?.loading ?? false
  const pendingAction = pendingActions?.episodeRoadmap

  return (
    <section className={isLoading || pendingAction ? 'relative' : ''}>
      <RoadmapHeader
        isLoading={isLoading}
        pendingAction={pendingAction}
        isEditing={isEditing}
        isReadOnly={isReadOnly}
        onSendMessage={onSendMessage}
        onAddSequence={onAddSequence}
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
    </section>
  )
}
