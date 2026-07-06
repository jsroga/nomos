import React from 'react'
import { TourStep } from '@/shared/tours/tour-types'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { Sparkles, BookOpen, Layout, Users, Scroll } from 'lucide-react'

export const storytellerTourSteps: TourStep[] = [
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Scroll className="w-5 h-5" />
          <h3 className="font-bold">Project Premise</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Start here! Define the core concept, themes, and style of your project in the Master Prompt. This guides all AI generation.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.STORYTELLER_MASTER_PROMPT,
    position: 'right',
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <BookOpen className="w-5 h-5" />
          <h3 className="font-bold">Build Your World</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Open the Storybible to flesh out details like factions, magic systems, and history.
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
          <Users className="w-5 h-5" />
          <h3 className="font-bold">Add Characters</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Define your cast here. The AI uses their profiles to maintain consistent behavior and dialogue when writing episodes.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.STORYTELLER_CHARACTERS,
    position: 'right',
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Layout className="w-5 h-5" />
          <h3 className="font-bold">Create Episodes</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Manage your episodes here. Create a new episode to start writing scenes and beats with your characters.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.STORYTELLER_EPISODES,
    position: 'right',
  },
  {
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="w-5 h-5" />
          <h3 className="font-bold">Writers Room</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Chat with the AI Showrunner here to brainstorm ideas, draft content, or ask questions about your story anytime.
        </p>
      </div>
    ),
    selectorId: TOUR_STEP_IDS.STORYTELLER_CHAT,
    position: 'left',
  },
]
