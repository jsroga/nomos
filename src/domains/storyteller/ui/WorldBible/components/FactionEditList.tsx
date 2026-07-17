import type { FC } from 'react'
import { Trash2 } from 'lucide-react'
import type { Faction } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'

function splitCommaList(value: string): string[] {
  return value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

export const FactionEditItem: FC<{
  faction: Faction
  idx: number
  onChange: <K extends keyof Faction>(index: number, field: K, value: Faction[K]) => void
  onRemove: (index: number) => void
}> = ({ faction, idx, onChange, onRemove }) => (
  <div className="p-4 bg-muted/10 border border-border rounded-lg space-y-3">
    <div className="flex items-center justify-between">
      <input
        type="text"
        className="flex-1 p-2 bg-background border border-border rounded text-sm font-bold"
        placeholder="Faction Name..."
        value={faction.name || ''}
        onChange={e => onChange(idx, 'name', e.target.value)}
      />
      <button
        onClick={() => onRemove(idx)}
        className="ml-2 p-1.5 text-red-400 hover:bg-red-400/20 rounded"
        title="Remove Faction"
        type="button"
      >
        <Trash2 size={14} />
      </button>
    </div>
    <textarea
      className="w-full p-2 bg-background border border-border rounded text-sm resize-none h-16"
      placeholder="Ideology / Core belief..."
      value={faction.ideology || ''}
      onChange={e => onChange(idx, 'ideology', e.target.value)}
    />
    <input
      type="text"
      className="w-full p-2 bg-background border border-border rounded text-sm"
      placeholder="Goals (comma separated)..."
      value={(faction.goals || []).join(', ')}
      onChange={e => onChange(idx, 'goals', splitCommaList(e.target.value))}
    />
    <input
      type="text"
      className="w-full p-2 bg-background border border-border rounded text-sm"
      placeholder="Resources / Power..."
      value={faction.resources || ''}
      onChange={e => onChange(idx, 'resources', e.target.value)}
    />
    <input
      type="text"
      className="w-full p-2 bg-background border border-border rounded text-sm"
      placeholder="Weaknesses (optional)..."
      value={faction.weaknesses || ''}
      onChange={e => onChange(idx, 'weaknesses', e.target.value || null)}
    />
    <input
      type="text"
      className="w-full p-2 bg-background border border-border rounded text-sm"
      placeholder="Rivals (comma separated, optional)..."
      value={(faction.rivals || []).join(', ')}
      onChange={e =>
        onChange(idx, 'rivals', e.target.value ? splitCommaList(e.target.value) : null)
      }
    />
  </div>
)

export const FactionEditList: FC<{
  factions: Faction[]
  onChange: <K extends keyof Faction>(index: number, field: K, value: Faction[K]) => void
  onRemove: (index: number) => void
}> = ({ factions, onChange, onRemove }) => {
  if (factions.length === 0) {
    return (
      <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
        No factions defined. Click + to add one.
      </div>
    )
  }
  return (
    <div className="space-y-4">
      {factions.map((faction, idx) => (
        <FactionEditItem
          key={idx}
          faction={faction}
          idx={idx}
          onChange={onChange}
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}
