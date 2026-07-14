'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/Button'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  XCircle,
  Plus,
  Minus,
  Edit3,
  Eye,
  Code,
  Sparkles,
  Loader2,
} from 'lucide-react'
import type { WireAgentAction } from '@/shared/agent-kernel/action-wire'
import { cn } from '@/shared/data/utils'
import type { ActionChange } from '@/domains/storyteller/ui/ActionApprovalModal/action-approval-types'
import {
  ActionChangeType,
  ApprovalViewMode,
  CATEGORY_TABLE_VIEW_SET,
  MODAL_DISPLAY_NAME,
} from '@/domains/storyteller/ui/ActionApprovalModal/constants/action-approval-display'
import { extractChanges } from '@/domains/storyteller/ui/ActionApprovalModal/extract-action-changes'
import { formatActionType } from '@/domains/storyteller/ui/ActionApprovalModal/action-approval-helpers'
import { useApprovalModalKeyboard } from '@/domains/storyteller/ui/ActionApprovalModal/useApprovalModalKeyboard'
import {
  ApprovalModalSummaryPanel,
  openDiffForChange,
} from '@/domains/storyteller/ui/ActionApprovalModal/ApprovalModalSummaryPanel'
import { ApprovalModalDiffPanel } from '@/domains/storyteller/ui/ActionApprovalModal/ApprovalModalDiffPanel'

interface ActionApprovalModalProps {
  action: WireAgentAction
  agentName: string
  onApprove: () => void
  onReject: () => void
  onClose: () => void
  isOpen: boolean
  isProcessing?: boolean
}

function shouldUseTableView(category: string, categoryChanges: ActionChange[]): boolean {
  if (!CATEGORY_TABLE_VIEW_SET.has(category)) {
    return false
  }
  return categoryChanges.some(
    change =>
      typeof (change.after || change.before) === 'object' &&
      (change.after || change.before) !== null &&
      !Array.isArray(change.after || change.before)
  )
}

export const ActionApprovalModal: React.FC<ActionApprovalModalProps> = React.memo(({
  action,
  agentName,
  onApprove,
  onReject,
  onClose,
  isOpen,
  isProcessing = false,
}) => {
  const [currentChangeIndex, setCurrentChangeIndex] = useState(0)
  const [viewMode, setViewMode] = useState<ApprovalViewMode>(ApprovalViewMode.SUMMARY)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [isApproving, setIsApproving] = useState(false)

  useEffect(() => {
    if (isOpen) setIsApproving(false)
  }, [isOpen])

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      await onApprove()
    } finally {
      setIsApproving(false)
    }
  }

  const changes = useMemo(() => extractChanges(action), [action])
  const currentChange = changes[currentChangeIndex]

  const changesByCategory = useMemo(() => {
    const grouped: Record<string, ActionChange[]> = {}
    changes.forEach(change => {
      if (!grouped[change.category]) {
        grouped[change.category] = []
      }
      grouped[change.category].push(change)
    })
    return grouped
  }, [changes])

  const stats = useMemo(() => {
    const adds = changes.filter(change => change.changeType === ActionChangeType.ADD).length
    const mods = changes.filter(change => change.changeType === ActionChangeType.MODIFY).length
    const removes = changes.filter(change => change.changeType === ActionChangeType.REMOVE).length
    return { adds, mods, removes, total: changes.length }
  }, [changes])

  useApprovalModalKeyboard({
    isOpen,
    viewMode,
    currentChangeIndex,
    changeCount: changes.length,
    onClose,
    onApprove,
    onReject,
    setCurrentChangeIndex,
    setViewMode,
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full h-full max-w-[95vw] max-h-[95vh] bg-background border border-border shadow-2xl rounded-lg flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onClose} className="gap-2">
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="h-6 w-px bg-border" />
            <div>
              <div className="font-bold text-sm uppercase tracking-wider text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                {formatActionType(action.type)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                <span>
                  From: <span className="text-foreground">{agentName}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  Confidence:
                  <span
                    className={cn(
                      'font-medium',
                      (action.confidence || 0.8) >= 0.8
                        ? 'text-green-400'
                        : (action.confidence || 0.8) >= 0.5
                          ? 'text-yellow-400'
                          : 'text-red-400'
                    )}
                  >
                    {Math.round((action.confidence || 0.8) * 100)}%
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex gap-2 text-xs">
              {stats.adds > 0 && (
                <span className="flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 rounded-full">
                  <Plus className="w-3 h-3" /> {stats.adds} new
                </span>
              )}
              {stats.mods > 0 && (
                <span className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-400 rounded-full">
                  <Edit3 className="w-3 h-3" /> {stats.mods} modified
                </span>
              )}
              {stats.removes > 0 && (
                <span className="flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 rounded-full">
                  <Minus className="w-3 h-3" /> {stats.removes} removed
                </span>
              )}
            </div>
            <div className="h-6 w-px bg-border" />
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-2 border-b border-border/30 bg-background/50">
          <div className="flex gap-1 p-0.5 bg-muted/50 rounded-lg">
            <Button
              variant={viewMode === ApprovalViewMode.SUMMARY ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode(ApprovalViewMode.SUMMARY)}
              className="h-7 gap-2 text-xs"
            >
              <Eye className="w-3.5 h-3.5" />
              Summary View
            </Button>
            <Button
              variant={viewMode === ApprovalViewMode.DIFF ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode(ApprovalViewMode.DIFF)}
              className="h-7 gap-2 text-xs"
            >
              <Code className="w-3.5 h-3.5" />
              Code Diff
            </Button>
          </div>
          {viewMode === ApprovalViewMode.DIFF && changes.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {currentChangeIndex + 1} of {changes.length}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentChangeIndex(Math.max(0, currentChangeIndex - 1))}
                  disabled={currentChangeIndex === 0}
                  className="h-6 w-6"
                >
                  <ChevronLeft className="w-3 h-3" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setCurrentChangeIndex(Math.min(changes.length - 1, currentChangeIndex + 1))
                  }
                  disabled={currentChangeIndex === changes.length - 1}
                  className="h-6 w-6"
                >
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-hidden">
          {viewMode === ApprovalViewMode.SUMMARY ? (
            <ApprovalModalSummaryPanel
              changesByCategory={changesByCategory}
              changes={changes}
              expandedSections={expandedSections}
              toggleSection={toggleSection}
              setExpandedSections={setExpandedSections}
              onOpenDiff={changeIndex =>
                openDiffForChange(changeIndex, setCurrentChangeIndex, setViewMode)
              }
              shouldUseTableView={shouldUseTableView}
            />
          ) : (
            <ApprovalModalDiffPanel currentChange={currentChange} />
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/30">
          <div className="flex gap-3 text-[10px] text-muted-foreground font-mono">
            <span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">Esc</kbd> Close
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">Tab</kbd> Switch
              View
            </span>
            {viewMode === ApprovalViewMode.DIFF && changes.length > 1 && (
              <span>
                <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">←→</kbd>{' '}
                Navigate
              </span>
            )}
            <span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">Enter</kbd>{' '}
              Approve
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">Del</kbd> Reject
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onReject} className="gap-2">
              <XCircle className="w-4 h-4" />
              Reject
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isProcessing || isApproving}
              className="gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-70 text-white"
            >
              {isProcessing || isApproving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {isProcessing || isApproving ? 'Processing...' : 'Approve'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
})

ActionApprovalModal.displayName = MODAL_DISPLAY_NAME
