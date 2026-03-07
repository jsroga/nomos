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
  originalUrl?: string
  type: TileReviewType
}

import { TOUR_STEP_IDS } from '@/lib/tour-constants'

export default function WorldBuildingPage() {
  // ...
  // Load project from URL
  useProjectFromUrl()

  // Review queue - items are added to the END, processed from the START (FIFO)
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Get the current item (first in queue)
  const currentReview = reviewQueue[0] || null

  // Add item to the END of the queue
  const addToQueue = useCallback((item: Omit<ReviewQueueItem, 'id'>) => {
    const id = `${item.type}-${item.tileX}-${item.tileY}-${Date.now()}`
    const cacheBust = `?t=${Date.now()}`

    // Add cache-busting to URLs
    const newUrl = item.newUrl ? `${item.newUrl}${cacheBust}` : item.newUrl
    const originalUrl = item.originalUrl ? `${item.originalUrl}${cacheBust}` : item.originalUrl

    console.log('[ReviewQueue] Adding item:', {
      type: item.type,
      tileX: item.tileX,
      tileY: item.tileY,
      newUrl,
      originalUrl,
    })

    setReviewQueue(prev => [...prev, { ...item, id, newUrl, originalUrl }])
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
      const { tileX, tileY, newUrl, originalUrl } = event.detail
      addToQueue({
        tileX,
        tileY,
        newUrl,
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

  return (
    <div className="flex h-full w-full overflow-hidden bg-black text-zinc-200 font-sans selection:bg-indigo-500/30">
      <div id={TOUR_STEP_IDS.WORLD_GEN_NAV}>
        <Sidebar />
      </div>

      {/* Toolbar (Left) */}
      <div className="w-16 border-r border-indigo-500/20 bg-gradient-to-b from-indigo-950/40 via-background/80 to-indigo-950/40 backdrop-blur-xl z-10 relative shadow-[inset_-1px_0_12px_rgba(79,70,229,0.1),2px_0_20px_rgba(79,70,229,0.05)]">
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-indigo-500/30 to-transparent" />
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
          originalUrl={currentReview.originalUrl}
          type={currentReview.type}
          queueLength={reviewQueue.length - 1}
        />
      )}
    </div>
  )
}
