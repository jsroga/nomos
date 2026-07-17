import type { ProjectContext } from '@/shared/chat'
import {
  resolveSeriesBibleFields,
  type StorytellerSeriesBibleInput,
} from './resolve-series-bible-fields'

function resolveFactions(seriesBible: StorytellerSeriesBibleInput | undefined) {
  const storyPlan = seriesBible?.storyPlan
  return seriesBible?.factions ?? storyPlan?.factions ?? []
}

export function buildStorytellerProjectContext(data: {
  projectId: string
  characters?: ProjectContext['characters']
  episodes?: ProjectContext['episodes']
  beats?: ProjectContext['beats']
  seriesBible?: StorytellerSeriesBibleInput
}): ProjectContext {
  return {
    projectId: data.projectId,
    characters: data.characters,
    episodes: data.episodes,
    beats: data.beats,
    factions: resolveFactions(data.seriesBible),
    seriesBible: resolveSeriesBibleFields(data.seriesBible),
  }
}
