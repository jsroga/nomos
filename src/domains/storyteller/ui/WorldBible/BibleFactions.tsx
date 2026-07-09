import React from 'react'
import { Crown, Plus, RefreshCw, Trash2, Loader2 } from 'lucide-react'
import { Faction, FactionSchema } from '@/domains/storyteller/prompts/schemas/agent-schemas'
import { FactionCard } from '../FactionCard'

import { useBible } from './BibleContext'
import { SectionPendingOverlay } from './SectionPendingOverlay'

interface BibleFactionsProps { }

export const BibleFactions: React.FC<BibleFactionsProps> = () => {
  const {
    storyPlan,
    isEditing,
    localPlan,
    updateFaction: onFactionChange,
    addFaction: onAddFaction,
    removeFaction: onRemoveFaction,
    isReadOnly,
    onSendMessage,
    loadingSections,
    pendingActions,
    projectId,
  } = useBible()
  // Use localPlan for display when not editing to show latest saved data
  const displayFactions = isEditing
    ? (localPlan.factions || [])
    : (localPlan.factions || storyPlan.factions || [])
  const isLoading = loadingSections?.factions?.loading ?? false
  const pendingAction = pendingActions?.factions

  return (
    <section className={isLoading || pendingAction ? 'relative' : ''}>
      {/* Pending action overlay */}
      {pendingAction && (
        <SectionPendingOverlay pendingAction={pendingAction} onReview={pendingAction.onReview} />
      )}
      {isLoading && !pendingAction && (
        <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm rounded-lg flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
            <span>Building power structures...</span>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-400/80" />
          <h3 className="font-syne font-bold text-lg">Factions</h3>
        </div>
        <div className="flex gap-2">
          {isEditing && (
            <button
              onClick={onAddFaction}
              className={`p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105 ${isLoading ? 'pointer-events-none opacity-50' : ''}`}
              title="Add Faction"
              disabled={isLoading}
            >
              <Plus size={14} />
            </button>
          )}
          {!isReadOnly && onSendMessage && (
            <button
              onClick={() =>
                onSendMessage?.(
                  'Generate completely BRAND NEW major factions, power structures, and political forces in this world. IMPORTANT: Take a completely new creative direction and do NOT repeat any previously generated factions.',
                  'factions'
                )
              }
              className={`p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105 ${isLoading ? 'pointer-events-none opacity-50' : ''}`}
              title="Generate Factions"
              disabled={isLoading}
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          {(localPlan.factions || []).length === 0 ? (
            <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
              No factions defined. Click + to add one.
            </div>
          ) : (
            (localPlan.factions || []).map((faction, idx) => (
              <div key={idx} className="p-4 bg-muted/10 border border-border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    className="flex-1 p-2 bg-background border border-border rounded text-sm font-bold"
                    placeholder="Faction Name..."
                    value={faction.name || ''}
                    onChange={e => onFactionChange(idx, 'name', e.target.value)}
                  />
                  <button
                    onClick={() => onRemoveFaction(idx)}
                    className="ml-2 p-1.5 text-red-400 hover:bg-red-400/20 rounded"
                    title="Remove Faction"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <textarea
                  className="w-full p-2 bg-background border border-border rounded text-sm resize-none h-16"
                  placeholder="Ideology / Core belief..."
                  value={faction.ideology || ''}
                  onChange={e => onFactionChange(idx, 'ideology', e.target.value)}
                />
                <input
                  type="text"
                  className="w-full p-2 bg-background border border-border rounded text-sm"
                  placeholder="Goals (comma separated)..."
                  value={(faction.goals || []).join(', ')}
                  onChange={e =>
                    onFactionChange(
                      idx,
                      'goals',
                      e.target.value
                        .split(',')
                        .map(s => s.trim())
                        .filter(Boolean)
                    )
                  }
                />
                <input
                  type="text"
                  className="w-full p-2 bg-background border border-border rounded text-sm"
                  placeholder="Resources / Power..."
                  value={faction.resources || ''}
                  onChange={e => onFactionChange(idx, 'resources', e.target.value)}
                />
                <input
                  type="text"
                  className="w-full p-2 bg-background border border-border rounded text-sm"
                  placeholder="Weaknesses (optional)..."
                  value={faction.weaknesses || ''}
                  onChange={e => onFactionChange(idx, 'weaknesses', e.target.value || null)}
                />
                <input
                  type="text"
                  className="w-full p-2 bg-background border border-border rounded text-sm"
                  placeholder="Rivals (comma separated, optional)..."
                  value={(faction.rivals || []).join(', ')}
                  onChange={e =>
                    onFactionChange(
                      idx,
                      'rivals',
                      e.target.value
                        ? e.target.value
                          .split(',')
                          .map(s => s.trim())
                          .filter(Boolean)
                        : null
                    )
                  }
                />
              </div>
            ))
          )}
        </div>
      ) : displayFactions.length === 0 ? (
        <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
          No factions defined. Power is a vacuum.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayFactions.map((faction, idx) => {
            const parsed = FactionSchema.safeParse(faction)
            if (!parsed.success) return null
            return <FactionCard key={idx} faction={parsed.data} projectId={projectId} />
          })}
        </div>
      )}
    </section>
  )
}
