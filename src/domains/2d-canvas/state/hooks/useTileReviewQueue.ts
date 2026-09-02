'use client'

import { useState, useCallback, useEffect } from 'react'
import type { TileReviewType } from '../../ui/constants/tile-review-dialog'
import { WORLD_GEN_REVIEW_QUEUE_LOG_PREFIX } from '../../ui/constants/world-gen-page'
import { useWorldUiStore } from '../useWorldUiStore'

export interface ReviewQueueItem {
  id: string
  tileX: number
  tileY: number
  newUrl: string
  variantUrls?: string[]
  originalUrl?: string
  type: TileReviewType
  tokenId?: string
  runId?: string
}

export function useTileReviewQueue() {
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const currentReview = reviewQueue[0] ?? null

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
    return useWorldUiStore.subscribe((state, prevState) => {
      if (state.reviewRequestVersion === prevState.reviewRequestVersion) return
      const item = state.pendingReviewRequest
      if (!item || state.reviewRequestVersion === 0) return
      addToQueue({
        tileX: item.tileX,
        tileY: item.tileY,
        newUrl: item.newUrl,
        variantUrls: item.variantUrls,
        originalUrl: item.originalUrl,
        type: item.type,
        tokenId: item.tokenId,
        runId: item.runId,
      })
    })
  }, [addToQueue])

  return {
    currentReview,
    isDialogOpen,
    handleClose,
    queueLength: reviewQueue.length - 1,
  }
}
