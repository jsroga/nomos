import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
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
} from '../../schemas/agent-schemas'
import { isCentralUser, canEditBible } from '@/lib/bible-permissions'
import { cachedFetch, clearFetchCache } from '@/lib/fetch-cache'

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

    const isUserCentral = isCentralUser(userEmail)
    const canEdit = canEditBible(userEmail, isLocked)
    const effectiveReadOnly = isReadOnly || !canEdit

    const lastSavedPlan = React.useRef<string | null>(null)

    // Sync local plan with incoming storyPlan if not editing
    useEffect(() => {
      if (isEditing) return

      const planStr = JSON.stringify(storyPlan)

      if (lastSavedPlan.current) {
        if (lastSavedPlan.current === planStr) {
          console.info('[BibleContext] Parent caught up with saved data. Clearing lock.')
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
        `bible-lock:${projectId}`,
        async () => {
          const response = await fetch(`/api/storyteller/bible/lock?projectId=${projectId}`)
          if (response.ok) {
            return response.json()
          }
          return { isLocked: false, lockedBy: null, lockedAt: null }
        },
        { ttlMs: 60_000 } // Cache for 1 minute
      )
        .then(data => {
          if (!isMounted) return
          setIsLocked(data.isLocked)
          setLockedBy(data.lockedBy)
          setLockedAt(data.lockedAt ? new Date(data.lockedAt) : null)
        })
        .catch(error => {
          console.warn('[Bible Context] Failed to fetch lock status:', error)
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

    const savePlan = async () => {
      if (!onUpdate) return
      const toSave = localPlan as StoryPlan
      lastSavedPlan.current = JSON.stringify(toSave)
      await onUpdate(toSave)
      setIsEditing(false)
      toast.success('World Bible updated')
    }

    const cancelEdit = () => {
      setLocalPlan(storyPlan)
      setIsEditing(false)
    }

    const toggleLock = async () => {
      if (!projectId || !userEmail) return
      setIsLockLoading(true)
      try {
        const action = isLocked ? 'unlock' : 'lock'
        const response = await fetch('/api/storyteller/bible/lock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, action, userEmail }),
        })
        if (response.ok) {
          const data = await response.json()
          // Clear the cache so future fetches get updated data
          clearFetchCache(`bible-lock:${projectId}`)
          setIsLocked(data.action === 'lock')
          setLockedBy(data.lockedBy)
          setLockedAt(data.lockedAt ? new Date(data.lockedAt) : null)
          toast.success(data.action === 'lock' ? '🔒 Bible locked' : '🔓 Bible unlocked')
        }
      } catch (error) {
        toast.error('Failed to update lock status')
      } finally {
        setIsLockLoading(false)
      }
    }

    const updateLocalPlan = (updates: Partial<StoryPlan>) => {
      setLocalPlan(prev => ({ ...prev, ...updates }))
    }

    // World Rules helpers
    const updateWorldRule = <K extends keyof WorldRule>(
      index: number,
      field: K,
      value: WorldRule[K]
    ) => {
      const rules = [...(localPlan.worldRules || [])]
      if (rules[index]) {
        rules[index] = { ...rules[index], [field]: value }
        updateLocalPlan({ worldRules: rules })
      }
    }

    const addWorldRule = () => {
      const rules = [...(localPlan.worldRules || [])]
      rules.push({ rule: '', consequence: '', category: 'Society' })
      updateLocalPlan({ worldRules: rules })
    }

    const removeWorldRule = (index: number) => {
      const rules = [...(localPlan.worldRules || [])]
      rules.splice(index, 1)
      updateLocalPlan({ worldRules: rules })
    }

    // Factions helpers
    const updateFaction = <K extends keyof Faction>(index: number, field: K, value: Faction[K]) => {
      const factions = [...(localPlan.factions || [])]
      if (factions[index]) {
        factions[index] = { ...factions[index], [field]: value }
        updateLocalPlan({ factions: factions })
      }
    }

    const addFaction = () => {
      const factions = [...(localPlan.factions || [])]
      factions.push({ name: '', ideology: '', goals: [], resources: '', description: '' })
      updateLocalPlan({ factions: factions })
    }

    const removeFaction = (index: number) => {
      const factions = [...(localPlan.factions || [])]
      factions.splice(index, 1)
      updateLocalPlan({ factions: factions })
    }

    // Key Characters helpers
    const updateKeyCharacter = <K extends keyof KeyCharacter>(
      index: number,
      field: K,
      value: KeyCharacter[K]
    ) => {
      const characters = [...(localPlan.keyCharacters || [])]
      if (characters[index]) {
        characters[index] = { ...characters[index], [field]: value }
        updateLocalPlan({ keyCharacters: characters })
      }
    }

    const addKeyCharacter = () => {
      const characters = [...(localPlan.keyCharacters || [])]
      characters.push({ name: '', role: '', archetype: '', motivation: '', factionId: null })
      updateLocalPlan({ keyCharacters: characters })
    }

    const removeKeyCharacter = (index: number) => {
      const characters = [...(localPlan.keyCharacters || [])]
      characters.splice(index, 1)
      updateLocalPlan({ keyCharacters: characters })
    }

    // Roadmap helpers
    const updateSequence = <K extends keyof StorySequence>(
      index: number,
      field: K,
      value: StorySequence[K]
    ) => {
      const sequences = [...(localPlan.sequences || [])]
      if (sequences[index]) {
        sequences[index] = { ...sequences[index], [field]: value }
        updateLocalPlan({ sequences })
      }
    }

    const addSequence = () => {
      const sequences = [...(localPlan.sequences || [])]
      sequences.push({
        id: Date.now(),
        name: '',
        description: '',
        keyFactionsInvolved: [],
        worldConsequence: '',
      })
      updateLocalPlan({ sequences })
    }

    const removeSequence = (index: number) => {
      const sequences = [...(localPlan.sequences || [])]
      sequences.splice(index, 1)
      updateLocalPlan({ sequences })
    }

    // Plot Twist helpers
    const updatePlotTwist = (index: number, value: string) => {
      const twists = [...(localPlan.plotTwists || [])]
      twists[index] = value
      updateLocalPlan({ plotTwists: twists })
    }

    const addPlotTwist = () => {
      const twists = [...(localPlan.plotTwists || [])]
      twists.push('')
      updateLocalPlan({ plotTwists: twists })
    }

    const removePlotTwist = (index: number) => {
      const twists = [...(localPlan.plotTwists || [])]
      twists.splice(index, 1)
      updateLocalPlan({ plotTwists: twists })
    }

    const updateInspiration = (category: 'books' | 'movies' | 'games', value: string) => {
      const currentInspirations = localPlan.inspirations || { books: [], movies: [], games: [] }
      const titles = value
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)

      const newItems = titles.map(title => {
        const existing = (currentInspirations[category] || []).find(item => item.title === title)
        return existing || { title, description: '' }
      })

      updateLocalPlan({
        inspirations: {
          ...currentInspirations,
          [category]: newItems,
        },
      })
    }

    // Items helpers
    const updateItem = <K extends keyof Item>(index: number, field: K, value: Item[K]) => {
      const items = [...(localPlan.items || [])]
      if (items[index]) {
        items[index] = { ...items[index], [field]: value }
        updateLocalPlan({ items })
      }
    }

    const addItem = () => {
      const items = [...(localPlan.items || [])]
      items.push({ name: '', description: '' })
      updateLocalPlan({ items })
    }

    const removeItem = (index: number) => {
      const items = [...(localPlan.items || [])]
      items.splice(index, 1)
      updateLocalPlan({ items })
    }

    // Events helpers
    const updateEvent = <K extends keyof StoryEvent>(index: number, field: K, value: StoryEvent[K]) => {
      const events = [...(localPlan.events || [])]
      if (events[index]) {
        events[index] = { ...events[index], [field]: value }
        updateLocalPlan({ events })
      }
    }

    const addEvent = () => {
      const events = [...(localPlan.events || [])]
      events.push({ name: '', description: '' })
      updateLocalPlan({ events })
    }

    const removeEvent = (index: number) => {
      const events = [...(localPlan.events || [])]
      events.splice(index, 1)
      updateLocalPlan({ events })
    }

    const value: BibleContextType = {
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
    }

    return <BibleContext.Provider value={value}>{children}</BibleContext.Provider>
  }

export const useBible = () => {
  const context = useContext(BibleContext)
  if (context === undefined) {
    throw new Error('useBible must be used within a BibleProvider')
  }
  return context
}
