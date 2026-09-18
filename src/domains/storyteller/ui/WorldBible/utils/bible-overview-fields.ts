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
  storyPlan: Partial<StoryPlan>,
  localPlan: Partial<StoryPlan>,
  isEditing = false,
): OverviewDisplayFields {
  const pick = (local: string | null | undefined, parent: string | null | undefined) => {
    const chosen = isEditing ? local || parent : parent || local
    return chosen || undefined
  }
  return {
    title: pick(localPlan.title, storyPlan.title),
    genre: pick(localPlan.genre, storyPlan.genre),
    tone: pick(localPlan.tone, storyPlan.tone),
    centralQuestion: pick(localPlan.centralQuestion, storyPlan.centralQuestion),
    executiveSummary: pick(localPlan.executiveSummary, storyPlan.executiveSummary),
    worldDescription: pick(localPlan.worldDescription, storyPlan.worldDescription),
  }
}

export function isOverviewReadyForMoodboard(fields: OverviewDisplayFields): boolean {
  return Boolean(fields.worldDescription?.trim())
}
