'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ActionHistoryEntry } from '../actions/types'
import { formatActionForDisplay } from '../actions/executor'
import { X, Undo2, Check, AlertCircle } from 'lucide-react'

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
  }, [autoHideDuration])

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(onDismiss, 200) // Wait for animation
  }

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
            <div className={cn(
              "text-2xl flex-shrink-0",
              // Use a visually distinct indicator if an action failed processing but was "committed" by the agent
              // However, entry.status is usually 'committed'. We might need to check if execution actually worked.
              // For now, we assume committed means success unless reverted.
            )}>
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
  const display = formatActionForDisplay(entry.action)

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-green-500/10 text-green-400 text-xs">
        <Check className="w-3 h-3" />
        <span>{display.title}</span>
      </div>
    )
  }

  return (
    <div className="border border-green-500/30 bg-green-500/5 rounded-lg p-3 my-2">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
          <Check className="w-4 h-4 text-green-500" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">ACTION COMMITTED</span>
            <span className="text-lg">{display.icon}</span>
          </div>
          <p className="text-sm font-medium mt-0.5">{display.title}</p>
          <p className="text-sm text-muted-foreground">{display.description}</p>
        </div>
      </div>
    </div>
  )
}

export default ActionToast
