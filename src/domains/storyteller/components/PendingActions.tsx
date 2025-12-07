'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { ActionHistoryEntry } from '../actions/types'
import { QuestionSession } from '../questions/types'
import { formatActionForDisplay } from '../actions/executor'
import {
  MessageCircleQuestion,
  History,
  Check,
  Undo2,
  AlertTriangle,
  ChevronRight,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PendingActionsProps {
  pendingQuestions: QuestionSession[]
  recentActions: ActionHistoryEntry[]
  onViewQuestion?: (questionId: string) => void
  onUndoAction?: (entryId: string) => void
  className?: string
}

export const PendingActions: React.FC<PendingActionsProps> = ({
  pendingQuestions,
  recentActions,
  onViewQuestion,
  onUndoAction,
  className,
}) => {
  const blockingQuestions = pendingQuestions.filter(q => q.question.urgency === 'blocking')
  const otherQuestions = pendingQuestions.filter(q => q.question.urgency !== 'blocking')

  return (
    <div className={cn('space-y-4', className)}>
      {/* Blocking Questions */}
      {blockingQuestions.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="font-semibold text-sm text-red-400">
              Awaiting Your Response ({blockingQuestions.length})
            </span>
          </div>
          <div className="space-y-2">
            {blockingQuestions.map(session => (
              <QuestionItem
                key={session.id}
                session={session}
                onView={() => onViewQuestion?.(session.id)}
                isBlocking
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Pending Questions */}
      {otherQuestions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <MessageCircleQuestion className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
              Questions ({otherQuestions.length})
            </span>
          </div>
          <div className="space-y-1">
            {otherQuestions.map(session => (
              <QuestionItem
                key={session.id}
                session={session}
                onView={() => onViewQuestion?.(session.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent Actions */}
      {recentActions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <History className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
              Recent Actions ({recentActions.length})
            </span>
          </div>
          <div className="space-y-1">
            {recentActions
              .slice(-5)
              .reverse()
              .map(entry => (
                <ActionItem key={entry.id} entry={entry} onUndo={() => onUndoAction?.(entry.id)} />
              ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {pendingQuestions.length === 0 && recentActions.length === 0 && (
        <div className="text-center py-4 text-muted-foreground text-sm">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No pending actions</p>
          <p className="text-xs mt-1">Agent activity will appear here</p>
        </div>
      )}
    </div>
  )
}

// ============================================
// Question Item
// ============================================

interface QuestionItemProps {
  session: QuestionSession
  onView?: () => void
  isBlocking?: boolean
}

const QuestionItem: React.FC<QuestionItemProps> = ({ session, onView, isBlocking = false }) => {
  return (
    <button
      onClick={onView}
      className={cn(
        'w-full text-left p-2 rounded-md transition-colors',
        'hover:bg-accent/50',
        isBlocking ? 'bg-red-500/5' : 'bg-muted/30'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{session.question.agentName}</p>
          <p className="text-sm truncate">{session.question.question}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </div>
    </button>
  )
}

// ============================================
// Action Item
// ============================================

interface ActionItemProps {
  entry: ActionHistoryEntry
  onUndo?: () => void
}

const ActionItem: React.FC<ActionItemProps> = ({ entry, onUndo }) => {
  const display = formatActionForDisplay(entry.action)
  const isUndone = entry.status === 'undone'

  return (
    <div
      className={cn(
        'flex items-center gap-2 p-2 rounded-md',
        isUndone ? 'bg-muted/20 opacity-50' : 'bg-muted/30'
      )}
    >
      <span className="text-lg flex-shrink-0">{display.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm truncate', isUndone && 'line-through')}>{display.title}</p>
        <p className="text-xs text-muted-foreground truncate">{display.description}</p>
      </div>
      {!isUndone && onUndo && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0"
          onClick={e => {
            e.stopPropagation()
            onUndo()
          }}
          title="Undo"
        >
          <Undo2 className="w-3 h-3" />
        </Button>
      )}
      {entry.status === 'committed' && !onUndo && (
        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
      )}
    </div>
  )
}

export default PendingActions
