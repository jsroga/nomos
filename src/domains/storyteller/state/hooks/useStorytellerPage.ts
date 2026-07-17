'use client'

import { useStorytellerPageBase } from './useStorytellerPageBase'
import { useStorytellerChat } from './useStorytellerChat'
import { useStorytellerGeneration } from './useStorytellerGeneration'
import { useStorytellerEpisodeData } from './useStorytellerEpisodeData'
import { useStorytellerPhase } from './useStorytellerPhase'
import { useStorytellerAgents } from './useStorytellerAgents'

export function useStorytellerPage() {
  const core = useStorytellerPageBase()
  const chat = useStorytellerChat(core)
  const generation = useStorytellerGeneration(core)
  const episode = useStorytellerEpisodeData(core)
  const phase = useStorytellerPhase(core, chat)
  const agents = useStorytellerAgents(core, chat)

  return { core, chat, generation, episode, phase, agents }
}

export type StorytellerPageSlices = ReturnType<typeof useStorytellerPage>
export type StorytellerPageState = StorytellerPageSlices
