import React from 'react'
import { TourStep } from '@/components/tour'
import { TOUR_STEP_IDS } from '@/lib/tour-constants'
import { Map, MousePointer2, Palette, Upload } from 'lucide-react'

export const worldGenTourSteps: TourStep[] = [
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Map className="w-5 h-5" />
          <h3 className="font-bold">🗺️ Your world map</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This infinite grid holds your world. Each square is a seamless tile. Scroll to zoom, drag
          to pan.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.WORLDGEN_CANVAS,
    position: 'right',
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <MousePointer2 className="w-5 h-5" />
          <h3 className="font-bold">🖱️ Select a tile</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Click the select tool, then click on a tile to select it. From there you can regenerate or
          upscale.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.GENERATION_TRIGGER,
    position: 'right',
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Palette className="w-5 h-5" />
          <h3 className="font-bold">🎨 Repaint areas</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Want to change part of a tile? Select an area and describe what should replace it using AI
          inpainting.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.WORLDGEN_REPAINT,
    position: 'right',
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Upload className="w-5 h-5" />
          <h3 className="font-bold">📤 Upload your own</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Already have art? Upload images directly to mix hand-drawn with AI-generated tiles.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.WORLDGEN_UPLOAD,
    position: 'right',
  },
]
