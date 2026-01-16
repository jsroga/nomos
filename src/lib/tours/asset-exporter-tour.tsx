import React from 'react'
import { TourStep } from '@/components/tour'
import { TOUR_STEP_IDS } from '@/lib/tour-constants'
import { ClipboardList, Scissors, Cuboid } from 'lucide-react'

export const assetExporterTourSteps: TourStep[] = [
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <ClipboardList className="w-5 h-5" />
          <h3 className="font-bold">📋 Your assets</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Tiles you've exported from World Gen show up here. Pick one to turn into 3D.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.EXPORTER_SIDEBAR,
    position: 'right',
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Scissors className="w-5 h-5" />
          <h3 className="font-bold">✂️ Clean it up</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Crop, mask, or adjust the 2D image before sending it to the 3D generator.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.EXPORTER_EDITOR,
    position: 'bottom',
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Cuboid className="w-5 h-5" />
          <h3 className="font-bold">🎲 Generate 3D</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Hit generate and watch your sprite become a 3D model. Preview it here, then download for
          your engine.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.EXPORTER_3D,
    position: 'left',
  },
]
