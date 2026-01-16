'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ActionHistoryEntry } from '../actions/types'
import { formatActionForDisplay } from '../actions/executor'
import { X, Undo2, Check, AlertCircle, Loader2, Eye } from 'lucide-react'

interface ActionToastProps {
  entry: ActionHistoryEntry
  onUndo?: () => void
  onDismiss: () => void
  autoHideDuration?: number
  isInContainer?: boolean // When true, don't use fixed positioning
}

export const ActionToast: React.FC<ActionToastProps> = ({
  entry,
  onUndo,
  onDismiss,
  autoHideDuration = 5000,
  isInContainer = false,
}) => {
  const [isVisible, setIsVisible] = useState(true)
  const [progress, setProgress] = useState(100)

  const display = formatActionForDisplay(entry.action)

  // Define handleDismiss BEFORE using it in useEffect
  const handleDismiss = useCallback(() => {
    setIsVisible(false)
    setTimeout(onDismiss, 200) // Wait for animation
  }, [onDismiss])

  useEffect(() => {
    if (autoHideDuration <= 0) return

    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / autoHideDuration) * 100)
      setProgress(remaining)

      if (remaining <= 0) {
        clearInterval(interval)
        handleDismiss()
      }
    }, 50)

    return () => clearInterval(interval)
  }, [autoHideDuration, handleDismiss])

  const handleUndo = () => {
    if (onUndo) {
      onUndo()
      handleDismiss()
    }
  }

  return (
    <div
      className={cn(
        'transition-all duration-200',
        !isInContainer && 'fixed bottom-4 right-4 z-50',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      )}
    >
      <div className="bg-card border border-border rounded-lg shadow-lg overflow-hidden min-w-[300px] max-w-[400px]">
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-50"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div
              className={cn(
                'text-2xl flex-shrink-0'
                // Use a visually distinct indicator if an action failed processing but was "committed" by the agent
                // However, entry.status is usually 'committed'. We might need to check if execution actually worked.
                // For now, we assume committed means success unless reverted.
              )}
            >
              {display.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span className="font-semibold text-sm">{display.title}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5 truncate">{display.description}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">by {entry.agentName}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {onUndo && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleUndo}
                  className="h-8 w-8"
                  title="Undo"
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                className="h-8 w-8"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// ACTION TOAST CONTAINER - Manages multiple toasts
// ============================================

interface ActionToastContainerProps {
  entries: ActionHistoryEntry[]
  onUndo?: (entryId: string) => void
  onDismiss: (entryId: string) => void
  maxVisible?: number
}

export const ActionToastContainer: React.FC<ActionToastContainerProps> = ({
  entries,
  onUndo,
  onDismiss,
  maxVisible = 3,
}) => {
  const visibleEntries = entries.slice(-maxVisible)

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2">
      {visibleEntries.map((entry, index) => (
        <div
          key={entry.id}
          className="animate-in slide-in-from-right-5 fade-in duration-200"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <ActionToast
            entry={entry}
            onUndo={onUndo ? () => onUndo(entry.id) : undefined}
            onDismiss={() => onDismiss(entry.id)}
            autoHideDuration={5000 + index * 1000}
            isInContainer={true}
          />
        </div>
      ))}
    </div>
  )
}

// ============================================
// ACTION COMMITTED INLINE - For displaying in chat
// ============================================

interface ActionCommittedProps {
  entry: ActionHistoryEntry
  compact?: boolean
}

export const ActionCommitted: React.FC<ActionCommittedProps> = ({ entry, compact = false }) => {
  const [showPreview, setShowPreview] = useState(false)
  // Use 'committed' status for proper wording
  const display = formatActionForDisplay(entry.action, 'committed')

  // Format the action payload as readable JSON
  const formatPayload = () => {
    try {
      return JSON.stringify(entry.action.payload || {}, null, 2)
    } catch {
      return String(entry.action.payload)
    }
  }

  // Compact mode: subtle inline badge with preview toggle
  // NOTE: No animation - this is a stable "committed" state that shouldn't blink on re-renders
  if (compact) {
    return (
      <div className="flex flex-col gap-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium">
          <Check className="w-3 h-3" />
          <span className="uppercase tracking-wider text-[10px]">Committed:</span>
          <span>{display.title}</span>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-widest font-bold bg-muted/80 hover:bg-muted text-foreground transition-colors border border-border/50"
          >
            {showPreview ? 'Hide' : 'JSON'}
          </button>
        </div>
        {showPreview && (
          <div className="mt-1 p-2 rounded bg-muted/30 border border-border/50 animate-in fade-in slide-in-from-top-1 duration-200">
            <pre className="text-[10px] text-foreground/80 font-mono whitespace-pre-wrap overflow-x-auto max-h-[200px] overflow-y-auto">
              {formatPayload()}
            </pre>
          </div>
        )}
      </div>
    )
  }

  // Full mode: more subtle card with preview toggle
  // NOTE: No animation - stable state
  return (
    <div className="border border-green-500/20 bg-green-500/5 rounded-lg p-2.5 my-2">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
          <Check className="w-3 h-3 text-green-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-green-400 font-bold">
              Committed
            </span>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-widest font-bold bg-muted/80 hover:bg-muted text-foreground transition-colors border border-border/50"
            >
              {showPreview ? 'Hide JSON' : 'Preview JSON'}
            </button>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm font-medium text-foreground">{display.title}</span>
          </div>
          {display.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{display.description}</p>
          )}
        </div>
      </div>
      {showPreview && (
        <div className="mt-2 p-2 rounded bg-muted/30 border border-border/50 animate-in fade-in slide-in-from-top-1 duration-200">
          <pre className="text-[10px] text-foreground/80 font-mono whitespace-pre-wrap overflow-x-auto max-h-[300px] overflow-y-auto">
            {formatPayload()}
          </pre>
        </div>
      )}
    </div>
  )
}

