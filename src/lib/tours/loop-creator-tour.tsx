import React from 'react'
import { TourStep } from '@/components/tour'
import { TOUR_STEP_IDS } from '@/lib/tour-constants'
import { MessageSquare, GitMerge, Layers, CheckCircle2 } from 'lucide-react'

export const loopCreatorTourSteps: TourStep[] = [
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <MessageSquare className="w-5 h-5" />
          <h3 className="font-bold">💬 Describe your game</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          "It's like Vampire Survivors but with deck building" — tell the AI and watch it create
          your loop.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.LOOP_CHAT,
    position: 'top',
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <GitMerge className="w-5 h-5" />
          <h3 className="font-bold">🔀 Your loop diagram</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Here's your game's heartbeat — challenge, action, reward, feedback. Drag nodes to
          rearrange.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.LOOP_CANVAS,
    position: 'bottom',
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Layers className="w-5 h-5" />
          <h3 className="font-bold">🎮 Switch loops</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Most games have multiple loops (combat, progression, meta). Create and switch between them
          here.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.LOOP_SELECTOR,
    position: 'bottom',
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <CheckCircle2 className="w-5 h-5" />
          <h3 className="font-bold">✅ Review changes</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Before anything changes your diagram, you'll see it here first. Accept or reject AI
          suggestions.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.LOOP_SUGGESTIONS,
    position: 'left',
  },
]
