'use client'

import React, { createContext, useContext, useMemo, type ComponentProps } from 'react'
import { ChatInterface, getGameEntityProvider } from '@/domains/chat'
import type { MentionProvider, ProjectContext } from '@/domains/chat'
import {
  buildStorytellerProjectContext,
  getStorytellerMentionProviders,
} from './providers'

interface MentionsContextValue {
  mentionProviders: MentionProvider[]
  projectContext: ProjectContext
}

const MentionsContext = createContext<MentionsContextValue | null>(null)

interface MentionsProviderProps {
  projectId: string
  characters?: Array<{ id: string; name: string; [key: string]: unknown }>
  beats?: Array<{ id: string; [key: string]: unknown }>
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
  const value = useMemo<MentionsContextValue>(
    () => ({
      mentionProviders: [...getStorytellerMentionProviders(), getGameEntityProvider()],
      projectContext: buildStorytellerProjectContext({
        projectId,
        characters,
        episodes: [],
        beats,
        seriesBible: {
          ...storyPlan,
          worldRules: (storyPlan?.worldRules as unknown[]) || [],
          inspirations: storyPlan?.inspirations,
          soundtracks: (storyPlan?.soundtracks as unknown[]) || [],
          plotTwists: (storyPlan?.plotTwists as string[]) || [],
          factions: (storyPlan?.factions as unknown[]) || [],
        },
      }),
    }),
    [projectId, characters, beats, storyPlan]
  )

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
