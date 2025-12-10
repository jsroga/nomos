'use client'

import React from 'react'
import { X, Trash2, AlertTriangle, Clock, FileCode } from 'lucide-react'
import { useErrorStore, CapturedError } from '@/store/useErrorStore'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

function ErrorCard({ error }: { error: CapturedError }) {
  const [isExpanded, setIsExpanded] = React.useState(false)

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const handleCopyToClipboard = async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent expanding when copying

    const errorText = [
      `Error: ${error.message}`,
      error.source ? `Source: ${error.source}` : '',
      `Time: ${formatTime(error.timestamp)}`,
      error.stack ? `\nStack Trace:\n${error.stack}` : ''
    ].filter(Boolean).join('\n')

    try {
      await navigator.clipboard.writeText(errorText)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div
      className={cn(
        'bg-card border border-border rounded-lg p-3 transition-colors',
        isExpanded && 'border-red-500/30'
      )}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
        <div
          className="flex-1 min-w-0 cursor-pointer hover:opacity-80"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <pre
            className={cn(
              "text-sm font-medium text-foreground break-words whitespace-pre-wrap max-h-[200px] overflow-auto",
              "cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
            )}
            onClick={handleCopyToClipboard}
            title="Click to copy error"
          >
            {error.message}
          </pre>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatTime(error.timestamp)}
            </span>
            {error.source && (
              <span className="flex items-center gap-1 truncate">
                <FileCode size={12} />
                {error.source}
              </span>
            )}
          </div>
        </div>
      </div>

      {isExpanded && error.stack && (
        <div className="mt-3 pt-3 border-t border-border">
          <pre
            className={cn(
              "text-xs text-muted-foreground font-mono overflow-x-auto whitespace-pre-wrap break-all max-h-48 overflow-y-auto",
              "cursor-pointer hover:bg-muted/50 rounded px-2 py-1 transition-colors"
            )}
            onClick={handleCopyToClipboard}
            title="Click to copy error with stack trace"
          >
            {error.stack}
          </pre>
        </div>
      )}
    </div>
  )
}

export const TroubleshootPanel: React.FC = () => {
  const errors = useErrorStore(state => state.errors)
  const isPanelOpen = useErrorStore(state => state.isPanelOpen)
  const closePanel = useErrorStore(state => state.closePanel)
  const clearErrors = useErrorStore(state => state.clearErrors)

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-40 transition-opacity duration-300',
          isPanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={closePanel}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-full sm:w-[400px] bg-background border-l border-border z-50 shadow-2xl',
          'transition-transform duration-300 ease-out',
          isPanelOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-red-500" size={20} />
            <h2 className="text-lg font-semibold">Troubleshoot</h2>
            <span className="text-sm text-muted-foreground">
              ({errors.length} error{errors.length !== 1 ? 's' : ''})
            </span>
          </div>
          <div className="flex items-center gap-1">
            {errors.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearErrors}
                title="Clear all errors"
              >
                <Trash2 size={18} />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={closePanel} title="Close">
              <X size={18} />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="h-[calc(100vh-73px)]">
          <div className="p-4 space-y-3">
            {errors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <AlertTriangle size={48} className="mb-4 opacity-20" />
                <p className="text-sm">No errors captured</p>
                <p className="text-xs mt-1">Errors will appear here when they occur</p>
              </div>
            ) : (
              errors.map(error => <ErrorCard key={error.id} error={error} />)
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  )
}
