import React from 'react'
import { Scale, Plus, RefreshCw, Trash2, Shuffle, Loader2 } from 'lucide-react'
import { WorldRule } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import {
  isWorldRule,
  parseWorldRuleCategory,
  plotTwistObjectFromJson,
  WorldRuleCategory,
} from '@/domains/storyteller/core/entities/world-rule-wire'
import { WorldRuleCard } from '../WorldRuleCard'
import { RichText } from '../RichText'

import { useBible } from './BibleContext'
import { SectionPendingOverlay } from './SectionPendingOverlay'

function planItems<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : []
}

/** Editing: local draft only. Viewing: prefer saved local draft, fall back to server plan. */
function bibleSectionItems<T>(local: unknown, saved: unknown, editing: boolean): T[] {
  const draft = planItems<T>(local)
  return editing || draft.length > 0 ? draft : planItems<T>(saved)
}

interface BibleWorldLogicProps { }

const WorldRuleEditItem: React.FC<{
  rule: WorldRule
  idx: number
  onChange: <K extends keyof WorldRule>(index: number, field: K, value: WorldRule[K]) => void
  onRemove: (index: number) => void
}> = ({ rule, idx, onChange, onRemove }) => (
  <div className="p-4 bg-muted/10 border border-border rounded-lg space-y-3">
    <div className="flex items-start justify-between">
      <select
        className="p-2 bg-background border border-border rounded text-sm"
        value={rule.category}
        onChange={e => {
          const category = parseWorldRuleCategory(e.target.value)
          if (category) onChange(idx, 'category', category)
        }}
      >
        {Object.values(WorldRuleCategory).map(cat => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>
      <button
        onClick={() => onRemove(idx)}
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
      onChange={e => onChange(idx, 'rule', e.target.value)}
    />
    <input
      type="text"
      className="w-full p-2 bg-background border border-border rounded text-sm"
      placeholder="Consequence if broken..."
      value={rule.consequence || ''}
      onChange={e => onChange(idx, 'consequence', e.target.value)}
    />
    <input
      type="text"
      className="w-full p-2 bg-background border border-border rounded text-sm"
      placeholder="Exceptions (optional)..."
      value={rule.exceptions || ''}
      onChange={e => onChange(idx, 'exceptions', e.target.value || null)}
    />
  </div>
)

const PlotTwistDisplayItem: React.FC<{ twist: unknown; index: number; projectId: string }> = ({
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

const PlotTwistsSection: React.FC<{
  isLoading: boolean
  pending: React.ComponentProps<typeof SectionPendingOverlay>['pendingAction'] | undefined
  isEditing: boolean
  isReadOnly: boolean
  onSendMessage?: (msg: string, section?: string) => void
  onAddPlotTwist: () => void
  localPlotTwists: string[]
  displayPlotTwists: unknown[]
  onPlotTwistChange: (index: number, value: string) => void
  onRemovePlotTwist: (index: number) => void
  projectId: string
}> = ({
  isLoading,
  pending,
  isEditing,
  isReadOnly,
  onSendMessage,
  onAddPlotTwist,
  localPlotTwists,
  displayPlotTwists,
  onPlotTwistChange,
  onRemovePlotTwist,
  projectId,
}) => (
  <section className={isLoading || pending ? 'relative' : ''}>
    {isLoading && !pending && (
      <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm rounded-lg flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin text-red-400" />
          <span>Weaving plot surprises...</span>
        </div>
      </div>
    )}
    {pending && <SectionPendingOverlay pendingAction={pending} onReview={pending.onReview} />}
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
          >
            <Plus size={14} />
          </button>
        )}
        {!isReadOnly && onSendMessage && (
          <button
            onClick={() =>
              onSendMessage?.('Generate 3 completely BRAND NEW major plot twists for this story. IMPORTANT: Take a completely new creative direction and do NOT repeat previous twists.', 'plotTwists')
            }
            className={`p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105 ${isLoading ? 'pointer-events-none opacity-50' : ''}`}
            title="Generate Twists"
            disabled={isLoading}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
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

  const localRules = planItems<WorldRule>(localPlan.worldRules)
  const displayRules = bibleSectionItems(localPlan.worldRules, storyPlan.worldRules, isEditing)
  const localPlotTwists = planItems<string>(localPlan.plotTwists)
  const displayPlotTwists = bibleSectionItems(localPlan.plotTwists, storyPlan.plotTwists, isEditing)

  // Check loading states for each section
  const isWorldRulesLoading = loadingSections?.worldRules?.loading ?? false
  const isPlotTwistsLoading = loadingSections?.plotTwists?.loading ?? false

  // Check pending actions for each section
  const worldRulesPending = pendingActions?.worldRules
  const plotTwistsPending = pendingActions?.plotTwists

  return (
    <div className="space-y-8">
      {/* WORLD RULES SECTION */}
      <section className={isWorldRulesLoading || worldRulesPending ? 'relative' : ''}>
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
          <SectionPendingOverlay
            pendingAction={worldRulesPending}
            onReview={worldRulesPending.onReview}
          />
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
                    'Generate BRAND NEW fundamental laws and rules that govern this world - magic systems, physics, social contracts, etc. Mention examples of excellent world rules like in Death Note, Case of Golden Idol (game), Game of Thrones, Pluribus. IMPORTANT: Take a completely new creative direction and do NOT repeat previous rules.',
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
                <WorldRuleEditItem
                  key={idx}
                  rule={rule}
                  idx={idx}
                  onChange={onWorldRuleChange}
                  onRemove={onRemoveWorldRule}
                />
              ))
            )}
          </div>
        ) : displayRules.length === 0 ? (
          <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
            No world rules defined yet. The laws of nature (or magic) are unspoken.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayRules.map((rule, idx) => {
              if (!rule) return null
              if (!isWorldRule(rule)) return null
              return <WorldRuleCard key={idx} rule={rule} projectId={projectId} />
            })}
          </div>
        )}
      </section>

      {/* PLOT TWISTS SECTION */}
      <PlotTwistsSection
        isLoading={isPlotTwistsLoading}
        pending={plotTwistsPending}
        isEditing={isEditing}
        isReadOnly={isReadOnly}
        onSendMessage={onSendMessage}
        onAddPlotTwist={onAddPlotTwist}
        localPlotTwists={localPlotTwists}
        displayPlotTwists={displayPlotTwists}
        onPlotTwistChange={onPlotTwistChange}
        onRemovePlotTwist={onRemovePlotTwist}
        projectId={projectId}
      />
    </div>
  )
}
