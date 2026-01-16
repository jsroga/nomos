import React from 'react'
import { TourStep } from '@/components/tour'
import { TOUR_STEP_IDS } from '@/lib/tour-constants'
import { Sparkles, BookOpen, PenTool, Layout, Users } from 'lucide-react'

export const storytellerTourSteps: TourStep[] = [
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="w-5 h-5" />
          <h3 className="font-bold">📝 Start Here!</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          First, give me a rough idea of your story. Type a premise like{' '}
          <span className="text-foreground italic">"vampire falls in love in Tokyo"</span> and hit
          enter.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.STORYTELLER_CHAT,
    position: 'top',
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <BookOpen className="w-5 h-5" />
          <h3 className="font-bold">✨ Need Inspiration?</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Stuck? Click this to get random story prompts based on trending genres.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.SUGGEST_IDEA_BUTTON,
    position: 'bottom',
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <PenTool className="w-5 h-5" />
          <h3 className="font-bold">📖 Build Your World</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Once you have a concept, flesh out your world here — factions, rules, tone. The AI uses
          this to stay consistent.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.STORYTELLER_BIBLE,
    position: 'right',
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Layout className="w-5 h-5" />
          <h3 className="font-bold">🎬 Create Episodes</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your story lives in episodes. Create your first one here to start breaking it into beats.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.STORYTELLER_EPISODES,
    position: 'bottom',
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="w-5 h-5" />
          <h3 className="font-bold">🪄 Magic Start</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Short on time? Use this button to let me draft your first episode's premise automatically
          based on your project goals.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.STORYTELLER_AI_DRAFT,
    position: 'top',
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Users className="w-5 h-5" />
          <h3 className="font-bold">👥 Add Characters</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Give your characters goals, flaws, and arcs. The AI will keep them acting consistently.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.STORYTELLER_CHARACTERS,
    position: 'left',
  },
]
