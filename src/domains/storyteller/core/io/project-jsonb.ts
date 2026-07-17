import { StoryPlanSchema } from '@/domains/storyteller/ai/prompts/schemas/story-plan-schemas'
import type { StoryPlan } from '@/domains/storyteller/ai/prompts/schemas/agent-response-schemas'
import type { SeriesBible } from '@/domains/storyteller/services/context/series-bible'
import { seriesBibleFromRecord } from '@/domains/storyteller/services/context/series-bible-from-record'
import { recordFromJson } from '@/shared/data/json-guards'

export enum ProjectJsonbLog {
  StoryPlanParseFailed = '[storyteller] parseStoryPlanJson: schema validation failed',
}

let hasLoggedStoryPlanParseFailure = false

export function parseStoryPlanJson(value: unknown): StoryPlan | null {
  if (value === null || value === undefined) return null

  const result = StoryPlanSchema.safeParse(value)
  if (!result.success) {
    if (!hasLoggedStoryPlanParseFailure) {
      console.warn(ProjectJsonbLog.StoryPlanParseFailed, result.error.flatten())
      hasLoggedStoryPlanParseFailure = true
    }
    return null
  }

  return result.data
}

/** Normalized story-plan record — typed when valid, otherwise safe json record. */
export function parseStoryPlanRecord(value: unknown): Record<string, unknown> {
  const parsed = parseStoryPlanJson(value)
  if (parsed) return parsed
  return recordFromJson(value)
}

export function seriesBibleToRecord(bible: SeriesBible): Record<string, unknown> {
  return {
    title: bible.title,
    logline: bible.logline,
    premise: bible.premise,
    genre: bible.genre,
    tone: bible.tone,
    centralTheme: bible.centralTheme,
    thematicQuestion: bible.thematicQuestion,
    worldDescription: bible.worldDescription,
    moodSoundtrack: bible.moodSoundtrack,
    moodImages: bible.moodImages,
    setting: bible.setting,
    worldRules: bible.worldRules,
    ...(bible.factions ? { factions: bible.factions } : {}),
    ...(bible.updatedFields ? { updatedFields: bible.updatedFields } : {}),
  }
}

export function parseSeriesBibleRecord(value: unknown): Record<string, unknown> {
  const raw = recordFromJson(value)
  if (Object.keys(raw).length === 0) return raw

  const normalized = seriesBibleToRecord(seriesBibleFromRecord(raw))
  return { ...raw, ...normalized }
}
