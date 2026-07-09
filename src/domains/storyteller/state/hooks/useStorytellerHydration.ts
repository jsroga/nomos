'use client'

import { useEffect, useMemo } from 'react'
import type { StoryPlan } from '@/domains/storyteller/prompts/schemas/agent-schemas'
import { applyUpdatesToStoryPlan } from '@/domains/storyteller/config/action-config'
import {
  dedupeCastByName,
  mergeCastFromSource,
  readCastFromPlan,
} from '@/domains/storyteller/core/formatting/StoryPlanFields'
import { recordArrayFromJson, recordFromJson, stringRecordFromJson } from '@/shared/data/json-guards'

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

const PLAN_FIELDS = [
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
  'executiveSummary',
  'episodeRoadmap',
] as const

const BIBLE_CATEGORIES = [
  'General',
  'Setting',
  'History',
  'Magic',
  'Factions',
  'Technology',
  'Culture',
  'updatedFields',
] as const

function mergePlanFields(
  target: Record<string, unknown>,
  source: Record<string, unknown> | undefined,
  onlyIfMissing = false
): void {
  if (!source) return

  for (const field of PLAN_FIELDS) {
    const value = source[field]
    if (value === undefined || value === null) continue
    if (onlyIfMissing && target[field] !== undefined && target[field] !== null) continue
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

    const rawBible = currentProject.series_bible ?? {}
    const rawStoryPlan = currentProject.story_plan ?? {}
    const bible = recordFromJson(rawBible)
    const nestedStoryPlan = recordFromJson(bible.storyPlan)

    console.log('🔍 [StorytellerPage] Hydration Check:', {
      hasRawBible: Object.keys(rawBible).length > 0,
      hasRawStoryPlan: Object.keys(rawStoryPlan).length > 0,
      rawStoryPlanKeys: Object.keys(rawStoryPlan),
      rawStoryPlanWorldRules: recordArrayFromJson(rawStoryPlan.worldRules).length,
      rawBibleKeys: Object.keys(rawBible),
      rawBibleUpdatedFieldsWorldRules: recordArrayFromJson(
        recordFromJson(rawBible.updatedFields).worldRules
      ).length,
    })

    if (Object.keys(rawBible).length === 0 && Object.keys(rawStoryPlan).length === 0) return

    console.log('🔄 [StorytellerPage] Hydrating state from project...')

    const userDecisions = stringRecordFromJson(bible.userDecisions)
    if (Object.keys(userDecisions).length > 0) {
      setStoryDecisions(prev => ({ ...prev, ...userDecisions }))
    }

    const initialPlan: Record<string, unknown> = { ...nestedStoryPlan, ...rawStoryPlan }

    mergePlanFields(initialPlan, rawStoryPlan, false)

    for (const cat of BIBLE_CATEGORIES) {
      mergePlanFields(initialPlan, recordFromJson(bible[cat]), true)
    }

    mergePlanFields(initialPlan, bible, true)

    const cast = readCastFromPlan(initialPlan)
    if (cast.length > 0) {
      const merged = dedupeCastByName(cast)
      initialPlan.cast = merged
      initialPlan.keyCharacters = merged
    }

    if (initialPlan.worldRules) {
      initialPlan.worldRules = dedupeWorldRules(initialPlan.worldRules)
    }

    setStoryPlan(prev => applyUpdatesToStoryPlan(prev, initialPlan))
    console.log('✅ [StorytellerPage] Hydrated storyPlan keys:', Object.keys(initialPlan))
    console.log(
      '✅ [StorytellerPage] worldRules count:',
      recordArrayFromJson(initialPlan.worldRules).length
    )
  }, [currentProject, hydrationSignature, setStoryDecisions, setStoryPlan])
}
