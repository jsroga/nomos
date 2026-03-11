'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from '@/domains/world-building-toolkit/components/Sidebar/Sidebar'
import { WorldCanvas } from '@/domains/world-building-toolkit/components/Canvas/WorldCanvas'
import { RepaintToolbar } from '@/domains/world-building-toolkit/components/RepaintToolbar'
import { SelectModeToolbar } from '@/domains/world-building-toolkit/components/SelectModeToolbar'
import { WorldGenToolbar } from '@/domains/world-building-toolkit/components/WorldGenToolbar'
import {
  TileReviewDialog,
  TileReviewType,
} from '@/domains/world-building-toolkit/components/TileReviewDialog'
import { useProjectFromUrl } from '@/hooks/useProjectFromUrl'

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

import { TOUR_STEP_IDS } from '@/lib/tour-constants'

export default function WorldBuildingPage() {
  // ...
  // Load project from URL
  const { projectId } = useProjectFromUrl()

  // Review queue - items are added to the END, processed from the START (FIFO)
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Clear review queue when project changes so stale modals don't bleed into a new project
  useEffect(() => {
    setReviewQueue([])
    setIsDialogOpen(false)
  }, [projectId])

  // Get the current item (first in queue)
  const currentReview = reviewQueue[0] || null

  // Add item to the END of the queue
  const addToQueue = useCallback((item: Omit<ReviewQueueItem, 'id'>) => {
    const id = `${item.type}-${item.tileX}-${item.tileY}-${Date.now()}`
    const cacheBust = `?t=${Date.now()}`

    // Add cache-busting to URLs
    const newUrl = item.newUrl ? `${item.newUrl}${cacheBust}` : item.newUrl
    const originalUrl = item.originalUrl ? `${item.originalUrl}${cacheBust}` : item.originalUrl
    const variantUrls = item.variantUrls?.map(url => `${url}${cacheBust}`)

    console.log('[ReviewQueue] Adding item:', {
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

  // Remove current item and show next (or close if empty)
  const handleClose = useCallback(() => {
    setReviewQueue(prev => {
      const newQueue = prev.slice(1) // Remove first item
      if (newQueue.length === 0) {
        setIsDialogOpen(false)
      }
      return newQueue
    })
  }, [])

  // Listen for upscale review events
  useEffect(() => {
    const handleUpscaleReview = (event: any) => {
      const { tileX, tileY, upscaledUrl, originalUrl } = event.detail
      addToQueue({
        tileX,
        tileY,
        newUrl: upscaledUrl,
        originalUrl,
        type: 'upscale',
      })
    }

    window.addEventListener('upscale-review-ready', handleUpscaleReview)
    return () => window.removeEventListener('upscale-review-ready', handleUpscaleReview)
  }, [addToQueue])

  // Listen for generation review events
  useEffect(() => {
    const handleGenerationReview = (event: any) => {
      const { tileX, tileY, newUrl, variantUrls, originalUrl } = event.detail
      addToQueue({
        tileX,
        tileY,
        newUrl,
        variantUrls,
        originalUrl,
        type: 'generation',
      })
    }

    window.addEventListener('generation-review-ready', handleGenerationReview)
    return () => window.removeEventListener('generation-review-ready', handleGenerationReview)
  }, [addToQueue])

  // Listen for fidelity review events
  useEffect(() => {
    const handleFidelityReview = (event: any) => {
      const { tileX, tileY, newUrl, originalUrl } = event.detail
      addToQueue({
        tileX,
        tileY,
        newUrl,
        originalUrl,
        type: 'fidelity',
      })
    }

    window.addEventListener('fidelity-review-ready', handleFidelityReview)
    return () => window.removeEventListener('fidelity-review-ready', handleFidelityReview)
  }, [addToQueue])

  useEffect(() => {
    const handleVariantSelection = (event: any) => {
      const { tileX, tileY, variantUrls, tokenId } = event.detail
      addToQueue({
        tileX,
        tileY,
        newUrl: variantUrls[0] ?? '',
        variantUrls,
        tokenId,
        type: 'generation',
      })
    }
    window.addEventListener('generation-variant-selection-ready', handleVariantSelection)
    return () => window.removeEventListener('generation-variant-selection-ready', handleVariantSelection)
  }, [addToQueue])

  return (
    <div className="flex h-full w-full overflow-hidden bg-black text-zinc-200 font-sans selection:bg-indigo-500/30">
      <div id={TOUR_STEP_IDS.WORLD_GEN_NAV}>
        <Sidebar />
      </div>

      {/* Toolbar (Left) */}
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

      {/* Unified Review Dialog with Queue */}
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
