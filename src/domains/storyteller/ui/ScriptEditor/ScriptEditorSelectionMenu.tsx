'use client'

import type { FC } from 'react'
import { Wand2, RotateCcw, Sparkles, ChevronDown } from 'lucide-react'
import { ScriptRegenerateAction } from './constants/script-editor'

export interface ScriptEditorSelectionMenuProps {
  visible: boolean
  selectionText: string
  menuPosition: { x: number; y: number }
  instruction: string
  isRegenerating: boolean
  onInstructionChange: (value: string) => void
  onRegenerate: (type: ScriptRegenerateAction) => void
  onDismiss: () => void
}

export const ScriptEditorSelectionMenu: FC<ScriptEditorSelectionMenuProps> = ({
  visible,
  selectionText,
  menuPosition,
  instruction,
  isRegenerating,
  onInstructionChange,
  onRegenerate,
  onDismiss,
}) => {
  if (!visible || !selectionText) return null

  return (
    <>
      <div
        className="fixed z-50 bg-card border border-border rounded-lg shadow-xl p-2 space-y-1"
        style={{
          left: Math.max(10, menuPosition.x - 100),
          top: Math.max(10, menuPosition.y - 150),
        }}
      >
        <div className="text-xs text-muted-foreground px-2 py-1 border-b border-border mb-1">
          Selected: {selectionText.slice(0, 30)}...
        </div>

        <button
          onClick={() => onRegenerate(ScriptRegenerateAction.Expand)}
          disabled={isRegenerating}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-accent rounded transition-colors disabled:opacity-50"
        >
          <Sparkles size={14} className="text-blue-400" />
          Expand
        </button>

        <button
          onClick={() => onRegenerate(ScriptRegenerateAction.Condense)}
          disabled={isRegenerating}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-accent rounded transition-colors disabled:opacity-50"
        >
          <ChevronDown size={14} className="text-orange-400" />
          Condense
        </button>

        <button
          onClick={() => onRegenerate(ScriptRegenerateAction.Rewrite)}
          disabled={isRegenerating}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-accent rounded transition-colors disabled:opacity-50"
        >
          <RotateCcw size={14} className="text-green-400" />
          Rewrite
        </button>

        <div className="border-t border-border pt-1 mt-1">
          <div className="flex items-center gap-1">
            <input
              type="text"
              placeholder="Custom instruction..."
              value={instruction}
              onChange={e => onInstructionChange(e.target.value)}
              className="flex-1 bg-background border border-input rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              onKeyDown={e => e.key === 'Enter' && onRegenerate(ScriptRegenerateAction.Custom)}
            />
            <button
              onClick={() => onRegenerate(ScriptRegenerateAction.Custom)}
              disabled={isRegenerating || !instruction}
              className="p-1 hover:bg-accent rounded disabled:opacity-50"
            >
              <Wand2 size={14} className="text-primary" />
            </button>
          </div>
        </div>

        {isRegenerating && (
          <div className="text-xs text-primary text-center py-1 animate-pulse">
            Regenerating...
          </div>
        )}
      </div>
      <div className="fixed inset-0 z-40" onClick={onDismiss} />
    </>
  )
}
