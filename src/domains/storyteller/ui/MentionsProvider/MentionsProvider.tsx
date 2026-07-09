'use client'

import React, { createContext, useContext, useMemo, type ComponentProps } from 'react'
import { ChatInterface, getGameEntityProvider } from '@/domains/chat'
import type { MentionProvider, ProjectContext } from '@/domains/chat'
import {
  buildStorytellerProjectContext,
  getStorytellerMentionProviders,
} from './providers'
import { recordArrayFromJson, recordFromJson, stringArrayFromJson } from '@/shared/data/json-guards'

interface MentionsContextValue {
  mentionProviders: MentionProvider[]
  projectContext: ProjectContext
}

const MentionsContext = createContext<MentionsContextValue | null>(null)

import type { StorytellerCharacter } from '@/domains/storyteller/core/entities/character-wire'

import type { BeatCard } from '@/domains/storyteller/core/types/StoryTypes'

interface MentionsProviderProps {
  projectId: string
  characters?: StorytellerCharacter[]
  beats?: BeatCard[]
  storyPlan?: Record<string, unknown> | null
  children: React.ReactNode
}

export function MentionsProvider({
  projectId,
  characters,
  beats,
  storyPlan,
  children,
}: MentionsProviderProps) {
  const value = useMemo<MentionsContextValue>(() => {
    const plan = recordFromJson(storyPlan)
    return {
      mentionProviders: [...getStorytellerMentionProviders(), getGameEntityProvider()],
      projectContext: buildStorytellerProjectContext({
        projectId,
        characters,
        episodes: [],
        beats,
        seriesBible: {
          ...plan,
          worldRules: recordArrayFromJson(plan.worldRules),
          inspirations: plan.inspirations,
          soundtracks: recordArrayFromJson(plan.soundtracks),
          plotTwists: stringArrayFromJson(plan.plotTwists),
          factions: recordArrayFromJson(plan.factions),
        },
      }),
    }
  }, [projectId, characters, beats, storyPlan])

  return <MentionsContext.Provider value={value}>{children}</MentionsContext.Provider>
}

type MentionsChatInterfaceProps = Omit<
  ComponentProps<typeof ChatInterface>,
  'mentionProviders' | 'projectContext'
>

export function MentionsChatInterface(props: MentionsChatInterfaceProps) {
  const ctx = useContext(MentionsContext)
  if (!ctx) {
    throw new Error('MentionsChatInterface must be used within MentionsProvider')
  }

  return (
    <ChatInterface
      {...props}
      mentionProviders={ctx.mentionProviders}
      projectContext={ctx.projectContext}
    />
  )
}
