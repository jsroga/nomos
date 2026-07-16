import { recordArrayFromJson, recordFromJson } from '@/shared/data/json-guards'
import { applyUpdatesToStoryPlan } from '@/domains/storyteller/config/action-config'
import { StoryPlanMergeField } from '@/domains/storyteller/config/constants/bible-wire-fields'
import { ToolResultPayloadField } from '@/domains/storyteller/config/constants/tool-result-wire'
import { CastFieldAlias } from '@/domains/storyteller/core/formatting/constants/story-plan-fields'
import { Phase, parsePhaseId, type PhaseId } from '@/domains/storyteller/core/types/enums'
import type { StoryPlan } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import {
  BIBLE_CATEGORY_KEYS,
  EpisodePlanMergeField,
  HYDRATION_CATEGORY_KEYS,
  HYDRATION_PLAN_FIELDS,
  SCRIPT_WRITING_PHASE_MIN_LENGTH,
} from '@/domains/storyteller/state/constants/merge-episode-plan'
import { projectHasStoredPlan } from '@/domains/storyteller/state/utils/episode-route'

function firstNonEmptyArray(...candidates: unknown[]) {
  for (const candidate of candidates) {
    const arr = recordArrayFromJson(candidate)
    if (arr.length > 0) return arr
  }
  return []
}

function unpackBibleCategories(bible: Record<string, unknown>) {
  const processed = { ...bible }
  for (const cat of BIBLE_CATEGORY_KEYS) {
    const catData = recordFromJson(bible[cat])
    if (Object.keys(catData).length > 0) {
      Object.assign(processed, catData)
    }
  }
  return processed
}

