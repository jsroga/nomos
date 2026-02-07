import React from 'react'
import { Route, Plus, RefreshCw, Loader2 } from 'lucide-react'
import { SeasonOverviewCard } from '../SeasonOverviewCard'
import { EpisodeRoadmapCard } from '../EpisodeRoadmapCard'

import { useBible } from './BibleContext'
import { SectionPendingOverlay } from './SectionPendingOverlay'

interface BibleRoadmapProps {}

export const BibleRoadmap: React.FC<BibleRoadmapProps> = () => {
  const {
    storyPlan,
    isEditing,
    localPlan,
    updateSequence: onSequenceChange,
    addSequence: onAddSequence,
    removeSequence: onRemoveSequence,
    isReadOnly,
    onSendMessage,
    loadingSections,
    pendingActions,
  } = useBible()
  const sequences = storyPlan.sequences || []
  
  // Check for loading state - roadmap uses 'episodeRoadmap' section key
  const isLoading = loadingSections?.episodeRoadmap?.loading ?? false
  const pendingAction = pendingActions?.episodeRoadmap

  return (
    <section className={isLoading || pendingAction ? 'relative' : ''}>
      {/* Pending action overlay */}
      {pendingAction && (
        <SectionPendingOverlay 
          pendingAction={pendingAction}
          onReview={pendingAction.onReview}
        />
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
                  'Break the season into a roadmap of 8-12 episodes. Use a professional showrunner approach: define the inciting incident, midpoint, and finale first, then fill in the connective tissue.',
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
                <EpisodeRoadmapCard key={idx} episode={seq} index={idx} />
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Legend / Overview */}
          {storyPlan.seasonStructure && (
            <SeasonOverviewCard seasonStructure={storyPlan.seasonStructure} />
          )}

          {/* Sequences List */}
          {sequences.length === 0 ? (
            <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
              No roadmap defined yet. The journey is unwritten.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sequences.map((seq, idx) => (
                <EpisodeRoadmapCard key={idx} episode={seq} index={idx} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
