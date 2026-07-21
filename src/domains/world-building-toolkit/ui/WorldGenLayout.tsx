'use client'

import { useProjectFromUrl } from '@/components/shell/useProjectFromUrl'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { useTileReviewQueue } from '../state/hooks/useTileReviewQueue'
import { RepaintToolbar } from './components/RepaintToolbar'
import { SelectModeToolbar } from './components/SelectModeToolbar'
import { Sidebar } from './components/Sidebar/Sidebar'
import { WorldCanvas } from './components/Canvas/WorldCanvas'
import { TileReviewDialog } from './components/TileReviewDialog'
import { WorldGenToolbar } from './components/WorldGenToolbar'

function WorldGenWorkspace() {
  const { currentReview, isDialogOpen, handleClose, queueLength } = useTileReviewQueue()

  return (
    <>
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
          queueLength={queueLength}
        />
      )}
    </>
  )
}

export function WorldGenLayout() {
  const { projectId } = useProjectFromUrl()

  return <WorldGenWorkspace key={projectId ?? 'none'} />
}
