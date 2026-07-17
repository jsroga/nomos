'use client'

import React, { useState } from 'react'
import { Button } from '@/components/Button'
import { cn } from '@/shared/data/utils'
import type { WireAgentAction } from '@/shared/agent-kernel/action-wire'
import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import { formatActionForDisplay } from '@/domains/storyteller/core/formatting/action-formatters'
import { VisualJsonDiff } from '@/domains/storyteller/ui/ActionToast/VisualJsonDiff'
import { Check, Loader2, Eye, X } from 'lucide-react'

interface ActionSuggestionProps {
  action: WireAgentAction
  agentName: string
  onAccept: () => void
  onReview: () => void
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
  const [showDiff, setShowDiff] = useState(false)
  const display = formatActionForDisplay(action, ApprovalActionStatus.PENDING)

  const handleReviewToggle = () => {
    setShowDiff(!showDiff)
    onReview()
  }

  const hasLongDescription = Boolean(display.description && display.description.length > 100)

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

          <div className="relative">
            <p
              className={cn(
                'text-xs text-muted-foreground leading-relaxed transition-all duration-200',
                showPreview ? '' : 'line-clamp-2'
              )}
            >
              {display.description}
            </p>
            {hasLongDescription && (
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
              variant={showDiff ? 'secondary' : 'outline'}
              onClick={handleReviewToggle}
              disabled={isProcessing}
              className={cn(
                'h-7 text-[10px] uppercase tracking-widest transition-all font-bold px-3',
                showDiff
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  : 'bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-600/20'
              )}
            >
              <Eye className="w-3 h-3 mr-1.5" />
              {showDiff ? 'Close Review' : 'Review'}
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

          {showDiff && <VisualJsonDiff action={action} onClose={() => setShowDiff(false)} />}
        </div>
      </div>
    </div>
  )
}
