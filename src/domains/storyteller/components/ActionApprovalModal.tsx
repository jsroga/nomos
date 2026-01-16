'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, ChevronLeft, ChevronRight, Check, XCircle, Edit, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AgentAction } from '../actions/types'
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued'

interface ActionChange {
  path: string
  before: any
  after: any
  reason?: string
}

interface ActionApprovalModalProps {
  action: AgentAction
  agentName: string
  onApprove: () => void
  onReject: () => void
  onClose: () => void
  isOpen: boolean
}

export const ActionApprovalModal: React.FC<ActionApprovalModalProps> = ({
  action,
  agentName,
  onApprove,
  onReject,
  onClose,
  isOpen,
}) => {
  const [currentChangeIndex, setCurrentChangeIndex] = useState(0)
  const changes = extractChanges(action)
  const currentChange = changes[currentChangeIndex]

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        onApprove()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        onReject()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setCurrentChangeIndex(Math.max(0, currentChangeIndex - 1))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setCurrentChangeIndex(Math.min(changes.length - 1, currentChangeIndex + 1))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentChangeIndex, changes.length, onApprove, onReject, onClose])

  if (!isOpen) return null

  const hasMultipleChanges = changes.length > 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full h-full max-w-[95vw] max-h-[95vh] bg-background border border-border shadow-2xl rounded-lg flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onClose} className="gap-2">
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="h-6 w-px bg-border" />
            <div>
              <div className="font-bold text-sm uppercase tracking-wider text-foreground">
                Action Approval: {formatActionType(action.type)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                From: {agentName} • Confidence: {((action as any).confidence || 0.8) * 100}%
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Change Navigator */}
        {hasMultipleChanges && (
          <div className="flex items-center justify-between px-6 py-3 border-b border-border/30 bg-background/50">
            <div className="text-sm font-medium text-muted-foreground">
              Change {currentChangeIndex + 1} of {changes.length}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentChangeIndex(Math.max(0, currentChangeIndex - 1))}
                disabled={currentChangeIndex === 0}
                className="gap-2 h-7"
              >
                <ChevronLeft className="w-3 h-3" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentChangeIndex(Math.min(changes.length - 1, currentChangeIndex + 1))
                }
                disabled={currentChangeIndex === changes.length - 1}
                className="gap-2 h-7"
              >
                Next
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Field Path */}
        {currentChange && (
          <div className="px-6 py-2 bg-muted/20 border-b border-border/30">
            <div className="text-xs font-mono text-primary">{currentChange.path}</div>
            {currentChange.reason && (
              <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3" />
                {currentChange.reason}
              </div>
            )}
          </div>
        )}

        {/* Diff Viewer */}
        <div className="flex-1 overflow-hidden">
          {currentChange ? (
            <div className="h-full overflow-auto">
              <ReactDiffViewer
                oldValue={formatJSON(currentChange.before)}
                newValue={formatJSON(currentChange.after)}
                splitView={true}
                compareMethod={DiffMethod.WORDS}
                leftTitle="BEFORE"
                rightTitle="AFTER"
                styles={{
                  variables: {
                    dark: {
                      diffViewerBackground: 'hsl(var(--background))',
                      diffViewerColor: 'hsl(var(--foreground))',
                      addedBackground: 'rgba(34, 197, 94, 0.1)',
                      addedColor: 'rgb(74, 222, 128)',
                      removedBackground: 'rgba(239, 68, 68, 0.1)',
                      removedColor: 'rgb(248, 113, 113)',
                      wordAddedBackground: 'rgba(34, 197, 94, 0.2)',
                      wordRemovedBackground: 'rgba(239, 68, 68, 0.2)',
                      addedGutterBackground: 'rgba(34, 197, 94, 0.2)',
                      removedGutterBackground: 'rgba(239, 68, 68, 0.2)',
                      gutterBackground: 'hsl(var(--muted))',
                      gutterColor: 'hsl(var(--muted-foreground))',
                      codeFoldGutterBackground: 'hsl(var(--muted))',
                      emptyLineBackground: 'hsl(var(--background))',
                    },
                  },
                  line: {
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontFamily: 'ui-monospace, monospace',
                  },
                }}
                useDarkTheme={true}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No changes to display
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/30">
          <div className="flex gap-2 text-[10px] text-muted-foreground font-mono">
            <kbd className="px-2 py-1 bg-muted rounded border border-border">Esc</kbd> Close
            <kbd className="px-2 py-1 bg-muted rounded border border-border">←→</kbd> Navigate
            <kbd className="px-2 py-1 bg-muted rounded border border-border">Enter</kbd> Approve
            <kbd className="px-2 py-1 bg-muted rounded border border-border">Del</kbd> Reject
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onReject} className="gap-2">
              <XCircle className="w-4 h-4" />
              Reject
            </Button>
            <Button onClick={onApprove} className="gap-2 bg-emerald-500 hover:bg-emerald-600">
              <Check className="w-4 h-4" />
              Approve
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Extract changes from an action
 */
function extractChanges(action: AgentAction): ActionChange[] {
  const changes: ActionChange[] = []
  const payload = action.payload || {}

  // For UPDATE actions, extract the fields being updated
  if (action.type.startsWith('UPDATE_')) {
    Object.entries(payload).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'beatId' && key !== 'characterId') {
        changes.push({
          path: key,
          before: null, // We don't have "before" state in the action
          after: value,
          reason: (action as any).reasoning,
        })
      }
    })
  }

  // For CREATE actions, show the full object
  if (action.type.startsWith('CREATE_')) {
    changes.push({
      path: 'New ' + action.type.replace('CREATE_', '').toLowerCase(),
      before: null,
      after: payload,
      reason: (action as any).reasoning,
    })
  }

  return changes
}

/**
 * Format value as pretty JSON
 */
function formatJSON(value: any): string {
  if (value === null || value === undefined) {
    return '(empty)'
  }

  if (typeof value === 'string') {
    return value
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

/**
 * Format action type for display
 */
function formatActionType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
}

export default ActionApprovalModal

