import React from 'react'
import { TourStep } from '@/components/tour'
import { TOUR_STEP_IDS } from '@/lib/tour-constants'
import { MousePointer2, Hammer, Mountain, Package, Rocket } from 'lucide-react'

export const interiorDesignerTourSteps: TourStep[] = [
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <MousePointer2 className="w-5 h-5" />
          <h3 className="font-bold">🖱️ This is your canvas</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Click and drag to orbit, scroll to zoom. Right-click drag to pan.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.INTERIOR_CANVAS,
    position: 'right',
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Hammer className="w-5 h-5" />
          <h3 className="font-bold">🛠️ Pick a tool</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Walls, floors, terrain, objects — start with "Ground" or "Walls" to lay your foundation.
        </p>
        <div className="mt-2 p-2 bg-primary/10 rounded border border-primary/20 text-[10px] text-primary uppercase tracking-widest font-bold animate-pulse">
          Click any tool to advance
        </div>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.INTERIOR_TOOLBAR,
    position: 'right',
    hideNext: true,
    advanceEvent: 'interior-designer-mode-changed',
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Mountain className="w-5 h-5" />
          <h3 className="font-bold">🏔️ Sculpt the terrain</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Raise cliffs, dig valleys, or paint grass/rock with these brushes. It's like Minecraft!
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.INTERIOR_TERRAIN,
    position: 'right',
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Package className="w-5 h-5" />
          <h3 className="font-bold">📦 Drop in assets</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Drag 3D models from here onto your scene. You can also AI-generate new assets.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.INTERIOR_ASSETS,
    position: 'left',
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Rocket className="w-5 h-5" />
          <h3 className="font-bold">🚀 Take it to your engine</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          When you're happy, export as GLTF or a Unity-ready package. Your work isn't trapped here!
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.INTERIOR_EXPORT,
    position: 'bottom',
  },
]
