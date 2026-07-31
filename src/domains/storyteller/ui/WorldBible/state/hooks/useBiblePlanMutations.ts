import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react'
import {
  StoryPlan,
  WorldRule,
  Faction,
  KeyCharacter,
  StorySequence,
  Item,
  StoryEvent,
} from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import { BIBLE_CONTEXT_DEFAULT_WORLD_RULE_CATEGORY } from '../../constants/bible-context'
import { BiblePlanArrayKey } from '../../constants/bible-section-ui'

type SetLocalPlan = Dispatch<SetStateAction<Partial<StoryPlan>>>

function updatePlanArrayItem<T extends Record<string, unknown>, K extends keyof T>(
  setLocalPlan: SetLocalPlan,
  arrayKey: BiblePlanArrayKey,
  index: number,
  field: K,
  value: T[K]
) {
  setLocalPlan(prev => {
    const current = prev[arrayKey]
    if (!Array.isArray(current)) return prev
    const next = [...current]
    const item = next[index]
    if (!item || typeof item !== 'object') return prev
    next[index] = { ...item, [field]: value }
    return { ...prev, [arrayKey]: next }
  })
}

function removePlanArrayItem(setLocalPlan: SetLocalPlan, arrayKey: BiblePlanArrayKey, index: number) {
  setLocalPlan(prev => {
    const current = prev[arrayKey]
    if (!Array.isArray(current)) return prev
    const next = [...current]
    next.splice(index, 1)
    return { ...prev, [arrayKey]: next }
  })
}

function appendPlanArrayItem<T>(setLocalPlan: SetLocalPlan, arrayKey: BiblePlanArrayKey, item: T) {
  setLocalPlan(prev => {
    const current = prev[arrayKey]
    const list = Array.isArray(current) ? current : []
    return { ...prev, [arrayKey]: [...list, item] }
  })
}

