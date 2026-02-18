import React from 'react'
import { TourStep } from '@/components/tour'
import { TOUR_STEP_IDS } from '@/lib/tour-constants'
import { ClipboardList, Scissors, Cuboid, Palette, Sparkles, Upload } from 'lucide-react'

export const assetExporterTourSteps: TourStep[] = [
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Upload className="w-5 h-5" />
          <h3 className="font-bold">📤 Upload Assets</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Start here! Upload your 2D images or 3D models to add them to your project assets.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.ASSET_UPLOAD_ZONE,
    position: 'bottom',
  },
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
    selectorId: TOUR_STEP_IDS.EXPORTED_ASSETS_LIST,
    position: 'right',
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Palette className="w-5 h-5" />
          <h3 className="font-bold">🎨 Define Style</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Set a Master Prompt to define the global art style. The 3D generator will try to match
          this aesthetic.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.EXPORTED_ASSETS_LIST, // Selection area for sidebar generally
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
    selectorId: TOUR_STEP_IDS.ASSET_EDITOR_PANEL,
    position: 'bottom',
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="w-5 h-5" />
          <h3 className="font-bold">🪄 Generate 3D</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Ready? Click the Generate button to start the AI conversion process.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.GENERATE_3D_BUTTON,
    position: 'top',
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Cuboid className="w-5 h-5" />
          <h3 className="font-bold">🎲 3D Preview</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Once finished, your 3D model appears here. You can orbit it to inspect the details.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.ASSET_3D_PREVIEW,
    position: 'left',
  },
]
