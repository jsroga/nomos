import React from 'react'
import { TourStep } from '@/shared/tours/tour-types'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { ClipboardList, Scissors, Cuboid, Palette, Sparkles, Upload } from 'lucide-react'

export const assetExporterTourSteps: TourStep[] = [
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Palette className="w-5 h-5" />
          <h3 className="font-bold">Define Style</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Set a Master Prompt to define the global art style. The 3D generator will try to match this aesthetic for all generated assets.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.ASSET_MASTER_PROMPT,
    position: 'right',
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Upload className="w-5 h-5" />
          <h3 className="font-bold">Upload Assets</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Upload your 2D images here. Tiles exported from World Gen will also appear in the assets list below.
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
          <h3 className="font-bold">Your Assets</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          All your uploaded and exported assets appear here. <strong className="text-primary">Click on one to select it</strong> - this will open the editor and 3D preview panels.
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
          <Scissors className="w-5 h-5" />
          <h3 className="font-bold">Clean it up</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Once you select an asset, you can crop, mask, or adjust the 2D image here before sending it to the 3D generator.
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
          <h3 className="font-bold">Generate 3D</h3>
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
          <h3 className="font-bold">3D Preview</h3>
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
