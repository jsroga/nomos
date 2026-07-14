'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Wand2, RotateCcw, Sparkles, ChevronDown } from 'lucide-react'
import {
  SCRIPT_EDITOR_CONDENSE_PROMPT,
  SCRIPT_EDITOR_EXPAND_PROMPT,
  SCRIPT_EDITOR_REGENERATION_FAILED_LOG,
  SCRIPT_EDITOR_REWRITE_PROMPT,
  ScriptEditorCommand,
  ScriptRegenerateAction,
} from './constants/script-editor'

export interface ScriptEditorProps {
  content: string
  onChange: (content: string) => void
  onRegenerateSelection?: (selection: string, instruction: string) => Promise<string>
  isLoading?: boolean
}

const ScriptEditor: React.FC<ScriptEditorProps> = ({
  content,
  onChange,
  onRegenerateSelection,
  isLoading = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const isInitializedRef = useRef(false)
  const [selection, setSelection] = useState<{ text: string; range: Range | null }>({
    text: '',
    range: null,
  })
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [instruction, setInstruction] = useState('')

  // Only set initial content once, or when content changes externally (e.g., from AI)
  useEffect(() => {
    if (editorRef.current) {
      const currentText = editorRef.current.innerText
      // Only update if content changed externally (not from user typing)
      // Relaxed check: Allow update if content is longer (AI added text)
      // or if we haven't initialized yet.
      if (
        !isInitializedRef.current ||
        (content !== currentText && content.length > currentText.length)
      ) {
        editorRef.current.innerText = content || ''
        isInitializedRef.current = true
      }
    }
  }, [content])

  // Handle text selection
  const handleSelection = useCallback(() => {
    const sel = window.getSelection()
    if (sel && sel.toString().trim()) {
      const text = sel.toString()
      const range = sel.getRangeAt(0)

      // Get position for context menu
      const rect = range.getBoundingClientRect()
      setMenuPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      })

      setSelection({ text, range: range.cloneRange() })
      setShowContextMenu(true)
    } else {
      setShowContextMenu(false)
      setSelection({ text: '', range: null })
    }
  }, [])

  // Handle regeneration
  const handleRegenerate = async (type: ScriptRegenerateAction) => {
    if (!selection.text || !onRegenerateSelection) return

    let prompt = ''
    switch (type) {
      case ScriptRegenerateAction.Expand:
        prompt = SCRIPT_EDITOR_EXPAND_PROMPT
        break
      case ScriptRegenerateAction.Condense:
        prompt = SCRIPT_EDITOR_CONDENSE_PROMPT
        break
      case ScriptRegenerateAction.Rewrite:
        prompt = SCRIPT_EDITOR_REWRITE_PROMPT
        break
      case ScriptRegenerateAction.Custom:
        prompt = instruction
        break
    }

    if (!prompt) return

    setIsRegenerating(true)
    try {
      const newText = await onRegenerateSelection(selection.text, prompt)

      // Replace the selected text
      if (editorRef.current && selection.range) {
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(selection.range)
        // execCommand is deprecated but is currently the only reliable way to
        // insert text while preserving undo history in contentEditable
        document.execCommand(ScriptEditorCommand.InsertText, false, newText)
      }
    } catch (e) {
      console.error(SCRIPT_EDITOR_REGENERATION_FAILED_LOG, e)
    } finally {
      setIsRegenerating(false)
      setShowContextMenu(false)
      setInstruction('')
    }
  }

  return (
    <div className="relative h-full flex flex-col bg-[#1a1a1a]">
      {/* Editor Header */}
      <div className="h-12 border-b border-border/30 flex items-center justify-between px-4 bg-card/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Script</span>
          {isLoading && <span className="text-xs text-primary animate-pulse">Writing...</span>}
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="script-editor max-w-3xl mx-auto px-16 py-12 min-h-full outline-none"
          onInput={e => onChange(e.currentTarget.innerText)}
          onBlur={e => onChange(e.currentTarget.innerText)}
          onMouseUp={handleSelection}
          onKeyUp={handleSelection}
          style={{
            fontFamily: '"Courier Prime", "Courier New", Courier, monospace',
            fontSize: '14px',
            lineHeight: '1.6',
            color: '#e0e0e0',
            whiteSpace: 'pre-wrap',
          }}
          data-placeholder="Start writing your screenplay..."
        />
      </div>

      {/* Selection Context Menu */}
      {showContextMenu && selection.text && (
        <div
          className="fixed z-50 bg-card border border-border rounded-lg shadow-xl p-2 space-y-1"
          style={{
            left: Math.max(10, menuPosition.x - 100),
            top: Math.max(10, menuPosition.y - 150),
          }}
        >
          <div className="text-xs text-muted-foreground px-2 py-1 border-b border-border mb-1">
            Selected: {selection.text.slice(0, 30)}...
          </div>

          <button
            onClick={() => handleRegenerate(ScriptRegenerateAction.Expand)}
            disabled={isRegenerating}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-accent rounded transition-colors disabled:opacity-50"
          >
            <Sparkles size={14} className="text-blue-400" />
            Expand
          </button>

          <button
            onClick={() => handleRegenerate(ScriptRegenerateAction.Condense)}
            disabled={isRegenerating}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-accent rounded transition-colors disabled:opacity-50"
          >
            <ChevronDown size={14} className="text-orange-400" />
            Condense
          </button>

          <button
            onClick={() => handleRegenerate(ScriptRegenerateAction.Rewrite)}
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
                onChange={e => setInstruction(e.target.value)}
                className="flex-1 bg-background border border-input rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                onKeyDown={e => e.key === 'Enter' && handleRegenerate(ScriptRegenerateAction.Custom)}
              />
              <button
                onClick={() => handleRegenerate(ScriptRegenerateAction.Custom)}
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
      )}

      {/* Click outside to close menu */}
      {showContextMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowContextMenu(false)} />
      )}

      <style jsx global>{`
        .script-editor .scene-heading {
          font-weight: bold;
          text-transform: uppercase;
          margin: 2em 0 1em 0;
          color: #fff;
        }

        .script-editor .character-name {
          text-align: center;
          margin: 1.5em 0 0.25em 0;
          font-weight: 600;
          color: #a0a0ff;
        }

        .script-editor .parenthetical {
          text-align: center;
          margin: 0 20%;
          font-style: italic;
          color: #888;
        }

        .script-editor .action {
          margin: 1em 0;
        }

        .script-editor:empty::before {
          content: attr(data-placeholder);
          color: #555;
          font-style: italic;
          pointer-events: none;
        }

        .script-editor:focus:empty::before {
          color: #444;
        }

        .script-editor ::selection {
          background: rgba(100, 150, 255, 0.3);
        }
      `}</style>
    </div>
  )
}

export default ScriptEditor
