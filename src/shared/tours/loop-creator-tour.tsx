import React from 'react'
import { TourStep } from '@/shared/tours/tour-types'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { TourStepPosition } from '@/shared/tours/constants/tour-positions'
import { MessageSquare, GitMerge, Layers, Zap } from 'lucide-react'

export const loopCreatorTourSteps: TourStep[] = [
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Layers className="w-5 h-5" />
          <h3 className="font-bold">Create & Manage Loops</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Click here to create a new game loop or switch between existing loops (combat, meta, etc).
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.LOOP_SELECTOR,
    position: TourStepPosition.Bottom,
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <MessageSquare className="w-5 h-5" />
          <h3 className="font-bold">Describe your game</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          "It's like Vampire Survivors but with deck building" — tell the AI and watch it create
          your loop.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.LOOP_CHAT,
    position: TourStepPosition.Top,
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <GitMerge className="w-5 h-5" />
          <h3 className="font-bold">Your loop diagram</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Here's your game's heartbeat — challenge, action, reward, feedback. Drag nodes to
          rearrange.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.LOOP_CANVAS,
    position: TourStepPosition.Bottom,
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Zap className="w-5 h-5" />
          <h3 className="font-bold">Quick Actions</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Use these one-click buttons to instantly generate loop patterns or brainstorm mechanics.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.LOOP_QUICK_ACTIONS,
    position: TourStepPosition.Left,
  },
]
