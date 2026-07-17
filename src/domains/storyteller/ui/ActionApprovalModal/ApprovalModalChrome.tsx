import React from 'react'
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
import { ApprovalViewMode } from '@/domains/storyteller/ui/ActionApprovalModal/constants/action-approval-display'
import { formatActionType } from '@/domains/storyteller/ui/ActionApprovalModal/action-approval-helpers'
import { getApprovalConfidenceClass } from '@/domains/storyteller/ui/ActionApprovalModal/constants/approval-confidence'

interface ApprovalStats {
  adds: number
  mods: number
  removes: number
  total: number
}

interface ApprovalModalHeaderProps {
  action: WireAgentAction
  agentName: string
  stats: ApprovalStats
  onClose: () => void
}

export const ApprovalModalHeader: React.FC<ApprovalModalHeaderProps> = ({
  action,
  agentName,
  stats,
  onClose,
}) => {
  const confidence = action.confidence ?? 0.8
  const confidenceClass = getApprovalConfidenceClass(confidence)

  return (
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
              <span className={cn('font-medium', confidenceClass)}>
                {Math.round(confidence * 100)}%
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
  )
}

interface ApprovalModalToolbarProps {
  viewMode: ApprovalViewMode
  setViewMode: (mode: ApprovalViewMode) => void
  currentChangeIndex: number
  changeCount: number
  setCurrentChangeIndex: (index: number) => void
}

export const ApprovalModalToolbar: React.FC<ApprovalModalToolbarProps> = ({
  viewMode,
  setViewMode,
  currentChangeIndex,
  changeCount,
  setCurrentChangeIndex,
}) => (
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
    {viewMode === ApprovalViewMode.DIFF && changeCount > 1 && (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {currentChangeIndex + 1} of {changeCount}
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
              setCurrentChangeIndex(Math.min(changeCount - 1, currentChangeIndex + 1))
            }
            disabled={currentChangeIndex === changeCount - 1}
            className="h-6 w-6"
          >
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      </div>
    )}
  </div>
)

interface ApprovalModalFooterProps {
  viewMode: ApprovalViewMode
  changeCount: number
  onReject: () => void
  onApprove: () => void
  isProcessing: boolean
  isApproving: boolean
}

export const ApprovalModalFooter: React.FC<ApprovalModalFooterProps> = ({
  viewMode,
  changeCount,
  onReject,
  onApprove,
  isProcessing,
  isApproving,
}) => {
  const showDiffNav = viewMode === ApprovalViewMode.DIFF && changeCount > 1
  const isBusy = isProcessing || isApproving

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/30">
      <div className="flex gap-3 text-[10px] text-muted-foreground font-mono">
        <span>
          <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">Esc</kbd> Close
        </span>
        <span>
          <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">Tab</kbd> Switch View
        </span>
        {showDiffNav && (
          <span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">←→</kbd> Navigate
          </span>
        )}
        <span>
          <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">Enter</kbd> Approve
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
          onClick={onApprove}
          disabled={isBusy}
          className="gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-70 text-white"
        >
          {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {isBusy ? 'Processing...' : 'Approve'}
        </Button>
      </div>
    </div>
  )
}