// ============================================
// ACTION SUGGESTION - For manual approval
// ============================================

interface ActionSuggestionProps {
  action: any
  agentName: string
  onAccept: () => void // Immediate execution
  onReview: () => void // Open detailed diff modal
  onReject: () => void
  isProcessing?: boolean
}

export const ActionSuggestion: React.FC<ActionSuggestionProps> = ({
  action,
  agentName,
  onAccept,
  onReview,
  onReject,
  isProcessing = false,
}) => {
  const [showPreview, setShowPreview] = useState(false)
  // Use 'pending' status for proper wording
  const display = formatActionForDisplay(action, 'pending')

  return (
    <div className="border border-amber-500/30 bg-amber-500/5 rounded-lg p-3 my-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20">
          <div className="text-lg">{display.icon}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
              Pending Approval
            </span>
            <span className="text-[10px] text-muted-foreground/60">by {agentName}</span>
          </div>
          <h4 className="text-sm font-semibold text-foreground mb-0.5">{display.title}</h4>

          {/* Action Description / Preview Toggle */}
          <div className="relative">
            <p
              className={cn(
                'text-xs text-muted-foreground leading-relaxed transition-all duration-200',
                showPreview ? '' : 'line-clamp-2'
              )}
            >
              {display.description}
            </p>
            {display.description && display.description.length > 100 && (
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="text-[9px] uppercase tracking-tighter text-amber-400/80 hover:text-amber-400 mt-1 font-bold transition-colors"
                title="Toggle detailed description"
              >
                {showPreview ? 'Show Less' : 'Show More'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              variant="default"
              onClick={onAccept}
              disabled={isProcessing}
              className="h-7 text-[10px] uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white transition-all font-bold px-3 border-none"
            >
              {isProcessing ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
              ) : (
                <Check className="w-3 h-3 mr-1.5" />
              )}
              Accept
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={onReview}
              disabled={isProcessing}
              className="h-7 text-[10px] uppercase tracking-widest bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-600/20 transition-all font-bold px-3"
            >
              <Eye className="w-3 h-3 mr-1.5" />
              Review
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={onReject}
              disabled={isProcessing}
              className="h-7 text-[10px] uppercase tracking-widest text-muted-foreground/60 hover:text-red-400 hover:bg-red-500/5 transition-all px-3"
            >
              <X className="w-3 h-3 mr-1.5" />
              Discard
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ActionToast
