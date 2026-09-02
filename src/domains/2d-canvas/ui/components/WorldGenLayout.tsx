'use client'

import { useProjectFromUrl } from '@/components/shell/useProjectFromUrl'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { useTileReviewQueue } from '../../state/hooks/useTileReviewQueue'
import { useWorldGenSidebar } from '../../state/hooks/useWorldGenSidebar'
import { RepaintToolbar } from './RepaintToolbar'
import { SelectModeToolbar } from './SelectModeToolbar'
import { Sidebar } from './Sidebar/Sidebar'
import { WorldCanvas } from './Canvas/WorldCanvas'
import { TileReviewDialog } from './TileReviewDialog'
import { WorldGenToolbar } from './WorldGenToolbar'
import { WorldGenToolbarClass } from '../constants/world-gen-toolbar'

function WorldGenWorkspace() {
  const { currentReview, isDialogOpen, handleClose, queueLength } = useTileReviewQueue()
  const sidebar = useWorldGenSidebar()
  const { fileInputRef, ...tileBar } = sidebar

  return (
    <>
      <div className="flex h-full w-full overflow-hidden bg-black text-zinc-200 font-sans selection:bg-indigo-500/30">
        <div id={TOUR_STEP_IDS.WORLD_GEN_NAV}>
          <Sidebar sidebar={sidebar} />
        </div>

        <div className="flex-1 relative">
          <div id={TOUR_STEP_IDS.WORLDGEN_CANVAS} className="w-full h-full">
            <WorldCanvas tileBar={tileBar} fileInputRef={fileInputRef} />
          </div>
          <div className={WorldGenToolbarClass.Anchor}>
            <WorldGenToolbar />
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
          runId={currentReview.runId}
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
