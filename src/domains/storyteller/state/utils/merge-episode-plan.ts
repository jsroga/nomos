import { recordArrayFromJson, recordFromJson } from '@/shared/data/json-guards'
import { applyUpdatesToStoryPlan } from '@/domains/storyteller/config/action-config'
import { Phase, parsePhaseId, type PhaseId } from '@/domains/storyteller/core/types/Enums'
import type { StoryPlan } from '@/domains/storyteller/prompts/schemas/agent-schemas'
import { projectHasStoredPlan } from '@/domains/storyteller/state/utils/episode-route'

const BIBLE_CATEGORY_KEYS = [
  'General',
  'Setting',
  'History',
  'Magic',
  'Factions',
  'Technology',
  'Culture',
] as const

const HYDRATION_CATEGORY_KEYS = [...BIBLE_CATEGORY_KEYS, 'updatedFields'] as const

const HYDRATION_PLAN_FIELDS = [
  'soundtracks',
  'worldRules',
  'factions',
  'keyCharacters',
  'plotTwists',
  'inspirations',
  'worldDescription',
  'genre',
  'tone',
  'sequences',
  'seasonStructure',
  'centralTheme',
  'masterPrompt',
  'moodImages',
] as const

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

  if (!data.storyPlan && !hasProjectBible && !hasProjectPlan) {
    return null
  }

  const bible = unpackBibleCategories(recordFromJson(currentProject?.series_bible))
  const seasonPlan = recordFromJson(currentProject?.story_plan)
  const episodePlan = recordFromJson(data.storyPlan)
  const seasonRoadmap = recordFromJson(seasonPlan.episodeRoadmap)
  const bibleUpdated = recordFromJson(bible.updatedFields)

  return applyUpdatesToStoryPlan<StoryPlan>(null, {
    ...bible,
    ...seasonPlan,
    ...episodePlan,
    sequences: firstNonEmptyArray(
      episodePlan.sequences,
      seasonPlan.sequences,
      seasonRoadmap.episodes,
      seasonRoadmap.sequences,
    ),
    factions: firstNonEmptyArray(
      episodePlan.factions,
      seasonPlan.factions,
      bible.factions,
      bibleUpdated.factions,
    ),
    worldRules: firstNonEmptyArray(
      episodePlan.worldRules,
      seasonPlan.worldRules,
      bible.worldRules,
      bibleUpdated.worldRules,
    ),
    plotTwists: firstNonEmptyArray(
      episodePlan.plotTwists,
      seasonPlan.plotTwists,
      bible.plotTwists,
      bibleUpdated.plotTwists,
    ),
    keyCharacters: firstNonEmptyArray(
      episodePlan.keyCharacters,
      seasonPlan.keyCharacters,
      bible.keyCharacters,
      bibleUpdated.characters,
    ),
    soundtracks: firstNonEmptyArray(episodePlan.soundtracks, seasonPlan.soundtracks, bible.soundtracks),
    moodImages: recordArrayFromJson(episodePlan.moodImages).length
      ? recordArrayFromJson(episodePlan.moodImages)
      : recordArrayFromJson(bible.moodImages),
    imagePrompts: recordFromJson(episodePlan.imagePrompts ?? bible.imagePrompts),
    seasonStructure: recordFromJson(
      episodePlan.seasonStructure ?? seasonPlan.seasonStructure ?? bible.seasonStructure,
    ),
    projectId: currentProject?.id,
  })
}

export function buildFallbackBiblePlan(
  currentProject: { series_bible?: unknown; story_plan?: unknown } | null | undefined,
): StoryPlan | null {
  const rawBible = recordFromJson(currentProject?.series_bible)
  const rawStoryPlan = recordFromJson(currentProject?.story_plan)
  const rawBibleUpdated = recordFromJson(rawBible.updatedFields)

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
    worldRules: firstNonEmptyArray(
      rawStoryPlan.worldRules,
      rawBible.worldRules,
      rawBibleUpdated.worldRules,
    ),
    plotTwists: firstNonEmptyArray(
      rawStoryPlan.plotTwists,
      rawBible.plotTwists,
      rawBibleUpdated.plotTwists,
    ),
    keyCharacters: firstNonEmptyArray(
      rawStoryPlan.keyCharacters,
      rawBible.keyCharacters,
      rawBibleUpdated.characters,
    ),
    factions: firstNonEmptyArray(rawStoryPlan.factions, rawBible.factions, rawBibleUpdated.factions),
    soundtracks: firstNonEmptyArray(rawStoryPlan.soundtracks, rawBible.soundtracks),
    sequences: firstNonEmptyArray(rawStoryPlan.sequences, rawBible.sequences),
    seasonStructure: recordFromJson(rawStoryPlan.seasonStructure ?? rawBible.seasonStructure),
  })
}

export function buildManualHydratedPlan(
  currentProject: { series_bible?: unknown; story_plan?: unknown } | null | undefined,
): StoryPlan | null {
  const rawBible = recordFromJson(currentProject?.series_bible)
  const rawStoryPlan = recordFromJson(currentProject?.story_plan)
  const rawBibleUpdated = recordFromJson(rawBible.updatedFields)

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
    recordArrayFromJson(rawBibleUpdated.characters).length > 0 &&
    recordArrayFromJson(initialPlan.keyCharacters).length === 0
  ) {
    initialPlan.keyCharacters = rawBibleUpdated.characters
  }

  return Object.keys(initialPlan).length > 0
    ? applyUpdatesToStoryPlan<StoryPlan>(null, initialPlan)
    : null
}

export function inferEpisodePhase(data: Record<string, unknown>): PhaseId {
  let phase = parsePhaseId(readPhase(data.currentPhase))
  const script = readScript(data.script)
  if (script && script.length > 100 && (phase === Phase.PREMISE || phase === Phase.BREAKING)) {
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