function readPhase(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function readScript(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

export function buildMergedEpisodePlan(
  data: Record<string, unknown>,
  currentProject: { id?: string; series_bible?: unknown; story_plan?: unknown } | null | undefined,
): StoryPlan | null {
  const planContext = {
    series_bible: recordFromJson(currentProject?.series_bible),
    story_plan: recordFromJson(currentProject?.story_plan),
  }
  const { hasSeriesBible: hasProjectBible, hasStoryPlan: hasProjectPlan } =
    projectHasStoredPlan(planContext)

  if (!data[EpisodePlanMergeField.StoryPlan] && !hasProjectBible && !hasProjectPlan) {
    return null
  }

  const bible = unpackBibleCategories(recordFromJson(currentProject?.series_bible))
  const seasonPlan = recordFromJson(currentProject?.story_plan)
  const episodePlan = recordFromJson(data[EpisodePlanMergeField.StoryPlan])
  const seasonRoadmap = recordFromJson(seasonPlan[EpisodePlanMergeField.EpisodeRoadmap])
  const bibleUpdated = recordFromJson(bible[ToolResultPayloadField.UpdatedFields])

  return applyUpdatesToStoryPlan<StoryPlan>(null, {
    ...bible,
    ...seasonPlan,
    ...episodePlan,
    [StoryPlanMergeField.Sequences]: firstNonEmptyArray(
      episodePlan[StoryPlanMergeField.Sequences],
      seasonPlan[StoryPlanMergeField.Sequences],
      seasonRoadmap[EpisodePlanMergeField.Episodes],
      seasonRoadmap[StoryPlanMergeField.Sequences],
    ),
    [StoryPlanMergeField.Factions]: firstNonEmptyArray(
      episodePlan[StoryPlanMergeField.Factions],
      seasonPlan[StoryPlanMergeField.Factions],
      bible[StoryPlanMergeField.Factions],
      bibleUpdated[StoryPlanMergeField.Factions],
    ),
    [StoryPlanMergeField.WorldRules]: firstNonEmptyArray(
      episodePlan[StoryPlanMergeField.WorldRules],
      seasonPlan[StoryPlanMergeField.WorldRules],
      bible[StoryPlanMergeField.WorldRules],
      bibleUpdated[StoryPlanMergeField.WorldRules],
    ),
    [StoryPlanMergeField.PlotTwists]: firstNonEmptyArray(
      episodePlan[StoryPlanMergeField.PlotTwists],
      seasonPlan[StoryPlanMergeField.PlotTwists],
      bible[StoryPlanMergeField.PlotTwists],
      bibleUpdated[StoryPlanMergeField.PlotTwists],
    ),
    [CastFieldAlias.KeyCharacters]: firstNonEmptyArray(
      episodePlan[CastFieldAlias.KeyCharacters],
      seasonPlan[CastFieldAlias.KeyCharacters],
      bible[CastFieldAlias.KeyCharacters],
      bibleUpdated[CastFieldAlias.Characters],
    ),
    [StoryPlanMergeField.Soundtracks]: firstNonEmptyArray(
      episodePlan[StoryPlanMergeField.Soundtracks],
      seasonPlan[StoryPlanMergeField.Soundtracks],
      bible[StoryPlanMergeField.Soundtracks],
    ),
    [StoryPlanMergeField.MoodImages]: recordArrayFromJson(episodePlan[StoryPlanMergeField.MoodImages]).length
      ? recordArrayFromJson(episodePlan[StoryPlanMergeField.MoodImages])
      : recordArrayFromJson(bible[StoryPlanMergeField.MoodImages]),
    [EpisodePlanMergeField.ImagePrompts]: recordFromJson(
      episodePlan[EpisodePlanMergeField.ImagePrompts] ?? bible[EpisodePlanMergeField.ImagePrompts],
    ),
    [StoryPlanMergeField.SeasonStructure]: recordFromJson(
      episodePlan[StoryPlanMergeField.SeasonStructure] ??
        seasonPlan[StoryPlanMergeField.SeasonStructure] ??
        bible[StoryPlanMergeField.SeasonStructure],
    ),
    projectId: currentProject?.id,
  })
}

export function buildFallbackBiblePlan(
  currentProject: { series_bible?: unknown; story_plan?: unknown } | null | undefined,
): StoryPlan | null {
  const rawBible = recordFromJson(currentProject?.series_bible)
  const rawStoryPlan = recordFromJson(currentProject?.story_plan)
  const rawBibleUpdated = recordFromJson(rawBible[ToolResultPayloadField.UpdatedFields])

  if (Object.keys(rawBible).length === 0 && Object.keys(rawStoryPlan).length === 0) {
    return null
  }

  const processedBible: Record<string, unknown> = { ...rawStoryPlan }

  for (const cat of HYDRATION_CATEGORY_KEYS) {
    const catData = recordFromJson(rawBible[cat])
    if (Object.keys(catData).length > 0) {
      Object.assign(processedBible, catData)
    }
  }

  return applyUpdatesToStoryPlan<StoryPlan>(null, {
    ...processedBible,
    [StoryPlanMergeField.WorldRules]: firstNonEmptyArray(
      rawStoryPlan[StoryPlanMergeField.WorldRules],
      rawBible[StoryPlanMergeField.WorldRules],
      rawBibleUpdated[StoryPlanMergeField.WorldRules],
    ),
    [StoryPlanMergeField.PlotTwists]: firstNonEmptyArray(
      rawStoryPlan[StoryPlanMergeField.PlotTwists],
      rawBible[StoryPlanMergeField.PlotTwists],
      rawBibleUpdated[StoryPlanMergeField.PlotTwists],
    ),
    [CastFieldAlias.KeyCharacters]: firstNonEmptyArray(
      rawStoryPlan[CastFieldAlias.KeyCharacters],
      rawBible[CastFieldAlias.KeyCharacters],
      rawBibleUpdated[CastFieldAlias.Characters],
    ),
    [StoryPlanMergeField.Factions]: firstNonEmptyArray(
      rawStoryPlan[StoryPlanMergeField.Factions],
      rawBible[StoryPlanMergeField.Factions],
      rawBibleUpdated[StoryPlanMergeField.Factions],
    ),
    [StoryPlanMergeField.Soundtracks]: firstNonEmptyArray(
      rawStoryPlan[StoryPlanMergeField.Soundtracks],
      rawBible[StoryPlanMergeField.Soundtracks],
    ),
    [StoryPlanMergeField.Sequences]: firstNonEmptyArray(
      rawStoryPlan[StoryPlanMergeField.Sequences],
      rawBible[StoryPlanMergeField.Sequences],
    ),
    [StoryPlanMergeField.SeasonStructure]: recordFromJson(
      rawStoryPlan[StoryPlanMergeField.SeasonStructure] ?? rawBible[StoryPlanMergeField.SeasonStructure],
    ),
  })
}

export function buildManualHydratedPlan(
  currentProject: { series_bible?: unknown; story_plan?: unknown } | null | undefined,
): StoryPlan | null {
  const rawBible = recordFromJson(currentProject?.series_bible)
  const rawStoryPlan = recordFromJson(currentProject?.story_plan)
  const rawBibleUpdated = recordFromJson(rawBible[ToolResultPayloadField.UpdatedFields])

  const initialPlan: Record<string, unknown> = { ...rawStoryPlan }

  for (const cat of HYDRATION_CATEGORY_KEYS) {
    const catData = recordFromJson(rawBible[cat])
    if (Object.keys(catData).length > 0) {
      Object.assign(initialPlan, catData)
    }
  }

  for (const field of HYDRATION_PLAN_FIELDS) {
    const current = initialPlan[field]
    if (
      current === undefined ||
      current === null ||
      (Array.isArray(current) && current.length === 0)
    ) {
      if (rawStoryPlan[field] !== undefined && rawStoryPlan[field] !== null) {
        initialPlan[field] = rawStoryPlan[field]
      } else if (rawBibleUpdated[field] !== undefined) {
        initialPlan[field] = rawBibleUpdated[field]
      } else if (rawBible[field] !== undefined) {
        initialPlan[field] = rawBible[field]
      }
    }
  }

  if (
    recordArrayFromJson(rawBibleUpdated[CastFieldAlias.Characters]).length > 0 &&
    recordArrayFromJson(initialPlan[CastFieldAlias.KeyCharacters]).length === 0
  ) {
    initialPlan[CastFieldAlias.KeyCharacters] = rawBibleUpdated[CastFieldAlias.Characters]
  }

  return Object.keys(initialPlan).length > 0
    ? applyUpdatesToStoryPlan<StoryPlan>(null, initialPlan)
    : null
}

export function inferEpisodePhase(data: Record<string, unknown>): PhaseId {
  let phase = parsePhaseId(readPhase(data[EpisodePlanMergeField.CurrentPhase]))
  const script = readScript(data[EpisodePlanMergeField.Script])
  if (
    script &&
    script.length > SCRIPT_WRITING_PHASE_MIN_LENGTH &&
    (phase === Phase.PREMISE || phase === Phase.BREAKING)
  ) {
    phase = Phase.WRITING
  }
  return phase
}

export function shouldPreserveHydratedPlan(prev: StoryPlan | null): boolean {
  return !!(
    prev &&
    (prev.worldRules?.length || prev.plotTwists?.length || prev.factions?.length)
  )
}
