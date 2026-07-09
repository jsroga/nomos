import { readString, recordFromJson } from '@/shared/data/json-guards'

/** Parse episode or project story plan JSON without casts. */
export function storyPlanRecordFromJson(value: unknown): Record<string, unknown> {
  return recordFromJson(value)
}

export function storyPlanPosterUrl(plan: Record<string, unknown>): string | undefined {
  return (
    readString(plan.posterUrl) ??
    readString(plan.poster_url)
  )
}

export function storyPlanPosterPrompt(plan: Record<string, unknown>): string | undefined {
  return (
    readString(plan.posterPrompt) ??
    readString(plan.poster_prompt)
  )
}

export function storyPlanStoryboardUrl(plan: Record<string, unknown>): string | undefined {
  return (
    readString(plan.storyboardUrl) ??
    readString(plan.storyboard_url)
  )
}

export interface EpisodeStoryPlanResponse {
  storyPlan: Record<string, unknown>
  planApproved: boolean | null
  currentPhase: string
  script: string
}

/** Build GET /plan episode response from drizzle row fields. */
export function episodeStoryPlanResponse(input: {
  storyPlan: unknown
  planApproved: boolean | null
  currentPhase: string | null
  scriptContent: string | null
  title: string | null
  posterUrl: string | null
  posterPrompt: string | null
  projectId: string | null
}): EpisodeStoryPlanResponse {
  const plan = storyPlanRecordFromJson(input.storyPlan)

  return {
    storyPlan: {
      ...plan,
      title: input.title ?? readString(plan.title),
      posterUrl: input.posterUrl ?? storyPlanPosterUrl(plan),
      posterPrompt: input.posterPrompt ?? storyPlanPosterPrompt(plan),
      storyboardUrl: storyPlanStoryboardUrl(plan),
      projectId: input.projectId ?? readString(plan.projectId),
    },
    planApproved: input.planApproved,
    currentPhase: input.currentPhase ?? 'premise',
    script: input.scriptContent ?? '',
  }
}
