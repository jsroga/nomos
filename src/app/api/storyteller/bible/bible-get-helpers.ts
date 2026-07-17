import { recordFromJson } from '@/shared/data/deep-merge'
import { BibleCategoryKey, StoryPlanFieldKey } from '@/shared/data/constants/protocol'

function pickPresent<K extends string>(
  source: Record<string, unknown>,
  keys: readonly K[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of keys) {
    const value = source[key]
    if (value) out[key] = value
  }
  return out
}

const STORY_PLAN_OVERRIDE_KEYS = [
  StoryPlanFieldKey.Genre,
  StoryPlanFieldKey.Tone,
  StoryPlanFieldKey.CentralTheme,
  StoryPlanFieldKey.WorldDescription,
  StoryPlanFieldKey.WorldRules,
  StoryPlanFieldKey.Factions,
  StoryPlanFieldKey.Inspirations,
  StoryPlanFieldKey.KeyCharacters,
  StoryPlanFieldKey.Sequences,
  StoryPlanFieldKey.ExecutiveSummary,
  StoryPlanFieldKey.Soundtracks,
  StoryPlanFieldKey.PlotTwists,
  StoryPlanFieldKey.StyleReference,
] as const

const KNOWN_BIBLE_CATEGORIES: readonly BibleCategoryKey[] = [
  BibleCategoryKey.General,
  BibleCategoryKey.Setting,
  BibleCategoryKey.History,
  BibleCategoryKey.Magic,
  BibleCategoryKey.Factions,
  BibleCategoryKey.Technology,
  BibleCategoryKey.Culture,
]

function isBibleCategoryKey(value: string): value is BibleCategoryKey {
  return KNOWN_BIBLE_CATEGORIES.some(category => category === value)
}

export function flattenSeriesBible(seriesBible: Record<string, unknown>): Record<string, unknown> {
  const flattenedBible: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(seriesBible)) {
    if (isBibleCategoryKey(key) && typeof value === 'object' && value !== null) {
      Object.assign(flattenedBible, value)
    } else {
      flattenedBible[key] = value
    }
  }

  return flattenedBible
}

export function buildBibleResponse(input: {
  seriesBible: Record<string, unknown>
  storyPlan: Record<string, unknown>
  masterPrompt: string | null
}) {
  const flattenedBible = flattenSeriesBible(input.seriesBible)
  const storyPlanOverrides = pickPresent(input.storyPlan, STORY_PLAN_OVERRIDE_KEYS)

  return {
    bible: {
      ...flattenedBible,
      ...(input.masterPrompt ? { masterPrompt: input.masterPrompt } : {}),
      ...storyPlanOverrides,
      storyPlan: input.storyPlan,
      userDecisions: input.seriesBible.userDecisions || input.storyPlan.userDecisions || {},
    },
    seriesBible: input.seriesBible,
    storyPlan: input.storyPlan,
    storyPlanOverrides,
    flattenedBible,
  }
}

export function parseBibleSources(projectData: {
  seriesBible: unknown
  masterPrompt: string | null
}, storyPlanData?: { content: unknown }) {
  return {
    seriesBible: recordFromJson(projectData.seriesBible),
    storyPlan: recordFromJson(storyPlanData?.content),
    masterPrompt: projectData.masterPrompt,
  }
}
