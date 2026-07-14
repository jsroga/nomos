import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toast } from 'sonner'
import {
  StoryPlan,
  WorldRule,
  Faction,
  KeyCharacter,
  StorySequence,
  Item,
  StoryEvent,
} from '@/domains/storyteller/prompts/schemas/agent-schemas'
import { canEditBible } from '@/shared/auth/bible-permissions'
import { cachedFetch, clearFetchCache } from '@/shared/data/fetch-cache'
import { recordFromJson } from '@/shared/data/json-guards'
import {
  BIBLE_CONTEXT_DEFAULT_WORLD_RULE_CATEGORY,
  BIBLE_CONTEXT_HOOK_ERROR,
  BIBLE_CONTEXT_LOCK_API_PATH,
  BIBLE_CONTEXT_LOCK_CACHE_PREFIX,
  BIBLE_CONTEXT_LOG_LOCK_FETCH_FAILED,
  BIBLE_CONTEXT_LOG_PARENT_CAUGHT_UP,
  BIBLE_CONTEXT_TOAST_LOCKED,
  BIBLE_CONTEXT_TOAST_LOCK_FAILED,
  BIBLE_CONTEXT_TOAST_UNLOCKED,
  BIBLE_CONTEXT_TOAST_UPDATED,
  BibleContextHttpMethod,
  BibleLockAction,
} from './constants/bible-context'

// Pending action for a section
export interface PendingAction {
  section: string
  preview: any
  action: any
  onAccept: () => void
  onReject: () => void
  onReview?: () => void
  isProcessing?: boolean
}

interface BibleContextType {
  // State
  storyPlan: StoryPlan
  localPlan: Partial<StoryPlan>
  isEditing: boolean
  isReadOnly: boolean
  isLocked: boolean
  lockedBy: string | null
  lockedAt: Date | null
  userEmail: string | null
  isLockLoading: boolean
  projectId: string
  onSendMessage?: (msg: string, section?: string) => void
  getProviderConfig: () => any

  // Section loading states
  loadingSections: Record<string, { loading: boolean; message?: string }>

  // Pending actions per section (for blur overlay with accept/reject)
  pendingActions: Record<string, PendingAction>
  setPendingAction: (section: string, action: PendingAction | null) => void

  // Actions
  setIsEditing: (val: boolean) => void
  updateLocalPlan: (updates: Partial<StoryPlan>) => void
  savePlan: () => Promise<void>
  cancelEdit: () => void
  toggleLock: () => Promise<void>

  // Section-specific helpers
  updateWorldRule: <K extends keyof WorldRule>(index: number, field: K, value: WorldRule[K]) => void
  addWorldRule: () => void
  removeWorldRule: (index: number) => void

  updateFaction: <K extends keyof Faction>(index: number, field: K, value: Faction[K]) => void
  addFaction: () => void
  removeFaction: (index: number) => void

  updateKeyCharacter: <K extends keyof KeyCharacter>(
    index: number,
    field: K,
    value: KeyCharacter[K]
  ) => void
  addKeyCharacter: () => void
  removeKeyCharacter: (index: number) => void

  updateSequence: <K extends keyof StorySequence>(
    index: number,
    field: K,
    value: StorySequence[K]
  ) => void
  addSequence: () => void
  removeSequence: (index: number) => void

  updatePlotTwist: (index: number, value: string) => void
  addPlotTwist: () => void
  removePlotTwist: (index: number) => void

  updateInspiration: (category: 'books' | 'movies' | 'games', value: string) => void

  updateItem: <K extends keyof Item>(index: number, field: K, value: Item[K]) => void
  addItem: () => void
  removeItem: (index: number) => void

  updateEvent: <K extends keyof StoryEvent>(index: number, field: K, value: StoryEvent[K]) => void
  addEvent: () => void
  removeEvent: (index: number) => void
}

const BibleContext = createContext<BibleContextType | undefined>(undefined)

