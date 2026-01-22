import React from 'react'
import { Users, Plus, RefreshCw, Trash2, UserPlus } from 'lucide-react'
import { StoryPlan, KeyCharacter } from '../../schemas/agent-schemas'
import { Button } from '@/components/ui/button'

import { useBible } from './BibleContext'

import { getDisplayCharacters } from '../../utils/bible-utils'

interface BibleCharactersProps {
  onOpenConvertDialog: (char: KeyCharacter) => void
  onOpenCreateDialog?: () => void
}

export const BibleCharacters: React.FC<BibleCharactersProps> = ({
  onOpenConvertDialog,
  onOpenCreateDialog,
}) => {
  const {
    storyPlan,
    isEditing,
    localPlan,
    updateKeyCharacter: onCharacterChange,
    addKeyCharacter: onAddCharacter,
    removeKeyCharacter: onRemoveCharacter,
    isReadOnly,
    onSendMessage,
  } = useBible()

  // Derived characters list (handling backwards compatibility safely)
  const displayCharacters = getDisplayCharacters(storyPlan)

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-400/80" />
          <h3 className="font-syne font-bold text-lg">Key Players</h3>
        </div>
        <div className="flex gap-2">
          {isEditing && (
            <button
              onClick={onOpenCreateDialog ? onOpenCreateDialog : onAddCharacter}
              className="p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105"
              title="Add Character"
            >
              <Plus size={14} />
            </button>
          )}
          {!isReadOnly && onSendMessage && (
            <button
              onClick={() =>
                onSendMessage(
                  'Generate a diverse cast of key characters including their archetypes, roles, and core motivations. Ensure they have clear conflicting goals.'
                )
              }
              className="p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105"
              title="Generate Characters"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          {(localPlan.keyCharacters || []).length === 0 ? (
            <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
              No characters defined. Click + to add one.
            </div>
          ) : (
            (localPlan.keyCharacters || []).map((char, idx) => (
              <div key={idx} className="p-4 bg-muted/10 border border-border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    className="flex-1 p-2 bg-background border border-border rounded text-sm font-bold"
                    placeholder="Character Name..."
                    value={char.name || ''}
                    onChange={e => onCharacterChange(idx, 'name', e.target.value)}
                  />
                  <button
                    onClick={() => onRemoveCharacter(idx)}
                    className="ml-2 p-1.5 text-red-400 hover:bg-red-400/20 rounded"
                    title="Remove Character"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    className="p-2 bg-background border border-border rounded text-sm"
                    placeholder="Role..."
                    value={char.role || ''}
                    onChange={e => onCharacterChange(idx, 'role', e.target.value)}
                  />
                  <input
                    type="text"
                    className="p-2 bg-background border border-border rounded text-sm"
                    placeholder="Archetype..."
                    value={char.archetype || ''}
                    onChange={e => onCharacterChange(idx, 'archetype', e.target.value)}
                  />
                </div>
                <textarea
                  className="w-full p-2 bg-background border border-border rounded text-sm resize-none h-16"
                  placeholder="Motivation / Want..."
                  value={char.motivation || ''}
                  onChange={e => onCharacterChange(idx, 'motivation', e.target.value)}
                />
              </div>
            ))
          )}
        </div>
      ) : displayCharacters.length === 0 ? (
        <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
          No key players defined yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayCharacters.map((char, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-muted/20 border border-border/40 hover:border-indigo-500/30 transition-all group"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-syne font-bold text-foreground">{char.name}</h4>
                  <div className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider">
                    {char.role} • {char.archetype}
                  </div>
                </div>
                {!isReadOnly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20"
                    onClick={() => onOpenConvertDialog(char)}
                    title="Convert to Cast member"
                  >
                    <UserPlus size={14} />
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 italic">
                "{char.motivation}"
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
