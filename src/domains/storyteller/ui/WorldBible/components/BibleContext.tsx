import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toast } from 'sonner'
import { StoryPlan } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import { canEditBible } from '@/shared/auth/bible-permissions'
import { cachedFetch, clearFetchCache } from '@/shared/data/fetch-cache'
import { recordFromJson } from '@/shared/data/json-guards'
import {
  fetchStorytellerBibleLockOptional,
  postStorytellerBibleLock,
} from '@/domains/storyteller/core/io/storyteller.api'
import {
  BIBLE_CONTEXT_HOOK_ERROR,
  BIBLE_CONTEXT_LOCK_CACHE_PREFIX,
  BIBLE_CONTEXT_LOG_LOCK_FETCH_FAILED,
  BIBLE_CONTEXT_LOG_PARENT_CAUGHT_UP,
  BIBLE_CONTEXT_TOAST_LOCKED,
  BIBLE_CONTEXT_TOAST_LOCK_FAILED,
  BIBLE_CONTEXT_TOAST_UNLOCKED,
  BIBLE_CONTEXT_TOAST_UPDATED,
  BibleLockAction,
} from '../constants/bible-context'
import { useBiblePlanMutations } from '../state/hooks/useBiblePlanMutations'
import type {
  BibleContextType,
  BibleProviderConfig,
  PendingAction,
} from '../utils/bible-context-types'

export type { PendingAction } from '../utils/bible-context-types'

const BibleContext = createContext<BibleContextType | undefined>(undefined)

function useBiblePlanSync(
  storyPlan: StoryPlan,
  isEditing: boolean,
  setLocalPlan: React.Dispatch<React.SetStateAction<Partial<StoryPlan>>>
) {
  const lastSavedPlan = React.useRef<string | null>(null)
  const localPlanRef = React.useRef<Partial<StoryPlan> | null>(null)

  useEffect(() => {
    if (isEditing) return

    const planStr = JSON.stringify(storyPlan)

    if (lastSavedPlan.current) {
      if (lastSavedPlan.current === planStr) {
        console.info(BIBLE_CONTEXT_LOG_PARENT_CAUGHT_UP)
        lastSavedPlan.current = null
      } else {
        return
      }
    }

    // Compare against last applied parent plan, not live localPlan (avoids
    // re-stringify of local + effect loops when localPlan is in deps).
    if (localPlanRef.current === storyPlan) return
    const prevStr = localPlanRef.current ? JSON.stringify(localPlanRef.current) : null
    if (prevStr === planStr) {
      localPlanRef.current = storyPlan
      return
    }

    localPlanRef.current = storyPlan
    setLocalPlan(storyPlan)
  }, [storyPlan, isEditing, setLocalPlan])

  return lastSavedPlan
}

function useBibleLockStatus(projectId: string) {
  const [isLocked, setIsLocked] = useState(false)
  const [lockedBy, setLockedBy] = useState<string | null>(null)
  const [lockedAt, setLockedAt] = useState<Date | null>(null)

  useEffect(() => {
    let isMounted = true
    if (!projectId) return

    cachedFetch(
      `${BIBLE_CONTEXT_LOCK_CACHE_PREFIX}${projectId}`,
      () => fetchStorytellerBibleLockOptional(projectId),
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

  return { isLocked, setIsLocked, lockedBy, setLockedBy, lockedAt, setLockedAt }
}

function useBibleUserEmail() {
  const [userEmail, setUserEmail] = useState<string | null>(null)

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

  return userEmail
}

export const BibleProvider: React.FC<{
  children: React.ReactNode
  storyPlan: StoryPlan
  onUpdate?: (updates: Partial<StoryPlan>) => void | Promise<void>
  isReadOnly?: boolean
  projectId: string
  onSendMessage?: (msg: string, section?: string) => void
  getProviderConfig: () => BibleProviderConfig
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
  const [isLockLoading, setIsLockLoading] = useState(false)
  const [internalPendingActions, setInternalPendingActions] = useState<
    Record<string, PendingAction>
  >({})

  const { isLocked, setIsLocked, lockedBy, setLockedBy, lockedAt, setLockedAt } =
    useBibleLockStatus(projectId)
  const userEmail = useBibleUserEmail()
  const lastSavedPlan = useBiblePlanSync(storyPlan, isEditing, setLocalPlan)

  const pendingActions = externalPendingActions ?? internalPendingActions
  const setPendingAction = useCallback(
    (section: string, action: PendingAction | null) => {
      if (onSetPendingAction) {
        onSetPendingAction(section, action)
        return
      }
      setInternalPendingActions(prev => {
        if (action === null) {
          const { [section]: _, ...rest } = prev
          return rest
        }
        return { ...prev, [section]: action }
      })
    },
    [onSetPendingAction]
  )

  const canEdit = canEditBible(userEmail, isLocked)
  const effectiveReadOnly = isReadOnly || !canEdit

  const savePlan = useCallback(async () => {
    if (!onUpdate) return
    lastSavedPlan.current = JSON.stringify(localPlan)
    await onUpdate(localPlan)
    setIsEditing(false)
    toast.success(BIBLE_CONTEXT_TOAST_UPDATED)
  }, [localPlan, onUpdate, lastSavedPlan])

  const cancelEdit = useCallback(() => {
    setLocalPlan(storyPlan)
    setIsEditing(false)
  }, [storyPlan])

  const toggleLock = useCallback(async () => {
    if (!projectId || !userEmail) return
    setIsLockLoading(true)
    try {
      const action = isLocked ? BibleLockAction.Unlock : BibleLockAction.Lock
      const data = await postStorytellerBibleLock({ projectId, action, userEmail })
      clearFetchCache(`${BIBLE_CONTEXT_LOCK_CACHE_PREFIX}${projectId}`)
      setIsLocked(data.isLocked)
      setLockedBy(data.lockedBy)
      setLockedAt(data.lockedAt ? new Date(data.lockedAt) : null)
      toast.success(data.isLocked ? BIBLE_CONTEXT_TOAST_LOCKED : BIBLE_CONTEXT_TOAST_UNLOCKED)
    } catch (_error) {
      toast.error(BIBLE_CONTEXT_TOAST_LOCK_FAILED)
    } finally {
      setIsLockLoading(false)
    }
  }, [isLocked, projectId, userEmail, setIsLocked, setLockedBy, setLockedAt])

  const updateLocalPlan = useCallback((updates: Partial<StoryPlan>) => {
    setLocalPlan(prev => ({ ...prev, ...updates }))
  }, [])

  const mutations = useBiblePlanMutations(setLocalPlan)

  const value: BibleContextType = useMemo(
    () => ({
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
      ...mutations,
    }),
    [
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
      mutations,
    ]
  )

  return <BibleContext.Provider value={value}>{children}</BibleContext.Provider>
}

export const useBible = () => {
  const context = useContext(BibleContext)
  if (context === undefined) {
    throw new Error(BIBLE_CONTEXT_HOOK_ERROR)
  }
  return context
}

export const useOptionalBible = () => useContext(BibleContext)