export const BibleProvider: React.FC<{
  children: React.ReactNode
  storyPlan: StoryPlan
  onUpdate?: (updates: Partial<StoryPlan>) => void | Promise<void>
  isReadOnly?: boolean
  projectId: string
  onSendMessage?: (msg: string, section?: string) => void
  getProviderConfig: () => any
  loadingSections?: Record<string, { loading: boolean; message?: string }>
  pendingActions?: Record<string, PendingAction>
  onSetPendingAction?: (section: string, action: PendingAction | null) => void
}> = ({
  children,
  storyPlan,
  onUpdate,
  isReadOnly = false,
  projectId,
  onSendMessage,
  getProviderConfig,
  loadingSections = {},
  pendingActions: externalPendingActions,
  onSetPendingAction,
}) => {
    const [isEditing, setIsEditing] = useState(false)
    const [localPlan, setLocalPlan] = useState<Partial<StoryPlan>>(storyPlan)
    const [isLocked, setIsLocked] = useState(false)
    const [lockedBy, setLockedBy] = useState<string | null>(null)
    const [lockedAt, setLockedAt] = useState<Date | null>(null)
    const [userEmail, setUserEmail] = useState<string | null>(null)
    const [isLockLoading, setIsLockLoading] = useState(false)
    const [internalPendingActions, setInternalPendingActions] = useState<
      Record<string, PendingAction>
    >({})

    const pendingActions = externalPendingActions ?? internalPendingActions
    const setPendingAction = useCallback(
      (section: string, action: PendingAction | null) => {
        if (onSetPendingAction) {
          onSetPendingAction(section, action)
        } else {
          setInternalPendingActions(prev => {
            if (action === null) {
              const { [section]: _, ...rest } = prev
              return rest
            }
            return { ...prev, [section]: action }
          })
        }
      },
      [onSetPendingAction]
    )

    const canEdit = canEditBible(userEmail, isLocked)
    const effectiveReadOnly = isReadOnly || !canEdit

    const lastSavedPlan = React.useRef<string | null>(null)

    // Sync local plan with incoming storyPlan if not editing
    useEffect(() => {
      if (isEditing) return

      const planStr = JSON.stringify(storyPlan)

      if (lastSavedPlan.current) {
        if (lastSavedPlan.current === planStr) {
          console.info(BIBLE_CONTEXT_LOG_PARENT_CAUGHT_UP)
          lastSavedPlan.current = null
          // Continue to sync just in case
        } else {
          // Parent still stale
          return
        }
      }

      // No lock or lock just cleared, so sync if different
      if (JSON.stringify(localPlan) !== planStr) {
        setLocalPlan(storyPlan)
      }
    }, [storyPlan, isEditing, localPlan])

    // Fetch lock status - using cachedFetch to prevent infinite loops on remount
    useEffect(() => {
      let isMounted = true
      if (!projectId) return

      cachedFetch(
        `${BIBLE_CONTEXT_LOCK_CACHE_PREFIX}${projectId}`,
        async () => {
          const response = await fetch(`${BIBLE_CONTEXT_LOCK_API_PATH}?projectId=${projectId}`)
          if (response.ok) {
            return response.json()
          }
          return { isLocked: false, lockedBy: null, lockedAt: null }
        },
        {
          ttlMs: 60_000,
          validate: (value): value is { isLocked: boolean; lockedBy: string | null; lockedAt: string | null } => {
            const record = recordFromJson(value)
            return typeof record.isLocked === 'boolean'
          },
        }
      )
        .then(data => {
          if (!isMounted) return
          setIsLocked(data.isLocked)
          setLockedBy(data.lockedBy)
          setLockedAt(data.lockedAt ? new Date(data.lockedAt) : null)
        })
        .catch(error => {
          console.warn(BIBLE_CONTEXT_LOG_LOCK_FETCH_FAILED, error)
        })

      return () => {
        isMounted = false
      }
    }, [projectId])

    // Fetch user
    useEffect(() => {
      const fetchUser = async () => {
        const supabase = createClientComponentClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setUserEmail(user?.email || null)
      }
      fetchUser()
    }, [])

    const savePlan = useCallback(async () => {
      if (!onUpdate) return
      const toSave = localPlan
      lastSavedPlan.current = JSON.stringify(toSave)
      await onUpdate(toSave)
      setIsEditing(false)
      toast.success(BIBLE_CONTEXT_TOAST_UPDATED)
    }, [localPlan, onUpdate])

    const cancelEdit = useCallback(() => {
      setLocalPlan(storyPlan)
      setIsEditing(false)
    }, [storyPlan])

    const toggleLock = useCallback(async () => {
      if (!projectId || !userEmail) return
      setIsLockLoading(true)
      try {
        const action = isLocked ? BibleLockAction.Unlock : BibleLockAction.Lock
        const response = await fetch(BIBLE_CONTEXT_LOCK_API_PATH, {
          method: BibleContextHttpMethod.Post,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, action, userEmail }),
        })
        if (response.ok) {
          const data = await response.json()
          // Clear the cache so future fetches get updated data
          clearFetchCache(`${BIBLE_CONTEXT_LOCK_CACHE_PREFIX}${projectId}`)
          setIsLocked(data.action === BibleLockAction.Lock)
          setLockedBy(data.lockedBy)
          setLockedAt(data.lockedAt ? new Date(data.lockedAt) : null)
          toast.success(data.action === BibleLockAction.Lock ? BIBLE_CONTEXT_TOAST_LOCKED : BIBLE_CONTEXT_TOAST_UNLOCKED)
        }
      } catch (_error) {
        toast.error(BIBLE_CONTEXT_TOAST_LOCK_FAILED)
      } finally {
        setIsLockLoading(false)
      }
    }, [isLocked, projectId, userEmail])

    const updateLocalPlan = useCallback((updates: Partial<StoryPlan>) => {
      setLocalPlan(prev => ({ ...prev, ...updates }))
    }, [])

    // World Rules helpers
    const updateWorldRule = useCallback(function updateWorldRule<K extends keyof WorldRule>(
      index: number,
      field: K,
      value: WorldRule[K]
    ) {
      setLocalPlan(prev => {
        const rules = [...(prev.worldRules || [])]
        if (!rules[index]) return prev
        rules[index] = { ...rules[index], [field]: value }
        return { ...prev, worldRules: rules }
      })
    }, [])

    const addWorldRule = useCallback(() => {
      setLocalPlan(prev => ({
        ...prev,
        worldRules: [...(prev.worldRules || []), { rule: '', consequence: '', category: BIBLE_CONTEXT_DEFAULT_WORLD_RULE_CATEGORY }],
      }))
    }, [])

    const removeWorldRule = useCallback((index: number) => {
      setLocalPlan(prev => {
        const rules = [...(prev.worldRules || [])]
        rules.splice(index, 1)
        return { ...prev, worldRules: rules }
      })
    }, [])

    // Factions helpers
    const updateFaction = useCallback(function updateFaction<K extends keyof Faction>(index: number, field: K, value: Faction[K]) {
      setLocalPlan(prev => {
        const factions = [...(prev.factions || [])]
        if (!factions[index]) return prev
        factions[index] = { ...factions[index], [field]: value }
        return { ...prev, factions }
      })
    }, [])

    const addFaction = useCallback(() => {
      setLocalPlan(prev => ({
        ...prev,
        factions: [
          ...(prev.factions || []),
          { name: '', ideology: '', goals: [], resources: '', description: '' },
        ],
      }))
    }, [])

    const removeFaction = useCallback((index: number) => {
      setLocalPlan(prev => {
        const factions = [...(prev.factions || [])]
        factions.splice(index, 1)
        return { ...prev, factions }
      })
    }, [])

    // Key Characters helpers
    const updateKeyCharacter = useCallback(function updateKeyCharacter<K extends keyof KeyCharacter>(
      index: number,
      field: K,
      value: KeyCharacter[K]
    ) {
      setLocalPlan(prev => {
        const characters = [...(prev.keyCharacters || [])]
        if (!characters[index]) return prev
        characters[index] = { ...characters[index], [field]: value }
        return { ...prev, keyCharacters: characters }
      })
    }, [])

    const addKeyCharacter = useCallback(() => {
      setLocalPlan(prev => ({
        ...prev,
        keyCharacters: [
          ...(prev.keyCharacters || []),
          { name: '', role: '', archetype: '', motivation: '', factionId: null },
        ],
      }))
    }, [])

    const removeKeyCharacter = useCallback((index: number) => {
      setLocalPlan(prev => {
        const characters = [...(prev.keyCharacters || [])]
        characters.splice(index, 1)
        return { ...prev, keyCharacters: characters }
      })
    }, [])

    // Roadmap helpers
    const updateSequence = useCallback(function updateSequence<K extends keyof StorySequence>(
      index: number,
      field: K,
      value: StorySequence[K]
    ) {
      setLocalPlan(prev => {
        const sequences = [...(prev.sequences || [])]
        if (!sequences[index]) return prev
        sequences[index] = { ...sequences[index], [field]: value }
        return { ...prev, sequences }
      })
    }, [])

    const addSequence = useCallback(() => {
      setLocalPlan(prev => ({
        ...prev,
        sequences: [
          ...(prev.sequences || []),
          {
            id: Date.now(),
            name: '',
            description: '',
            keyFactionsInvolved: [],
            worldConsequence: '',
          },
        ],
      }))
    }, [])

    const removeSequence = useCallback((index: number) => {
      setLocalPlan(prev => {
        const sequences = [...(prev.sequences || [])]
        sequences.splice(index, 1)
        return { ...prev, sequences }
      })
    }, [])

    // Plot Twist helpers
    const updatePlotTwist = useCallback((index: number, value: string) => {
      setLocalPlan(prev => {
        const twists = [...(prev.plotTwists || [])]
        twists[index] = value
        return { ...prev, plotTwists: twists }
      })
    }, [])

    const addPlotTwist = useCallback(() => {
      setLocalPlan(prev => ({ ...prev, plotTwists: [...(prev.plotTwists || []), ''] }))
    }, [])

    const removePlotTwist = useCallback((index: number) => {
      setLocalPlan(prev => {
        const twists = [...(prev.plotTwists || [])]
        twists.splice(index, 1)
        return { ...prev, plotTwists: twists }
      })
    }, [])

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
    }, [])

    // Items helpers
    const updateItem = useCallback(function updateItem<K extends keyof Item>(index: number, field: K, value: Item[K]) {
      setLocalPlan(prev => {
        const items = [...(prev.items || [])]
        if (!items[index]) return prev
        items[index] = { ...items[index], [field]: value }
        return { ...prev, items }
      })
    }, [])

    const addItem = useCallback(() => {
      setLocalPlan(prev => ({ ...prev, items: [...(prev.items || []), { name: '', description: '' }] }))
    }, [])

    const removeItem = useCallback((index: number) => {
      setLocalPlan(prev => {
        const items = [...(prev.items || [])]
        items.splice(index, 1)
        return { ...prev, items }
      })
    }, [])

    // Events helpers
    const updateEvent = useCallback(function updateEvent<K extends keyof StoryEvent>(index: number, field: K, value: StoryEvent[K]) {
      setLocalPlan(prev => {
        const events = [...(prev.events || [])]
        if (!events[index]) return prev
        events[index] = { ...events[index], [field]: value }
        return { ...prev, events }
      })
    }, [])

    const addEvent = useCallback(() => {
      setLocalPlan(prev => ({ ...prev, events: [...(prev.events || []), { name: '', description: '' }] }))
    }, [])

    const removeEvent = useCallback((index: number) => {
      setLocalPlan(prev => {
        const events = [...(prev.events || [])]
        events.splice(index, 1)
        return { ...prev, events }
      })
    }, [])

    const value: BibleContextType = useMemo(() => ({
      storyPlan,
      localPlan,
      isEditing,
      isReadOnly: effectiveReadOnly,
      isLocked,
      lockedBy,
      lockedAt,
      userEmail,
      isLockLoading,
      projectId,
      onSendMessage,
      getProviderConfig,
      loadingSections,
      pendingActions,
      setPendingAction,
      setIsEditing,
      updateLocalPlan,
      savePlan,
      cancelEdit,
      toggleLock,
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
    }), [
      storyPlan,
      localPlan,
      isEditing,
      effectiveReadOnly,
      isLocked,
      lockedBy,
      lockedAt,
      userEmail,
      isLockLoading,
      projectId,
      onSendMessage,
      getProviderConfig,
      loadingSections,
      pendingActions,
      setPendingAction,
      updateLocalPlan,
      savePlan,
      cancelEdit,
      toggleLock,
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
    ])

    return <BibleContext.Provider value={value}>{children}</BibleContext.Provider>
  }

export const useBible = () => {
  const context = useContext(BibleContext)
  if (context === undefined) {
    throw new Error(BIBLE_CONTEXT_HOOK_ERROR)
  }
  return context
}
