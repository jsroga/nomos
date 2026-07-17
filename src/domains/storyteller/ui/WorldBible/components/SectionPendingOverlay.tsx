'use client'

import React from 'react'
import { Check, X, Eye, Loader2 } from 'lucide-react'
import { Button } from '@/components/Button'
import type { PendingAction } from '../utils/bible-context-types'

interface SectionPendingOverlayProps {
  pendingAction: PendingAction
  onReview?: () => void
}

export const SectionPendingOverlay: React.FC<SectionPendingOverlayProps> = ({
  pendingAction,
  onReview,
}) => {
  const isProcessing = pendingAction.isProcessing ?? false

  return (
    <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center gap-3 border-2 border-amber-500/50 animate-in fade-in duration-200">
      <div className="text-center">
        <div className="text-xs font-medium text-amber-400 uppercase tracking-wider mb-1">
          {isProcessing ? 'Applying Changes...' : 'Pending Review'}
        </div>
        <p className="text-sm text-muted-foreground max-w-[200px]">
          {isProcessing
            ? 'Please wait while changes are being saved'
            : 'New content ready for approval'}
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
          Reject
        </Button>

        {onReview && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 border-blue-500/50 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 disabled:opacity-50"
            onClick={onReview}
            disabled={isProcessing}
          >
            <Eye className="w-3.5 h-3.5" />
            Review
          </Button>
        )}

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
          {isProcessing ? 'Saving...' : 'Accept'}
        </Button>
      </div>
    </div>
  )
}
