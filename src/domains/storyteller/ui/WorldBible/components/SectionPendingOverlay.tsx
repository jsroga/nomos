'use client'

import React, { useState } from 'react'
import { Check, X, Eye, Loader2 } from 'lucide-react'
import { Button } from '@/components/Button'
import { VisualJsonDiff } from '@/domains/storyteller/ui/ActionToast/VisualJsonDiff'
import { SectionPendingOverlayCopy } from '@/domains/storyteller/ui/WorldBible/constants/section-pending-overlay'
import type { PendingAction } from '../utils/bible-context-types'

interface SectionPendingOverlayProps {
  pendingAction: PendingAction
  onReview?: () => void
}

export const SectionPendingOverlay: React.FC<SectionPendingOverlayProps> = ({
  pendingAction,
  onReview,
}) => {
  const [showDiff, setShowDiff] = useState(false)
  const isProcessing = pendingAction.isProcessing ?? false

  const handleReviewToggle = () => {
    setShowDiff(current => !current)
    onReview?.()
  }

  return (
    <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center gap-3 border-2 border-amber-500/50 animate-in fade-in duration-200 overflow-y-auto p-4">
      <div className="text-center">
        <div className="text-xs font-medium text-amber-400 uppercase tracking-wider mb-1">
          {isProcessing ? SectionPendingOverlayCopy.Applying : SectionPendingOverlayCopy.Title}
        </div>
        <p className="text-sm text-muted-foreground max-w-[200px]">
          {isProcessing
            ? SectionPendingOverlayCopy.SavingWait
            : SectionPendingOverlayCopy.Ready}
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
          onClick={pendingAction.onReject}
          disabled={isProcessing}
        >
          <X className="w-3.5 h-3.5" />
          {SectionPendingOverlayCopy.Reject}
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 border-blue-500/50 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 disabled:opacity-50"
          onClick={handleReviewToggle}
          disabled={isProcessing}
        >
          <Eye className="w-3.5 h-3.5" />
          {showDiff ? SectionPendingOverlayCopy.CloseReview : SectionPendingOverlayCopy.Review}
        </Button>

        <Button
          size="sm"
          className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
          onClick={pendingAction.onAccept}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          {isProcessing ? SectionPendingOverlayCopy.Saving : SectionPendingOverlayCopy.Accept}
        </Button>
      </div>

      {showDiff && (
        <div className="w-full max-w-lg">
          <VisualJsonDiff action={pendingAction.action} onClose={() => setShowDiff(false)} />
        </div>
      )}
    </div>
  )
}
