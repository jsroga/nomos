'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/Dialog'
import { type TileReviewType } from '../constants/tile-review-dialog'
import { useTileReviewDialog } from '../hooks/useTileReviewDialog'
import { TileReviewDialogBody } from './TileReviewDialogBody'
import { TileReviewDialogActions } from './TileReviewDialogActions'

export type { TileReviewType } from '../constants/tile-review-dialog'

interface TileReviewDialogProps {
  open: boolean
  onClose: () => void
  tileX: number
  tileY: number
  newUrl: string
  variantUrls?: string[]
  originalUrl?: string
  type: TileReviewType
  queueLength?: number
  tokenId?: string
  runId?: string
}

export const TileReviewDialog: React.FC<TileReviewDialogProps> = ({
  open,
  onClose,
  tileX,
  tileY,
  newUrl,
  variantUrls,
  originalUrl,
  type,
  queueLength = 0,
  tokenId,
  runId,
}) => {
  const {
    labels,
    title,
    requiresVariantSelection,
    pickerVariantUrls,
    comparisonOriginalUrl,
    selectedVariantUrl,
    setSelectedVariantUrl,
    isAccepting,
    isRejecting,
    isUpscaling,
    handleAccept,
    handleUpscale,
    handleReject,
    showMjActions,
  } = useTileReviewDialog({
    open,
    onClose,
    tileX,
    tileY,
    newUrl,
    variantUrls,
    originalUrl,
    type,
    tokenId,
    runId,
  })

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl bg-background/80 backdrop-blur-2xl border-border/50 rounded-2xl shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{title}</DialogTitle>
            {queueLength > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                +{queueLength} more in queue
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <TileReviewDialogBody
            requiresVariantSelection={requiresVariantSelection}
            pickerVariantUrls={pickerVariantUrls}
            selectedVariantUrl={selectedVariantUrl}
            onSelectVariant={setSelectedVariantUrl}
            comparisonOriginalUrl={comparisonOriginalUrl}
            newUrl={newUrl}
            newLabel={labels.new}
          />

          <TileReviewDialogActions
            acceptLabel={labels.accept}
            requiresVariantSelection={requiresVariantSelection}
            selectedVariantUrl={selectedVariantUrl}
            showMjActions={showMjActions}
            isAccepting={isAccepting}
            isRejecting={isRejecting}
            isUpscaling={isUpscaling}
            onAccept={handleAccept}
            onReject={handleReject}
            onUpscale={handleUpscale}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
