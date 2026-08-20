'use client'

import { useEffect, useState, type MouseEvent } from 'react'
import { Check, Loader2, X } from 'lucide-react'
import { Button } from '@/components/Button'
import { ButtonSizeKey, ButtonVariantKey } from '@/components/Button/constants/button-styles'
import { useWorldStore } from '@/domains/2d-canvas'
import { repaintService } from '@/domains/2d-canvas/state/client-services/repaint-service'
import {
  RepaintPreviewMode,
  RepaintReviewClass,
  RepaintReviewCopy,
  REPAINT_REVIEW_ORIGIN,
} from '@/domains/2d-canvas/ui/constants/repaint-review'
import {
  REPAINT_APPLY_FAILED_TOAST,
  REPAINT_CHANGES_APPLIED_TOAST,
  REPAINT_CHANGES_DISCARDED_TOAST,
} from '@/domains/2d-canvas/ui/constants/repaint-toolbar'
import {
  repaintResultImageTransform,
  repaintResultScreenRect,
  repaintReviewBarTransform,
} from './repaint-review-geometry'
import toast from 'react-hot-toast'

function stopBarPointer(event: MouseEvent) {
  event.stopPropagation()
}

export function RepaintReviewOverlay() {
  const repaintResult = useWorldStore(state => state.repaintResult)
  const viewport = useWorldStore(state => state.viewport)
  const setRepaintResult = useWorldStore(state => state.setRepaintResult)
  const clearRepaintStrokes = useWorldStore(state => state.clearRepaintStrokes)
  const setRepaintMode = useWorldStore(state => state.setRepaintMode)
  const setDebugInfo = useWorldStore(state => state.setDebugInfo)
  const [previewMode, setPreviewMode] = useState(RepaintPreviewMode.After)
  const [isApplying, setIsApplying] = useState(false)

  useEffect(() => {
    setPreviewMode(RepaintPreviewMode.After)
  }, [repaintResult?.imageUrl])

  if (!repaintResult) return null

  const rect = repaintResultScreenRect(repaintResult.bounds, viewport)
  const showAfter = previewMode === RepaintPreviewMode.After

  const handleApprove = async () => {
    setIsApplying(true)
    try {
      await repaintService.applyRepaint(repaintResult)
      toast.success(REPAINT_CHANGES_APPLIED_TOAST)
      setRepaintResult(null)
      clearRepaintStrokes()
      setDebugInfo(null)
      setRepaintMode(false)
    } catch (error) {
      console.error(error)
      toast.error(REPAINT_APPLY_FAILED_TOAST)
    } finally {
      setIsApplying(false)
    }
  }

  const handleReject = () => {
    setRepaintResult(null)
    toast(REPAINT_CHANGES_DISCARDED_TOAST)
  }

  return (
    <>
      {showAfter ? (
        <img
          src={repaintResult.imageUrl}
          alt={RepaintReviewCopy.ResultAlt}
          className={RepaintReviewClass.Image}
          style={{
            left: REPAINT_REVIEW_ORIGIN,
            top: REPAINT_REVIEW_ORIGIN,
            transform: repaintResultImageTransform(rect),
            width: rect.width,
            height: rect.height,
          }}
        />
      ) : null}
      <div
        className={RepaintReviewClass.Bar}
        style={{
          left: REPAINT_REVIEW_ORIGIN,
          top: REPAINT_REVIEW_ORIGIN,
          transform: repaintReviewBarTransform(rect),
        }}
        onMouseDown={stopBarPointer}
        onClick={stopBarPointer}
      >
        <Button
          size={ButtonSizeKey.Sm}
          variant={
            previewMode === RepaintPreviewMode.Before
              ? ButtonVariantKey.Default
              : ButtonVariantKey.Ghost
          }
          onClick={() => setPreviewMode(RepaintPreviewMode.Before)}
        >
          {RepaintReviewCopy.Before}
        </Button>
        <Button
          size={ButtonSizeKey.Sm}
          variant={
            previewMode === RepaintPreviewMode.After
              ? ButtonVariantKey.Default
              : ButtonVariantKey.Ghost
          }
          onClick={() => setPreviewMode(RepaintPreviewMode.After)}
        >
          {RepaintReviewCopy.After}
        </Button>
        <div className={RepaintReviewClass.Divider} />
        <Button
          size={ButtonSizeKey.Sm}
          variant={ButtonVariantKey.Default}
          className="gap-1.5"
          disabled={isApplying}
          onClick={() => {
            void handleApprove()
          }}
        >
          {isApplying ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {RepaintReviewCopy.Approve}
        </Button>
        <Button
          size={ButtonSizeKey.Sm}
          variant={ButtonVariantKey.Outline}
          className="gap-1.5"
          disabled={isApplying}
          onClick={handleReject}
        >
          <X size={14} />
          {RepaintReviewCopy.Reject}
        </Button>
      </div>
    </>
  )
}
