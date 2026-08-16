import type { FC } from 'react'
import { Plus, RefreshCw, Trash2, Shuffle, Loader2 } from 'lucide-react'
import { plotTwistObjectFromJson } from '@/domains/storyteller/core/entities/world-rule-wire'
import { RichText } from '../../RichText'
import { useBible } from './BibleContext'
import { pendingReviewHostClass } from '../constants/section-pending-overlay'
import { SectionPendingOverlay } from './SectionPendingOverlay'
import { bibleSectionItems, planItems } from '../utils/bible-section-items'
import { useStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import { isGenerationActivityBusy } from '@/domains/storyteller/state/constants/storyteller-ui-store'

const PlotTwistDisplayItem: FC<{ twist: unknown; index: number; projectId: string }> = ({
  twist,
  index,
  projectId,
}) => {
  if (typeof twist === 'string') {
    return (
      <div className="p-3 bg-card/50 border border-border/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <RichText text={twist} projectId={projectId} inline />
        </p>
      </div>
    )
  }
  const t = plotTwistObjectFromJson(twist)
  return (
    <div className="p-4 bg-card/50 border border-border/50 rounded-lg space-y-2">
      <h4 className="font-semibold text-red-400">
        <RichText text={t.title || `Twist ${index + 1}`} projectId={projectId} inline />
      </h4>
      {t.description && (
        <p className="text-sm text-muted-foreground">
          <RichText text={t.description} projectId={projectId} inline />
        </p>
      )}
      {t.impact && (
        <p className="text-xs text-muted-foreground/70">
          <span className="font-medium text-amber-400/80">Impact:</span>{' '}
          <RichText text={t.impact} projectId={projectId} inline />
        </p>
      )}
      {t.foreshadowing && (
        <p className="text-xs text-muted-foreground/70">
          <span className="font-medium text-blue-400/80">Foreshadowing:</span>{' '}
          <RichText text={t.foreshadowing} projectId={projectId} inline />
        </p>
      )}
    </div>
  )
}

const PlotTwistsHeaderActions: FC<{
  isLoading: boolean
  isEditing: boolean
  isReadOnly: boolean
  onSendMessage?: (msg: string, section?: string) => void
  onAddPlotTwist: () => void
}> = ({ isLoading, isEditing, isReadOnly, onSendMessage, onAddPlotTwist }) => {
  const generationPhase = useStorytellerUiStore(state => state.generationActivity.phase)
  const generateDisabled = isLoading || isGenerationActivityBusy(generationPhase)

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Shuffle className="w-5 h-5 text-red-400/80" />
        <h3 className="font-syne font-bold text-lg">Twists</h3>
      </div>
      <div className="flex gap-2">
        {isEditing && (
          <button
            onClick={onAddPlotTwist}
            className={`p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105 ${isLoading ? 'pointer-events-none opacity-50' : ''}`}
            title="Add Plot Twist"
            disabled={isLoading}
            type="button"
          >
            <Plus size={14} />
          </button>
        )}
        {!isReadOnly && onSendMessage && (
          <button
            onClick={() =>
              onSendMessage(
                'Generate 3 completely BRAND NEW major plot twists for this story. IMPORTANT: Take a completely new creative direction and do NOT repeat previous twists.',
                'plotTwists'
              )
            }
            className={`p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105 ${generateDisabled ? 'pointer-events-none opacity-50' : ''}`}
            title="Generate Twists"
            disabled={generateDisabled}
            type="button"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        )}
      </div>
    </div>
  )
}

export const BiblePlotTwists: FC = () => {
  const {
    storyPlan,
    isEditing,
    localPlan,
    updatePlotTwist,
    addPlotTwist,
    removePlotTwist,
    isReadOnly,
    onSendMessage,
    loadingSections,
    pendingActions,
    projectId,
  } = useBible()

  const isLoading = loadingSections?.plotTwists?.loading ?? false
  const pending = pendingActions?.plotTwists
  const localPlotTwists = planItems<string>(localPlan.plotTwists)
  const displayPlotTwists = bibleSectionItems<unknown>(
    localPlan.plotTwists,
    storyPlan.plotTwists,
    isEditing
  )

  return (
    <section className={pendingReviewHostClass(Boolean(pending), isLoading)}>
      {isLoading && !pending && (
        <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm rounded-lg flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin text-red-400" />
            <span>Weaving plot surprises...</span>
          </div>
        </div>
      )}
      {pending && <SectionPendingOverlay pendingAction={pending} onReview={pending.onReview} />}
      <PlotTwistsHeaderActions
        isLoading={isLoading}
        isEditing={isEditing}
        isReadOnly={isReadOnly}
        onSendMessage={onSendMessage}
        onAddPlotTwist={addPlotTwist}
      />
      {isEditing ? (
        <div className="space-y-2">
          {localPlotTwists.length === 0 ? (
            <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
              No plot twists defined. Click + to add one.
            </div>
          ) : (
            localPlotTwists.map((twist, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">{i + 1}.</span>
                <input
                  type="text"
                  className="flex-1 p-2 bg-background border border-border rounded text-sm"
                  placeholder="Describe the plot twist..."
                  value={twist}
                  onChange={e => updatePlotTwist(i, e.target.value)}
                />
                <button
                  onClick={() => removePlotTwist(i)}
                  className="p-1.5 text-red-400 hover:bg-red-400/20 rounded"
                  title="Remove Twist"
                  type="button"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      ) : displayPlotTwists.length > 0 ? (
        <div className="space-y-4">
          {displayPlotTwists.map((twist, i) => (
            <PlotTwistDisplayItem key={i} twist={twist} index={i} projectId={projectId} />
          ))}
        </div>
      ) : (
        <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
          No plot twists revealed yet.
        </div>
      )}
    </section>
  )
}
