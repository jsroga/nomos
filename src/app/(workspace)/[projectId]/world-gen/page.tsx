'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Sidebar,
  WorldCanvas,
  RepaintToolbar,
  SelectModeToolbar,
  WorldGenToolbar,
  TileReviewDialog,
  type TileReviewType,
} from '@/domains/world-building-toolkit'
import { useProjectFromUrl } from '@/shared/data/useProjectFromUrl'
import { useWorldUiStore } from '@/domains/world-building-toolkit/state/useWorldUiStore'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import {
  WORLD_GEN_REVIEW_QUEUE_LOG_PREFIX,
} from '@/domains/world-building-toolkit/ui/constants/world-gen-page'

interface ReviewQueueItem {
  id: string
  tileX: number
  tileY: number
  newUrl: string
  variantUrls?: string[]
  originalUrl?: string
  type: TileReviewType
  tokenId?: string
}

export default function WorldBuildingPage() {
  const { projectId } = useProjectFromUrl()

  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const reviewRequestVersion = useWorldUiStore(state => state.reviewRequestVersion)
  const pendingReviewRequest = useWorldUiStore(state => state.pendingReviewRequest)

  useEffect(() => {
    setReviewQueue([])
    setIsDialogOpen(false)
  }, [projectId])

  const currentReview = reviewQueue[0] || null

  const addToQueue = useCallback((item: Omit<ReviewQueueItem, 'id'>) => {
    const id = `${item.type}-${item.tileX}-${item.tileY}-${Date.now()}`
    const cacheBust = `?t=${Date.now()}`

    const newUrl = item.newUrl ? `${item.newUrl}${cacheBust}` : item.newUrl
    const originalUrl = item.originalUrl ? `${item.originalUrl}${cacheBust}` : item.originalUrl
    const variantUrls = item.variantUrls?.map(url => `${url}${cacheBust}`)

    console.log(WORLD_GEN_REVIEW_QUEUE_LOG_PREFIX, {
      type: item.type,
      tileX: item.tileX,
      tileY: item.tileY,
      newUrl,
      variantUrls,
      originalUrl,
    })

    setReviewQueue(prev => [...prev, { ...item, id, newUrl, variantUrls, originalUrl }])
    setIsDialogOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setReviewQueue(prev => {
      const newQueue = prev.slice(1)
      if (newQueue.length === 0) {
        setIsDialogOpen(false)
      }
      return newQueue
    })
  }, [])

  useEffect(() => {
    if (!pendingReviewRequest || reviewRequestVersion === 0) return
    const item = pendingReviewRequest
    addToQueue({
      tileX: item.tileX,
      tileY: item.tileY,
      newUrl: item.newUrl,
      variantUrls: item.variantUrls,
      originalUrl: item.originalUrl,
      type: item.type as TileReviewType,
      tokenId: item.tokenId,
    })
  }, [pendingReviewRequest, reviewRequestVersion, addToQueue])

  return (
    <div className="flex h-full w-full overflow-hidden bg-black text-zinc-200 font-sans selection:bg-indigo-500/30">
      <div id={TOUR_STEP_IDS.WORLD_GEN_NAV}>
        <Sidebar />
      </div>

      <div className="w-16 border-r border-border/70 bg-background z-10">
        <WorldGenToolbar />
      </div>

      <div className="flex-1 relative">
        <div id={TOUR_STEP_IDS.WORLDGEN_CANVAS} className="w-full h-full">
          <WorldCanvas />
        </div>
        <div id={TOUR_STEP_IDS.WORLDGEN_REPAINT}>
          <RepaintToolbar />
        </div>
        <div id={TOUR_STEP_IDS.GENERATION_TRIGGER}>
          <SelectModeToolbar />
        </div>
      </div>

      {currentReview && (
        <TileReviewDialog
          open={isDialogOpen}
          onClose={handleClose}
          tileX={currentReview.tileX}
          tileY={currentReview.tileY}
          newUrl={currentReview.newUrl}
          variantUrls={currentReview.variantUrls}
          originalUrl={currentReview.originalUrl}
          type={currentReview.type}
          tokenId={currentReview.tokenId}
          queueLength={reviewQueue.length - 1}
        />
      )}
    </div>
  )
}
