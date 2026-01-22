import React from 'react'
import { Scale, Plus, RefreshCw, Trash2, Shuffle } from 'lucide-react'
import { StoryPlan, WorldRule } from '../../schemas/agent-schemas'
import { WorldRuleCard } from '../WorldRuleCard'

import { useBible } from './BibleContext'

interface BibleWorldLogicProps {}

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
  } = useBible()
  const rules = storyPlan.worldRules || []

  return (
    <div className="space-y-8">
      {/* WORLD RULES SECTION */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-purple-400/80" />
            <h3 className="font-syne font-bold text-lg">World Logic</h3>
          </div>
          <div className="flex gap-2">
            {isEditing && (
              <button
                onClick={onAddWorldRule}
                className="p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105"
                title="Add World Rule"
              >
                <Plus size={14} />
              </button>
            )}
            {!isReadOnly && onSendMessage && (
              <button
                onClick={() =>
                  onSendMessage(
                    'Generate the fundamental laws and rules that govern this world - magic systems, physics, social contracts, etc. Mention examples of excellent world rules like in Death Note, Case of Golden Idol (game), Game of Thrones, Pluribus.'
                  )
                }
                className="p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105"
                title="Generate World Rules"
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-4">
            {(localPlan.worldRules || []).length === 0 ? (
              <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
                No world rules defined. Click + to add one.
              </div>
            ) : (
              (localPlan.worldRules || []).map((rule, idx) => (
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
              return <WorldRuleCard key={idx} rule={rule as WorldRule} />
            })}
          </div>
        )}
      </section>

      {/* PLOT TWISTS SECTION */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shuffle className="w-5 h-5 text-red-400/80" />
            <h3 className="font-syne font-bold text-lg">Twists</h3>
          </div>
          <div className="flex gap-2">
            {isEditing && (
              <button
                onClick={onAddPlotTwist}
                className="p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105"
                title="Add Plot Twist"
              >
                <Plus size={14} />
              </button>
            )}
            {!isReadOnly && onSendMessage && (
              <button
                onClick={() => onSendMessage('Generate 3 major plot twists for this story.')}
                className="p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105"
                title="Generate Twists"
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>
        </div>
        {isEditing ? (
          <div className="space-y-2">
            {(localPlan.plotTwists || []).length === 0 ? (
              <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
                No plot twists defined. Click + to add one.
              </div>
            ) : (
              (localPlan.plotTwists || []).map((twist, i) => (
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
        ) : storyPlan.plotTwists && storyPlan.plotTwists.length > 0 ? (
          <ul className="list-disc pl-5 space-y-2">
            {storyPlan.plotTwists.map((twist, i) => (
              <li key={i} className="text-sm text-muted-foreground">
                {twist}
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
            No plot twists revealed yet.
          </div>
        )}
      </section>
    </div>
  )
}
