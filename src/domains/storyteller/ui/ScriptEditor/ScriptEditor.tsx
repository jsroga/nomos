'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { ManuscriptSectionScope } from '@/domains/storyteller/core/manuscript/pack-manuscript-section-brief'
import { compileStorytellerManuscript, startStorytellerManuscriptSection } from '@/domains/storyteller/core/io/manuscript-section.api'
import { ManuscriptMode } from '@/domains/storyteller/core/types/enums'
import { cn } from '@/shared/data/utils'
import {
  SCRIPT_EDITOR_CONDENSE_PROMPT,
  SCRIPT_EDITOR_EXPAND_PROMPT,
  SCRIPT_EDITOR_REGENERATION_FAILED_LOG,
  SCRIPT_EDITOR_REWRITE_PROMPT,
  ScriptEditorCommand,
  ScriptRegenerateAction,
  type ScriptEditorSelectionContext,
} from './constants/script-editor'
import { StorytellerWorkflowRunStatus } from '@/domains/storyteller/core/storyteller-page-wire'
import { manuscriptSpanAt } from '@/domains/storyteller/core/manuscript/manuscript-span'
import type { ManuscriptSpan } from '@/domains/storyteller/core/manuscript/manuscript-span'
import { applyManuscriptSectionVerdict } from '@/domains/storyteller/core/io/apply-manuscript-section-verdict'
import { ScriptEditorGhostOverlay } from './ScriptEditorGhostOverlay'
import { ScriptEditorVerdictOverlay } from './ScriptEditorVerdictOverlay'
import type { SuspendedBeatDraftResult } from './ScriptEditorVerdictOverlay'
import { ScriptEditorManuscriptToolbar, ScriptEditorToolbarCopy } from './ScriptEditorManuscriptToolbar'
import { ScriptEditorSelectionMenu } from './ScriptEditorSelectionMenu'
import { manuscriptGenerateDisabled } from './manuscript-generate-disabled'
import { manuscriptPrefixBeforeCaret } from './script-ghost-caret'
import { useScriptGhostComplete } from './useScriptGhostComplete'

type SectionVerdictPending = SuspendedBeatDraftResult & {
  span: ManuscriptSpan | null
  scriptSnapshot: string
}

enum ScriptEditorPlaceholder {
  Script = 'Start writing your screenplay...',
  Novel = 'Start writing the chapter...',
}

export interface ScriptEditorProps {
  content: string
  onChange: (content: string) => void
  onRegenerateSelection?: (
    selection: string,
    instruction: string,
    context?: ScriptEditorSelectionContext
  ) => Promise<string>
  isLoading?: boolean
  mode?: ManuscriptMode
  onModeChange?: (mode: ManuscriptMode) => void
  beatCount?: number
  projectId?: string
  episodeId?: string
}

function scriptSelectionSurrounding(
  editor: HTMLDivElement,
  range: Range
): ScriptEditorSelectionContext {
  const beforeRange = document.createRange()
  beforeRange.selectNodeContents(editor)
  beforeRange.setEnd(range.startContainer, range.startOffset)
  const afterRange = document.createRange()
  afterRange.selectNodeContents(editor)
  afterRange.setStart(range.endContainer, range.endOffset)
  return { beforeText: beforeRange.toString(), afterText: afterRange.toString() }
}

