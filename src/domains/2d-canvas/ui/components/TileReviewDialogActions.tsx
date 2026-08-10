import React from 'react'
import { Button } from '@/components/Button'
import { Check, X, Loader2 } from 'lucide-react'
import { KeyboardKey } from '../constants/tile-review-dialog'

interface TileReviewDialogActionsProps {
  acceptLabel: string
  requiresVariantSelection: boolean
  selectedVariantUrl: string | null
  showMjActions: boolean
  isAccepting: boolean
  isRejecting: boolean
  isUpscaling: boolean
  onAccept: () => void
  onReject: () => void
  onUpscale: () => void
}

function TileReviewKeyboardHints({
  requiresVariantSelection,
  selectedVariantUrl,
}: Pick<TileReviewDialogActionsProps, 'requiresVariantSelection' | 'selectedVariantUrl'>) {
  return (
    <div className="text-xs text-muted-foreground">
      <kbd className="px-2 py-1 bg-muted rounded border border-border">{KeyboardKey.Enter}</kbd>{' '}
      to accept •{' '}
      <kbd className="px-2 py-1 bg-muted rounded border border-border">{KeyboardKey.Escape}</kbd>{' '}
      to reject
      {requiresVariantSelection && !selectedVariantUrl && (
        <span className="ml-2 text-amber-500">Select a variant first</span>
      )}
    </div>
  )
}

function TileReviewRejectButton({
  isAccepting,
  isRejecting,
  isUpscaling,
  onReject,
}: Pick<TileReviewDialogActionsProps, 'isAccepting' | 'isRejecting' | 'isUpscaling' | 'onReject'>) {
  return (
    <Button
      variant="outline"
      onClick={onReject}
      disabled={isAccepting || isRejecting || isUpscaling}
      className="gap-2"
    >
      {isRejecting ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
      Reject
    </Button>
  )
}

function TileReviewMjActionButtons({
  isAccepting,
  isRejecting,
  isUpscaling,
  selectedVariantUrl,
  onAccept,
  onUpscale,
}: Pick<
  TileReviewDialogActionsProps,
  'isAccepting' | 'isRejecting' | 'isUpscaling' | 'selectedVariantUrl' | 'onAccept' | 'onUpscale'
>) {
  const actionsDisabled = isAccepting || isRejecting || isUpscaling || !selectedVariantUrl

  return (
    <>
      <Button
        variant="outline"
        onClick={onAccept}
        disabled={actionsDisabled}
        className="gap-2"
      >
        {isAccepting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        Use this
      </Button>
      <Button onClick={onUpscale} disabled={actionsDisabled} className="gap-2">
        {isUpscaling ? <Loader2 size={16} className="animate-spin" /> : null}
        Upscale this
      </Button>
    </>
  )
}

function TileReviewAcceptButton({
  acceptLabel,
  requiresVariantSelection,
  selectedVariantUrl,
  isAccepting,
  isRejecting,
  onAccept,
}: Pick<
  TileReviewDialogActionsProps,
  | 'acceptLabel'
  | 'requiresVariantSelection'
  | 'selectedVariantUrl'
  | 'isAccepting'
  | 'isRejecting'
  | 'onAccept'
>) {
  return (
    <Button
      onClick={onAccept}
      disabled={isAccepting || isRejecting || (requiresVariantSelection && !selectedVariantUrl)}
      className="gap-2"
    >
      {isAccepting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
      {acceptLabel}
    </Button>
  )
}

export const TileReviewDialogActions: React.FC<TileReviewDialogActionsProps> = ({
  acceptLabel,
  requiresVariantSelection,
  selectedVariantUrl,
  showMjActions,
  isAccepting,
  isRejecting,
  isUpscaling,
  onAccept,
  onReject,
  onUpscale,
}) => (
  <div className="flex items-center justify-between pt-4">
    <TileReviewKeyboardHints
      requiresVariantSelection={requiresVariantSelection}
      selectedVariantUrl={selectedVariantUrl}
    />

    <div className="flex gap-2">
      <TileReviewRejectButton
        isAccepting={isAccepting}
        isRejecting={isRejecting}
        isUpscaling={isUpscaling}
        onReject={onReject}
      />

      {showMjActions ? (
        <TileReviewMjActionButtons
          isAccepting={isAccepting}
          isRejecting={isRejecting}
          isUpscaling={isUpscaling}
          selectedVariantUrl={selectedVariantUrl}
          onAccept={onAccept}
          onUpscale={onUpscale}
        />
      ) : (
        <TileReviewAcceptButton
          acceptLabel={acceptLabel}
          requiresVariantSelection={requiresVariantSelection}
          selectedVariantUrl={selectedVariantUrl}
          isAccepting={isAccepting}
          isRejecting={isRejecting}
          onAccept={onAccept}
        />
      )}
    </div>
  </div>
)
