import React from 'react'
import { Scale, Plus, RefreshCw, Trash2, Shuffle, Loader2 } from 'lucide-react'
import { WorldRule } from '../../schemas/agent-schemas'
import { WorldRuleCard } from '../WorldRuleCard'
import { RichText } from '../RichText'

import { useBible } from './BibleContext'
import { SectionPendingOverlay } from './SectionPendingOverlay'

interface BibleWorldLogicProps { }

export const BibleWorldLogic: React.FC<BibleWorldLogicProps> = () => {
  const {
    storyPlan,
    isEditing,
    localPlan,
    updateWorldRule: onWorldRuleChange,
    addWorldRule: onAddWorldRule,
    removeWorldRule: onRemoveWorldRule,
    updatePlotTwist: onPlotTwistChange,
    addPlotTwist: onAddPlotTwist,
    removePlotTwist: onRemovePlotTwist,
    isReadOnly,
    onSendMessage,
    loadingSections,
    pendingActions,
    projectId,
  } = useBible()
  const rules = Array.isArray(storyPlan.worldRules) ? storyPlan.worldRules : []
  const localRules = Array.isArray(localPlan.worldRules) ? localPlan.worldRules : []
  const plotTwists = Array.isArray(storyPlan.plotTwists) ? storyPlan.plotTwists : []
  const localPlotTwists = Array.isArray(localPlan.plotTwists) ? localPlan.plotTwists : []
  
  
  // Check loading states for each section
  const isWorldRulesLoading = loadingSections?.worldRules?.loading ?? false
  const isPlotTwistsLoading = loadingSections?.plotTwists?.loading ?? false
  
  // Check pending actions for each section
  const worldRulesPending = pendingActions?.worldRules
  const plotTwistsPending = pendingActions?.plotTwists

  return (
    <div className="space-y-8">
      {/* WORLD RULES SECTION */}
      <section className={(isWorldRulesLoading || worldRulesPending) ? 'relative' : ''}>
        {/* Loading overlay */}
        {isWorldRulesLoading && !worldRulesPending && (
          <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm rounded-lg flex items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span>Crafting world rules...</span>
            </div>
          </div>
        )}
        {/* Pending action overlay */}
        {worldRulesPending && (
          <SectionPendingOverlay pendingAction={worldRulesPending} onReview={worldRulesPending.onReview} />
        )}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-purple-400/80" />
            <h3 className="font-syne font-bold text-lg">World Logic</h3>
          </div>
          <div className="flex gap-2">
            {isEditing && (
              <button
                onClick={onAddWorldRule}
                className={`p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105 ${isWorldRulesLoading ? 'pointer-events-none opacity-50' : ''}`}
                title="Add World Rule"
                disabled={isWorldRulesLoading}
              >
                <Plus size={14} />
              </button>
            )}
            {!isReadOnly && onSendMessage && (
              <button
                onClick={() =>
                  onSendMessage?.(
                    'Generate the fundamental laws and rules that govern this world - magic systems, physics, social contracts, etc. Mention examples of excellent world rules like in Death Note, Case of Golden Idol (game), Game of Thrones, Pluribus.',
                    'worldRules'
                  )
                }
                className={`p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105 ${isWorldRulesLoading ? 'pointer-events-none opacity-50' : ''}`}
                title="Generate World Rules"
                disabled={isWorldRulesLoading}
              >
                <RefreshCw size={14} className={isWorldRulesLoading ? 'animate-spin' : ''} />
              </button>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-4">
            {localRules.length === 0 ? (
              <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
                No world rules defined. Click + to add one.
              </div>
            ) : (
              localRules.map((rule, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-muted/10 border border-border rounded-lg space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <select
                      className="p-2 bg-background border border-border rounded text-sm"
                      value={rule.category}
                      onChange={e =>
                        onWorldRuleChange(idx, 'category', e.target.value as WorldRule['category'])
                      }
                    >
                      {['Physics', 'Magic', 'Technology', 'Society', 'Politics', 'Economics'].map(
                        cat => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        )
                      )}
                    </select>
                    <button
                      onClick={() => onRemoveWorldRule(idx)}
                      className="p-1.5 text-red-400 hover:bg-red-400/20 rounded"
                      title="Remove Rule"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <input
                    type="text"
                    className="w-full p-2 bg-background border border-border rounded text-sm"
                    placeholder="The rule..."
                    value={rule.rule || ''}
                    onChange={e => onWorldRuleChange(idx, 'rule', e.target.value)}
                  />
                  <input
                    type="text"
                    className="w-full p-2 bg-background border border-border rounded text-sm"
                    placeholder="Consequence if broken..."
                    value={rule.consequence || ''}
                    onChange={e => onWorldRuleChange(idx, 'consequence', e.target.value)}
                  />
                  <input
                    type="text"
                    className="w-full p-2 bg-background border border-border rounded text-sm"
                    placeholder="Exceptions (optional)..."
                    value={rule.exceptions || ''}
                    onChange={e => onWorldRuleChange(idx, 'exceptions', e.target.value || null)}
                  />
                </div>
              ))
            )}
          </div>
        ) : rules.length === 0 ? (
          <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
            No world rules defined yet. The laws of nature (or magic) are unspoken.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.map((rule, idx) => {
              if (!rule) return null
              return <WorldRuleCard key={idx} rule={rule as WorldRule} projectId={projectId} />
            })}
          </div>
        )}
      </section>

      {/* PLOT TWISTS SECTION */}
      <section className={(isPlotTwistsLoading || plotTwistsPending) ? 'relative' : ''}>
        {/* Loading overlay */}
        {isPlotTwistsLoading && !plotTwistsPending && (
          <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm rounded-lg flex items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-red-400" />
              <span>Weaving plot surprises...</span>
            </div>
          </div>
        )}
        {/* Pending action overlay */}
        {plotTwistsPending && (
          <SectionPendingOverlay pendingAction={plotTwistsPending} onReview={plotTwistsPending.onReview} />
        )}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shuffle className="w-5 h-5 text-red-400/80" />
            <h3 className="font-syne font-bold text-lg">Twists</h3>
          </div>
          <div className="flex gap-2">
            {isEditing && (
              <button
                onClick={onAddPlotTwist}
                className={`p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105 ${isPlotTwistsLoading ? 'pointer-events-none opacity-50' : ''}`}
                title="Add Plot Twist"
                disabled={isPlotTwistsLoading}
              >
                <Plus size={14} />
              </button>
            )}
            {!isReadOnly && onSendMessage && (
              <button
                onClick={() => onSendMessage?.('Generate 3 major plot twists for this story.', 'plotTwists')}
                className={`p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105 ${isPlotTwistsLoading ? 'pointer-events-none opacity-50' : ''}`}
                title="Generate Twists"
                disabled={isPlotTwistsLoading}
              >
                <RefreshCw size={14} className={isPlotTwistsLoading ? 'animate-spin' : ''} />
              </button>
            )}
          </div>
        </div>
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
                    onChange={e => onPlotTwistChange(i, e.target.value)}
                  />
                  <button
                    onClick={() => onRemovePlotTwist(i)}
                    className="p-1.5 text-red-400 hover:bg-red-400/20 rounded"
                    title="Remove Twist"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        ) : plotTwists.length > 0 ? (
          <div className="space-y-4">
            {plotTwists.map((twist, i) => {
              // Handle both string and object formats
              if (typeof twist === 'string') {
                return (
                  <div key={i} className="p-3 bg-card/50 border border-border/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <RichText text={twist} projectId={projectId} inline />
                    </p>
                  </div>
                )
              }
              // Object format: {title, description, impact, foreshadowing}
              const t = twist as { title?: string; description?: string; impact?: string; foreshadowing?: string }
              return (
                <div key={i} className="p-4 bg-card/50 border border-border/50 rounded-lg space-y-2">
                  <h4 className="font-semibold text-red-400">
                    <RichText text={t.title || `Twist ${i + 1}`} projectId={projectId} inline />
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
            })}
          </div>
        ) : (
          <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
            No plot twists revealed yet.
          </div>
        )}
      </section>
    </div>
  )
}