const ScriptEditor: React.FC<ScriptEditorProps> = ({
  content,
  onChange,
  onRegenerateSelection,
  isLoading = false,
  mode: modeProp,
  onModeChange,
  beatCount = 0,
  projectId = '',
  episodeId = '',
}) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const isInitializedRef = useRef(false)
  const [modeState, setModeState] = useState(modeProp ?? ManuscriptMode.Script)
  const manuscriptMode = modeProp ?? modeState
  const isNovel = manuscriptMode === ManuscriptMode.Novel
  const [selection, setSelection] = useState<{ text: string; range: Range | null }>({
    text: '',
    range: null,
  })
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [instruction, setInstruction] = useState('')
  const [sectionVerdict, setSectionVerdict] = useState<SectionVerdictPending | null>(null)

  const insertGhost = useCallback(
    (ghostText: string) => {
      const editor = editorRef.current
      if (!editor || ghostText.length === 0) return
      editor.focus()
      document.execCommand(ScriptEditorCommand.InsertText, false, ghostText)
      onChange(editor.innerText)
    },
    [onChange]
  )

  const { ghost, onKeyDown, rejectGhost, schedule } = useScriptGhostComplete({
    enabled: projectId.length > 0 && episodeId.length > 0,
    projectId,
    episodeId,
    mode: manuscriptMode,
    getPrefix: () => {
      const editor = editorRef.current
      return editor ? manuscriptPrefixBeforeCaret(editor) : ''
    },
    onAccept: insertGhost,
  })

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
      const surrounding =
        editorRef.current && selection.range
          ? scriptSelectionSurrounding(editorRef.current, selection.range)
          : undefined
      const newText = await onRegenerateSelection(selection.text, prompt, surrounding)

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

  const handleModeChange = (next: ManuscriptMode) => {
    setModeState(next)
    onModeChange?.(next)
  }

  const generateDisabled = manuscriptGenerateDisabled(beatCount)

  const runSectionDraft = useCallback(
    (scope: ManuscriptSectionScope) => {
      if (generateDisabled || !projectId || !episodeId) return
      const editor = editorRef.current
      const scriptContent = editor?.innerText ?? content
      const caret = editor ? manuscriptPrefixBeforeCaret(editor).length : scriptContent.length
      void (async () => {
        try {
          const result = await startStorytellerManuscriptSection({
            projectId,
            episodeId,
            mode: manuscriptMode,
            scope,
            scriptContent,
            caret,
          })
          if (result.status === StorytellerWorkflowRunStatus.Suspended && result.runId) {
            setSectionVerdict({
              runId: result.runId,
              draft: result.draft,
              critiques: result.critiques,
              span:
                scope === ManuscriptSectionScope.Regenerate
                  ? manuscriptSpanAt(scriptContent, caret, manuscriptMode)
                  : null,
              scriptSnapshot: scriptContent,
            })
          }
        } catch (error) {
          console.error(SCRIPT_EDITOR_REGENERATION_FAILED_LOG, error)
        }
      })()
    },
    [content, episodeId, generateDisabled, manuscriptMode, projectId]
  )

  return (
    <div className="relative h-full flex flex-col bg-[#1a1a1a]">
      <div className="min-h-12 border-b border-border/30 flex items-center justify-between gap-3 px-4 py-1 bg-card/50">
        <ScriptEditorManuscriptToolbar
          mode={manuscriptMode}
          onModeChange={handleModeChange}
          generateDisabled={generateDisabled}
          generateDisabledReason={
            generateDisabled ? ScriptEditorToolbarCopy.BeatsGate : undefined
          }
          onGenerateNext={() => runSectionDraft(ManuscriptSectionScope.GenerateNext)}
          onRegenerateSection={() => runSectionDraft(ManuscriptSectionScope.Regenerate)}
          onCompile={() => {
            if (generateDisabled || !projectId || !episodeId) return
            void (async () => {
              try {
                const result = await compileStorytellerManuscript({
                  projectId,
                  episodeId,
                  mode: manuscriptMode,
                })
                if (result.scriptContent.length === 0) return
                onChange(result.scriptContent)
                if (editorRef.current) editorRef.current.innerText = result.scriptContent
              } catch (error) {
                console.error(SCRIPT_EDITOR_REGENERATION_FAILED_LOG, error)
              }
            })()
          }}
        />
        {isLoading && <span className="text-xs text-primary animate-pulse">Writing...</span>}
      </div>

      <div className="flex-1 overflow-y-auto relative">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className={cn(
            'script-editor mx-auto px-16 py-12 min-h-full outline-none',
            isNovel ? 'max-w-[65ch]' : 'max-w-[72ch]'
          )}
          onInput={e => {
            onChange(e.currentTarget.innerText)
            rejectGhost()
            schedule()
          }}
          onBlur={e => onChange(e.currentTarget.innerText)}
          onMouseUp={handleSelection}
          onKeyUp={handleSelection}
          onKeyDown={onKeyDown}
          style={
            isNovel
              ? {
                  fontFamily: 'Georgia, "Times New Roman", Times, serif',
                  fontSize: '18px',
                  lineHeight: '1.85',
                  color: '#e0e0e0',
                  whiteSpace: 'pre-wrap',
                }
              : {
                  fontFamily: '"Courier Prime", "Courier New", Courier, monospace',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: '#e0e0e0',
                  whiteSpace: 'pre-wrap',
                }
          }
          data-placeholder={
            isNovel ? ScriptEditorPlaceholder.Novel : ScriptEditorPlaceholder.Script
          }
        />
        <ScriptEditorGhostOverlay ghost={ghost} />
        <ScriptEditorVerdictOverlay
          pending={sectionVerdict}
          onSettled={resume => {
            const pending = sectionVerdict
            setSectionVerdict(null)
            if (!pending) return
            void applyManuscriptSectionVerdict({
              resume,
              scriptContent: pending.scriptSnapshot,
              span: pending.span,
              episodeId,
              onChange,
              editor: editorRef.current,
            })
          }}
        />
      </div>

      <ScriptEditorSelectionMenu
        visible={showContextMenu}
        selectionText={selection.text}
        menuPosition={menuPosition}
        instruction={instruction}
        isRegenerating={isRegenerating}
        onInstructionChange={setInstruction}
        onRegenerate={handleRegenerate}
        onDismiss={() => setShowContextMenu(false)}
      />

      <style>{`
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
