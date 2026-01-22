import React from 'react'
import { TourStep } from '@/components/tour'
import { TOUR_STEP_IDS } from '@/lib/tour-constants'
import { Map, MousePointer2, Palette, Upload, Sparkles } from 'lucide-react'

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
          <h3 className="font-bold">🖱️ Select Mode</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Click the select tool (or press <kbd className="px-1 bg-muted rounded">S</kbd>) to enter
          Select Mode.
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
          <Sparkles className="w-5 h-5" />
          <h3 className="font-bold">✨ Pick a tile</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Click on any grid square to select it. This opens the generation and upscaling tools.
        </p>
        <div className="mt-2 p-2 bg-primary/10 rounded border border-primary/20 text-[10px] text-primary uppercase tracking-widest font-bold animate-pulse">
          Select a tile to advance
        </div>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.WORLDGEN_CANVAS,
    position: 'right',
    hideNext: true,
    advanceEvent: 'tile-selected',
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Palette className="w-5 h-5" />
          <h3 className="font-bold">🎨 Repaint areas</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Want to change part of a tile? Use the Repaint tool to describe what should replace it.
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
