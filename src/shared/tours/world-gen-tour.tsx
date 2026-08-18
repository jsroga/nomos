import { TourStep } from '@/shared/tours/tour-types'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { TourStepPosition } from '@/shared/tours/constants/tour-positions'
import { Map, MousePointer2, Palette, Sparkles } from 'lucide-react'

export const worldGenTourSteps: TourStep[] = [
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Palette className="w-5 h-5" />
          <h3 className="font-bold">Master prompt</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          First, define the overall world context and artistic style. This stays on every generated tile.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.WORLDGEN_STYLE_PROMPT,
    position: TourStepPosition.Right,
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Map className="w-5 h-5" />
          <h3 className="font-bold">Your Canvas</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The grid starts centered at the (0,0) tile. Click on any square to select it and start building.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.WORLDGEN_CANVAS,
    position: TourStepPosition.Center,
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <MousePointer2 className="w-5 h-5" />
          <h3 className="font-bold">Generation Prompt</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Describe the specific details for the selected tile here. e.g. "A dense forest with a river".
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.WORLDGEN_PROMPT,
    position: TourStepPosition.Right,
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="w-5 h-5" />
          <h3 className="font-bold">Generate</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Click the Generate button to create your tile based on the style and generation prompts.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.WORLDGEN_GENERATE,
    position: TourStepPosition.Right,
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <MousePointer2 className="w-5 h-5" />
          <h3 className="font-bold">Toolbar</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Use the toolbar to switch tools: Pan (V) to move around, Select (S) to choose objects, and Paint (B) to modify existing tiles. Escape returns to Pan. Hold Space to pan temporarily.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.WORLDGEN_TOOLBAR,
    position: TourStepPosition.Right,
  },
]
