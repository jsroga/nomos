'use client'

import { useStorytellerPageBase } from './useStorytellerPageBase'
import { useStorytellerGeneration } from './useStorytellerGeneration'
import { useStorytellerEpisodeData } from './useStorytellerEpisodeData'
import { useStorytellerPhase } from './useStorytellerPhase'
import { useStorytellerAgents } from './useStorytellerAgents'

export function useStorytellerPage() {
  const core = useStorytellerPageBase()
  const generation = useStorytellerGeneration(core)
  const episode = useStorytellerEpisodeData(core)
  const phase = useStorytellerPhase(core)
  const agents = useStorytellerAgents(core)

  return { core, generation, episode, phase, agents }
}

export type StorytellerPageSlices = ReturnType<typeof useStorytellerPage>
export type StorytellerPageState = StorytellerPageSlices