export function useBiblePlanMutations(setLocalPlan: SetLocalPlan) {
  const updateWorldRule = useCallback(function updateWorldRule<K extends keyof WorldRule>(
    index: number,
    field: K,
    value: WorldRule[K]
  ) {
    updatePlanArrayItem<WorldRule, K>(setLocalPlan, BiblePlanArrayKey.WorldRules, index, field, value)
  }, [setLocalPlan])

  const addWorldRule = useCallback(() => {
    appendPlanArrayItem(setLocalPlan, BiblePlanArrayKey.WorldRules, {
      rule: '',
      consequence: '',
      category: BIBLE_CONTEXT_DEFAULT_WORLD_RULE_CATEGORY,
    })
  }, [setLocalPlan])

  const removeWorldRule = useCallback(
    (index: number) => removePlanArrayItem(setLocalPlan, BiblePlanArrayKey.WorldRules, index),
    [setLocalPlan]
  )

  const updateFaction = useCallback(function updateFaction<K extends keyof Faction>(
    index: number,
    field: K,
    value: Faction[K]
  ) {
    updatePlanArrayItem<Faction, K>(setLocalPlan, BiblePlanArrayKey.Factions, index, field, value)
  }, [setLocalPlan])

  const addFaction = useCallback(() => {
    appendPlanArrayItem(setLocalPlan, BiblePlanArrayKey.Factions, {
      name: '',
      ideology: '',
      goals: [],
      resources: '',
      description: '',
    })
  }, [setLocalPlan])

  const removeFaction = useCallback(
    (index: number) => removePlanArrayItem(setLocalPlan, BiblePlanArrayKey.Factions, index),
    [setLocalPlan]
  )

  const updateKeyCharacter = useCallback(function updateKeyCharacter<K extends keyof KeyCharacter>(
    index: number,
    field: K,
    value: KeyCharacter[K]
  ) {
    updatePlanArrayItem<KeyCharacter, K>(setLocalPlan, BiblePlanArrayKey.KeyCharacters, index, field, value)
  }, [setLocalPlan])

  const addKeyCharacter = useCallback(() => {
    appendPlanArrayItem(setLocalPlan, BiblePlanArrayKey.KeyCharacters, {
      name: '',
      role: '',
      archetype: '',
      motivation: '',
      factionId: null,
    })
  }, [setLocalPlan])

  const removeKeyCharacter = useCallback(
    (index: number) => removePlanArrayItem(setLocalPlan, BiblePlanArrayKey.KeyCharacters, index),
    [setLocalPlan]
  )

  const updateSequence = useCallback(function updateSequence<K extends keyof StorySequence>(
    index: number,
    field: K,
    value: StorySequence[K]
  ) {
    updatePlanArrayItem<StorySequence, K>(setLocalPlan, BiblePlanArrayKey.Sequences, index, field, value)
  }, [setLocalPlan])

  const addSequence = useCallback(() => {
    appendPlanArrayItem(setLocalPlan, BiblePlanArrayKey.Sequences, {
      id: Date.now(),
      name: '',
      description: '',
      keyFactionsInvolved: [],
      worldConsequence: '',
    })
  }, [setLocalPlan])

  const removeSequence = useCallback(
    (index: number) => removePlanArrayItem(setLocalPlan, BiblePlanArrayKey.Sequences, index),
    [setLocalPlan]
  )

  const updatePlotTwist = useCallback((index: number, value: string) => {
    setLocalPlan(prev => {
      const twists = [...(prev.plotTwists || [])]
      twists[index] = value
      return { ...prev, plotTwists: twists }
    })
  }, [setLocalPlan])

  const addPlotTwist = useCallback(() => {
    setLocalPlan(prev => ({ ...prev, plotTwists: [...(prev.plotTwists || []), ''] }))
  }, [setLocalPlan])

  const removePlotTwist = useCallback((index: number) => {
    setLocalPlan(prev => {
      const twists = [...(prev.plotTwists || [])]
      twists.splice(index, 1)
      return { ...prev, plotTwists: twists }
    })
  }, [setLocalPlan])

  const updateInspiration = useCallback((category: 'books' | 'movies' | 'games', value: string) => {
    const titles = value
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)

    setLocalPlan(prev => {
      const currentInspirations = prev.inspirations || { books: [], movies: [], games: [] }
      const newItems = titles.map(title => {
        const existing = (currentInspirations[category] || []).find(item => item.title === title)
        return existing || { title, description: '' }
      })
      return {
        ...prev,
        inspirations: {
          ...currentInspirations,
          [category]: newItems,
        },
      }
    })
  }, [setLocalPlan])

  const updateItem = useCallback(function updateItem<K extends keyof Item>(
    index: number,
    field: K,
    value: Item[K]
  ) {
    updatePlanArrayItem<Item, K>(setLocalPlan, BiblePlanArrayKey.Items, index, field, value)
  }, [setLocalPlan])

  const addItem = useCallback(() => {
    appendPlanArrayItem(setLocalPlan, BiblePlanArrayKey.Items, { name: '', description: '' })
  }, [setLocalPlan])

  const removeItem = useCallback(
    (index: number) => removePlanArrayItem(setLocalPlan, BiblePlanArrayKey.Items, index),
    [setLocalPlan]
  )

  const updateEvent = useCallback(function updateEvent<K extends keyof StoryEvent>(
    index: number,
    field: K,
    value: StoryEvent[K]
  ) {
    updatePlanArrayItem<StoryEvent, K>(setLocalPlan, BiblePlanArrayKey.Events, index, field, value)
  }, [setLocalPlan])

  const addEvent = useCallback(() => {
    appendPlanArrayItem(setLocalPlan, BiblePlanArrayKey.Events, { name: '', description: '' })
  }, [setLocalPlan])

  const removeEvent = useCallback(
    (index: number) => removePlanArrayItem(setLocalPlan, BiblePlanArrayKey.Events, index),
    [setLocalPlan]
  )

  return useMemo(
    () => ({
      updateWorldRule,
      addWorldRule,
      removeWorldRule,
      updateFaction,
      addFaction,
      removeFaction,
      updateKeyCharacter,
      addKeyCharacter,
      removeKeyCharacter,
      updateSequence,
      addSequence,
      removeSequence,
      updatePlotTwist,
      addPlotTwist,
      removePlotTwist,
      updateInspiration,
      updateItem,
      addItem,
      removeItem,
      updateEvent,
      addEvent,
      removeEvent,
    }),
    [
      updateWorldRule,
      addWorldRule,
      removeWorldRule,
      updateFaction,
      addFaction,
      removeFaction,
      updateKeyCharacter,
      addKeyCharacter,
      removeKeyCharacter,
      updateSequence,
      addSequence,
      removeSequence,
      updatePlotTwist,
      addPlotTwist,
      removePlotTwist,
      updateInspiration,
      updateItem,
      addItem,
      removeItem,
      updateEvent,
      addEvent,
      removeEvent,
    ]
  )
}

export type BiblePlanMutations = ReturnType<typeof useBiblePlanMutations>

