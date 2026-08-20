'use client'

import { useEffect, useMemo } from 'react'
import type { StoryPlan } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import { applyUpdatesToStoryPlan } from '@/domains/storyteller/config/action-config'
import { StoryPlanMergeField } from '@/domains/storyteller/config/constants/bible-wire-fields'
import {
  dedupeCastByName,
  mergeCastFromSource,
  readCastFromPlan,
} from '@/domains/storyteller/core/formatting/story-plan-fields'
import {
  parseSeriesBibleRecord,
  parseStoryPlanRecord,
} from '@/domains/storyteller/core/io/project-jsonb'
import { recordArrayFromJson, recordFromJson, stringArrayFromJson, stringRecordFromJson } from '@/shared/data/json-guards'
import {
  isVacantHydrationValue,
  omitVacantSoundtrackInspirations,
} from '@/domains/storyteller/core/utils/bible-populated-fields'
import {
  HYDRATION_BIBLE_CATEGORIES,
  HYDRATION_PLAN_FIELDS,
  StorytellerHydrationLog,
} from '@/domains/storyteller/state/constants/hydration'

interface HydratableProject {
  id?: string
  series_bible?: Record<string, unknown>
  story_plan?: Record<string, unknown>
}

interface HydrationParams {
  currentProject: HydratableProject | null | undefined
  setStoryPlan: React.Dispatch<React.SetStateAction<StoryPlan | null>>
  setStoryDecisions: React.Dispatch<React.SetStateAction<Record<string, string>>>
}

function mergePlanFields(
  target: Record<string, unknown>,
  source: Record<string, unknown> | undefined,
  onlyIfMissing = false
): void {
  if (!source) return

  for (const field of HYDRATION_PLAN_FIELDS) {
    const value = source[field]
    if (isVacantHydrationValue(field, value)) continue
    if (onlyIfMissing && !isVacantHydrationValue(field, target[field])) continue
    target[field] = value
  }

  mergeCastFromSource(target, source)

  const rules = recordArrayFromJson(source.rules)
  if (rules.length > 0) {
    const existing = recordArrayFromJson(target.worldRules)
    target.worldRules = [...existing, ...rules]
  }
}

function dedupeWorldRules(rules: unknown): unknown[] {
  const unique = new Map<string, Record<string, unknown>>()
  for (const row of recordArrayFromJson(rules)) {
    const rule = typeof row.rule === 'string' ? row.rule : ''
    if (rule) unique.set(rule, row)
  }
  return Array.from(unique.values())
}

export function useStorytellerHydration({
  currentProject,
  setStoryPlan,
  setStoryDecisions,
}: HydrationParams) {
  const hydrationSignature = useMemo(() => {
    if (!currentProject?.id) return null
    const storyPlan = currentProject.story_plan ?? {}
    const bible = currentProject.series_bible ?? {}
    return JSON.stringify({
      id: currentProject.id,
      storyWorldDescription: storyPlan.worldDescription,
      storyWorldRules: recordArrayFromJson(storyPlan.worldRules).length,
      bibleWorldDescription: bible.worldDescription,
    })
  }, [currentProject])

  useEffect(() => {
    if (!hydrationSignature || !currentProject?.id) return

    const bible = parseSeriesBibleRecord(currentProject.series_bible)
    const rawStoryPlan = parseStoryPlanRecord(currentProject.story_plan)
    const nestedStoryPlan = parseStoryPlanRecord(bible.storyPlan)

    console.log(StorytellerHydrationLog.Check, {
      hasRawBible: Object.keys(bible).length > 0,
      hasRawStoryPlan: Object.keys(rawStoryPlan).length > 0,
      rawStoryPlanKeys: Object.keys(rawStoryPlan),
      rawStoryPlanWorldRules: recordArrayFromJson(rawStoryPlan.worldRules).length,
      rawBibleKeys: Object.keys(bible),
      rawBibleUpdatedFieldsWorldRules: recordArrayFromJson(
        recordFromJson(bible.updatedFields).worldRules
      ).length,
    })

    if (Object.keys(bible).length === 0 && Object.keys(rawStoryPlan).length === 0) return

    console.log(StorytellerHydrationLog.Hydrating)

    const userDecisions = stringRecordFromJson(bible.userDecisions)
    if (Object.keys(userDecisions).length > 0) {
      setStoryDecisions(prev => ({ ...prev, ...userDecisions }))
    }

    const initialPlan: Record<string, unknown> = { ...nestedStoryPlan, ...rawStoryPlan }

    mergePlanFields(initialPlan, rawStoryPlan, false)

    for (const cat of HYDRATION_BIBLE_CATEGORIES) {
      mergePlanFields(initialPlan, recordFromJson(bible[cat]), true)
    }

    mergePlanFields(initialPlan, bible, true)

    const bibleMoodImages = stringArrayFromJson(bible[StoryPlanMergeField.MoodImages])
    if (bibleMoodImages.length > 0) {
      initialPlan[StoryPlanMergeField.MoodImages] = bibleMoodImages
    }

    const cast = readCastFromPlan(initialPlan)
    if (cast.length > 0) {
      const merged = dedupeCastByName(cast)
      initialPlan.cast = merged
      initialPlan.keyCharacters = merged
    }

    if (initialPlan.worldRules) {
      initialPlan.worldRules = dedupeWorldRules(initialPlan.worldRules)
    }

    setStoryPlan(prev =>
      applyUpdatesToStoryPlan(prev, omitVacantSoundtrackInspirations(initialPlan)),
    )
    console.log(StorytellerHydrationLog.HydratedKeys, Object.keys(initialPlan))
    console.log(
      StorytellerHydrationLog.WorldRulesCount,
      recordArrayFromJson(initialPlan.worldRules).length
    )
  }, [currentProject, hydrationSignature, setStoryDecisions, setStoryPlan])
}
