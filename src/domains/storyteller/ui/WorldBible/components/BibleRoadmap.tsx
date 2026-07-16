import React from 'react'
import { Route, Plus, RefreshCw, Loader2 } from 'lucide-react'
import { SeasonOverviewCard } from '../../SeasonOverviewCard'
import { EpisodeRoadmapCard } from '../../EpisodeRoadmapCard'

import { useBible } from './bible-context'
import { SectionPendingOverlay } from './SectionPendingOverlay'
import { BIBLE_ROADMAP_SEQUENCES_LOG_PREFIX } from '@/domains/storyteller/ui/WorldBible/constants/bible-roadmap'

interface BibleRoadmapProps { }

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

  // Debug: log roadmap data to help diagnose display issues
  if (typeof window !== 'undefined') {
    console.log(BIBLE_ROADMAP_SEQUENCES_LOG_PREFIX, displaySequences.length, {
      localPlanSequences: localPlan.sequences?.length,
      storyPlanSequences: storyPlan.sequences?.length,
      storyPlanEpisodeRoadmapEpisodes: storyPlan.episodeRoadmap?.episodes?.length,
    })
  }
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
      {/* Pending action overlay */}
      {pendingAction && (
        <SectionPendingOverlay pendingAction={pendingAction} onReview={pendingAction.onReview} />
      )}
      {/* Loading Overlay */}
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

      {isEditing ? (
        <div className="space-y-6">
          {localPlan.seasonStructure && (
            <SeasonOverviewCard seasonStructure={localPlan.seasonStructure} />
          )}

          <div className="space-y-4">
            {(localPlan.sequences || []).length === 0 ? (
              <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
                No episodes defined. Click + to add one.
              </div>
            ) : (
              (localPlan.sequences || []).map((seq, idx) => (
                <EpisodeRoadmapCard key={idx} episode={seq} index={idx} projectId={projectId} />
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Legend / Overview */}
          {displaySeasonStructure && (
            <SeasonOverviewCard seasonStructure={displaySeasonStructure} />
          )}

          {/* Sequences List */}
          {displaySequences.length === 0 ? (
            <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
              No roadmap defined yet. The journey is unwritten.
            </div>
          ) : (
            <div className="space-y-1">
              {displaySequences.map((seq, idx) => (
                <EpisodeRoadmapCard key={idx} episode={seq} index={idx} projectId={projectId} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
