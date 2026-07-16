import {
  firstNonEmptyRecord,
  readString,
  recordFromJson,
} from '@/shared/data/json-guards'
import {
  mergeNamedRecords,
  mergeWorldRules,
  seriesBibleFromRecord,
} from '@/domains/storyteller/services/context/series-bible-from-record'
import type { SeriesBible } from '@/domains/storyteller/services/context/series-bible'
import { API_LOG_PREFIX } from '@/shared/data/constants/api-errors'

export interface WorldSummaryProjectSource {
  id: string
  seriesBible: unknown
  storyPlan: unknown
  seriesBibleTable?: { content: unknown } | null
  storyPlanTable?: { content: unknown } | null
}

function applyStoryPlanSetting(bible: SeriesBible, rawStoryPlan: Record<string, unknown>): void {
  const storyPlanSetting = recordFromJson(rawStoryPlan.setting)
  const hasBibleSetting =
    bible.setting.time || bible.setting.place || bible.setting.socialContext
  if (hasBibleSetting || Object.keys(storyPlanSetting).length === 0) return

  bible.setting = {
    time: readString(storyPlanSetting.time) ?? '',
    place: readString(storyPlanSetting.place) ?? '',
    socialContext: readString(storyPlanSetting.socialContext) ?? '',
  }
}

function applyStoryPlanWorldDescription(
  bible: SeriesBible,
  rawStoryPlan: Record<string, unknown>,
): void {
  const storyPlanWorldDescription = readString(rawStoryPlan.worldDescription)
  if (!bible.worldDescription && storyPlanWorldDescription) {
    bible.worldDescription = storyPlanWorldDescription
  }
}

export function buildMergedBibleFromProject(project: WorldSummaryProjectSource): SeriesBible {
  const rawBible = firstNonEmptyRecord(project.seriesBibleTable?.content, project.seriesBible)
  const rawStoryPlan = firstNonEmptyRecord(project.storyPlanTable?.content, project.storyPlan)
  const bible = seriesBibleFromRecord({ ...rawBible, ...rawStoryPlan })

  const mergedWorldRules = mergeWorldRules(
    rawStoryPlan.worldRules,
    rawBible.worldRules,
    recordFromJson(rawBible.updatedFields).worldRules,
  )
  if (mergedWorldRules.length > 0) bible.worldRules = mergedWorldRules

  const mergedFactions = mergeNamedRecords(
    rawStoryPlan.factions,
    rawBible.factions,
    recordFromJson(rawBible.updatedFields).factions,
  )
  if (mergedFactions.length > 0) bible.factions = mergedFactions

  applyStoryPlanSetting(bible, rawStoryPlan)
  applyStoryPlanWorldDescription(bible, rawStoryPlan)

  console.log(API_LOG_PREFIX.WORLD_SUMMARY_PROJECT_FETCHED, {
    id: project.id,
    hasSeriesBibleTable: !!project.seriesBibleTable,
    hasStoryPlanTable: !!project.storyPlanTable,
    bibleContentKeys: Object.keys(bible),
    bibleTitle: bible.title,
    bibleSetting: bible.setting,
    bibleRules: bible.worldRules?.length,
    fromStoryPlan: !!rawStoryPlan,
  })

  if (!bible.title && !bible.logline && !bible.premise) {
    console.warn(API_LOG_PREFIX.WORLD_SUMMARY_BIBLE_EMPTY)
  }

  return bible
}
