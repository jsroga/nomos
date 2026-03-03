'use client'

import { useEffect } from 'react'
import type { StoryPlan } from '../schemas/agent-schemas'

interface HydrationParams {
  currentProject: any
  setStoryPlan: React.Dispatch<React.SetStateAction<StoryPlan | null>>
  setStoryDecisions: React.Dispatch<React.SetStateAction<Record<string, string>>>
}

export function useStorytellerHydration({
  currentProject,
  setStoryPlan,
  setStoryDecisions,
}: HydrationParams) {
  useEffect(() => {
    const projectId = currentProject?.id
    if (!projectId) return

    const rawBible = (currentProject as any)?.series_bible || (currentProject as any)?.seriesBible
    const rawStoryPlan = (currentProject as any)?.story_plan || (currentProject as any)?.storyPlan

    console.log('🔍 [StorytellerPage] Hydration Check:', {
      hasRawBible: !!rawBible,
      hasRawStoryPlan: !!rawStoryPlan,
      rawStoryPlanKeys: rawStoryPlan ? Object.keys(rawStoryPlan) : [],
      rawStoryPlanWorldRules: rawStoryPlan?.worldRules?.length || 0,
      rawBibleKeys: rawBible ? Object.keys(rawBible) : [],
      rawBibleUpdatedFieldsWorldRules: rawBible?.updatedFields?.worldRules?.length || 0,
    })

    if (rawBible || rawStoryPlan) {
      console.log('🔄 [StorytellerPage] Hydrating state from project...')
      const bible = (rawBible || {}) as any

      if (bible.userDecisions) {
        setStoryDecisions(prev => ({ ...prev, ...bible.userDecisions }))
      }

      const planFields = [
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
      ]

      const initialPlan = { ...(bible.storyPlan || {}), ...(rawStoryPlan || {}) } as any

      const categories = [
        'General',
        'Setting',
        'History',
        'Magic',
        'Factions',
        'Technology',
        'Culture',
        'updatedFields',
      ]

      const mergeFromSource = (source: any, onlyIfMissing = false) => {
        if (!source) return
        for (const field of planFields) {
          if (source[field] !== undefined && source[field] !== null) {
            if (onlyIfMissing && initialPlan[field] !== undefined && initialPlan[field] !== null) {
              continue
            }
            initialPlan[field] = source[field]
          }
        }

        const charAliases = ['characters', 'cast', 'keyPlayers', 'key_players']
        for (const alias of charAliases) {
          if (source[alias] && Array.isArray(source[alias]) && source[alias].length > 0) {
            initialPlan.keyCharacters = [...(initialPlan.keyCharacters || []), ...source[alias]]
          }
        }

        if (source.rules && Array.isArray(source.rules)) {
          initialPlan.worldRules = [...(initialPlan.worldRules || []), ...source.rules]
        }
      }

      mergeFromSource(rawStoryPlan, false)

      for (const cat of categories) {
        mergeFromSource(bible[cat], true)
      }

      mergeFromSource(bible, true)

      if (initialPlan.keyCharacters) {
        const unique = new Map()
        initialPlan.keyCharacters.forEach((c: any) => {
          if (c && c.name) unique.set(c.name, c)
        })
        initialPlan.keyCharacters = Array.from(unique.values())
      }

      if (initialPlan.worldRules) {
        const unique = new Map()
        initialPlan.worldRules.forEach((r: any) => {
          if (r && r.rule) unique.set(r.rule, r)
        })
        initialPlan.worldRules = Array.from(unique.values())
      }

      setStoryPlan(initialPlan)
      console.log('✅ [StorytellerPage] Hydrated storyPlan keys:', Object.keys(initialPlan))
      console.log('✅ [StorytellerPage] worldRules count:', initialPlan.worldRules?.length || 0)
      console.log('✅ [StorytellerPage] worldRules:', initialPlan.worldRules)
      console.log(
        '✅ [StorytellerPage] worldDescription (first 100 chars):',
        initialPlan.worldDescription?.slice(0, 100)
      )
    }
  }, [
    currentProject?.id,
    (currentProject as any)?.story_plan?.worldDescription,
    (currentProject as any)?.story_plan?.worldRules?.length,
    (currentProject as any)?.series_bible?.worldDescription,
    (currentProject as any)?.storyPlan?.worldDescription,
    (currentProject as any)?.storyPlan?.worldRules?.length,
  ])
}
