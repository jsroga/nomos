import type { StoryPlan } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'

export interface OverviewDisplayFields {
  title?: string
  genre?: string
  tone?: string
  centralQuestion?: string
  executiveSummary?: string
  worldDescription?: string
}

export function resolveOverviewDisplayFields(
  storyPlan: StoryPlan,
  localPlan: Partial<StoryPlan>
): OverviewDisplayFields {
  return {
    title: localPlan.title || storyPlan.title,
    genre: localPlan.genre || storyPlan.genre,
    tone: localPlan.tone || storyPlan.tone,
    centralQuestion: localPlan.centralQuestion || storyPlan.centralQuestion,
    executiveSummary: localPlan.executiveSummary || storyPlan.executiveSummary || undefined,
    worldDescription: localPlan.worldDescription || storyPlan.worldDescription || undefined,
  }
}
