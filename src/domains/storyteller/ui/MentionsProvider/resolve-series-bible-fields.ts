import type { ProjectContext } from '@/shared/chat'

type StorytellerSeriesBibleInput = ProjectContext['seriesBible'] & {
  factions?: ProjectContext['factions']
  storyPlan?: {
    factions?: ProjectContext['factions']
    worldRules?: ProjectContext['seriesBible'] extends { worldRules?: infer W } ? W : never
    inspirations?: ProjectContext['seriesBible'] extends { inspirations?: infer I } ? I : never
    soundtracks?: ProjectContext['seriesBible'] extends { soundtracks?: infer S } ? S : never
    plotTwists?: ProjectContext['seriesBible'] extends { plotTwists?: infer P } ? P : never
  }
}

function resolveWorldRules(seriesBible: StorytellerSeriesBibleInput | undefined) {
  return seriesBible?.worldRules ?? seriesBible?.storyPlan?.worldRules ?? []
}

function resolveInspirations(seriesBible: StorytellerSeriesBibleInput | undefined) {
  return seriesBible?.inspirations ?? seriesBible?.storyPlan?.inspirations
}

function resolveSoundtracks(seriesBible: StorytellerSeriesBibleInput | undefined) {
  return seriesBible?.soundtracks ?? seriesBible?.storyPlan?.soundtracks ?? []
}

function resolvePlotTwists(seriesBible: StorytellerSeriesBibleInput | undefined) {
  return seriesBible?.plotTwists ?? seriesBible?.storyPlan?.plotTwists ?? []
}

export function resolveSeriesBibleFields(seriesBible: StorytellerSeriesBibleInput | undefined) {
  return {
    worldRules: resolveWorldRules(seriesBible),
    inspirations: resolveInspirations(seriesBible),
    soundtracks: resolveSoundtracks(seriesBible),
    plotTwists: resolvePlotTwists(seriesBible),
  }
}

export type { StorytellerSeriesBibleInput }
