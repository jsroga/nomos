'use client'

import React, { useState } from 'react'
import { RefreshCcw, Check, AlertTriangle, User, Zap, Scroll, Brain, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ConsistencyCheckResult, Inconsistency, ConsistencyFix } from '../consistency/types'
import { JSONDiffViewer } from './JSONDiffViewer'

interface ConsistencyMessageProps {
  result: ConsistencyCheckResult
  onUndo?: () => void
  onKeep?: () => void
  canUndo?: boolean
  className?: string
}

const INCONSISTENCY_ICONS: Record<string, React.ReactNode> = {
  character: <User className="w-4 h-4" />,
  timeline: <Zap className="w-4 h-4" />,
  world_rule: <Scroll className="w-4 h-4" />,
  plot_logic: <Brain className="w-4 h-4" />,
  tone: <Palette className="w-4 h-4" />,
}

const SEVERITY_COLORS: Record<string, string> = {
  minor: 'text-yellow-500',
  major: 'text-orange-500',
  critical: 'text-red-500',
}

export const ConsistencyMessage: React.FC<ConsistencyMessageProps> = ({
  result,
  onUndo,
  onKeep,
  canUndo = true,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [actionTaken, setActionTaken] = useState<'kept' | 'undone' | null>(null)

  const { inconsistencies, fixes, summary } = result

  // If no inconsistencies, show success message
  if (inconsistencies.length === 0) {
    return (
      <div
        className={cn(
          'p-4 rounded-lg border border-green-500/30 bg-green-500/5 animate-in fade-in slide-in-from-bottom-2 duration-300',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-green-500/10">
            <Check className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <div className="font-bold text-sm text-green-600 dark:text-green-400">
              ✓ No Inconsistencies Detected
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Story elements are consistent
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Action taken states
  if (actionTaken === 'kept') {
    return (
      <div className={cn('p-4 rounded-lg border border-primary/30 bg-primary/5', className)}>
        <div className="flex items-center gap-3">
          <Check className="w-5 h-5 text-primary" />
          <div className="text-sm text-foreground">Consistency fixes kept</div>
        </div>
      </div>
    )
  }

  if (actionTaken === 'undone') {
    return (
      <div
        className={cn('p-4 rounded-lg border border-muted-foreground/30 bg-muted/20', className)}
      >
        <div className="flex items-center gap-3">
          <RefreshCcw className="w-5 h-5 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">Consistency fixes reverted</div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'border border-primary/30 rounded-lg overflow-hidden bg-primary/5 animate-in fade-in slide-in-from-bottom-2 duration-300',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-primary/20 bg-primary/10">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-primary/20 flex-shrink-0">
            <RefreshCcw className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-primary flex items-center gap-2">
              🔄 Consistency Check Applied
            </div>
            <div className="text-xs text-foreground/80 mt-1">{summary}</div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs h-7 flex-shrink-0"
          >
            {isExpanded ? 'Hide Details' : 'Show Details'}
          </Button>
        </div>
      </div>

      {/* Details */}
      {isExpanded && (
        <div className="p-4 space-y-4 bg-background/50">
          {/* Inconsistencies Summary */}
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">
              Inconsistencies Fixed
            </div>
            <div className="space-y-2">
              {inconsistencies.map((inc, idx) => (
                <InconsistencyCard key={inc.id} inconsistency={inc} fix={fixes[idx]} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-3 border-t border-primary/20 bg-muted/10 flex items-center justify-end gap-2">
        {canUndo && onUndo && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onUndo()
              setActionTaken('undone')
            }}
            className="text-xs h-8"
          >
            <RefreshCcw className="w-3 h-3 mr-1.5" />
            Undo All
          </Button>
        )}
        {onKeep && (
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              onKeep()
              setActionTaken('kept')
            }}
            className="text-xs h-8"
          >
            <Check className="w-3 h-3 mr-1.5" />
            Keep Changes
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * Card for a single inconsistency and its fix
 */
const InconsistencyCard: React.FC<{
  inconsistency: Inconsistency
  fix?: ConsistencyFix
}> = ({ inconsistency, fix }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const icon = INCONSISTENCY_ICONS[inconsistency.type] || <AlertTriangle className="w-4 h-4" />
  const severityColor = SEVERITY_COLORS[inconsistency.severity] || 'text-muted-foreground'

  return (
    <div className="border border-border/30 rounded-lg overflow-hidden bg-background">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-start gap-3 p-3 hover:bg-muted/20 transition-colors text-left"
      >
        <div className={cn('p-1.5 rounded bg-muted/50 flex-shrink-0', severityColor)}>{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-foreground">
            {inconsistency.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} -{' '}
            {inconsistency.severity}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
            {inconsistency.description}
          </div>
        </div>
        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
      </button>

      {/* Expanded details */}
      {isExpanded && fix && (
        <div className="border-t border-border/30 p-3 bg-muted/10">
          <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">
            Changes Applied
          </div>
          <JSONDiffViewer changes={fix.changes} />
        </div>
      )}
    </div>
  )
}

export default ConsistencyMessage
