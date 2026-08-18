import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { StoryPlan } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import {
  BIBLE_CONTEXT_HOOK_ERROR,
  BIBLE_CONTEXT_LOG_PARENT_CAUGHT_UP,
  BIBLE_CONTEXT_TOAST_UPDATED,
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
  const [internalPendingActions, setInternalPendingActions] = useState<
    Record<string, PendingAction>
  >({})

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

  const effectiveReadOnly = isReadOnly

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
      ...mutations,
    }),
    [
      storyPlan,
      localPlan,
      isEditing,
      effectiveReadOnly,
      projectId,
      onSendMessage,
      getProviderConfig,
      loadingSections,
      pendingActions,
      setPendingAction,
      updateLocalPlan,
      savePlan,
      cancelEdit,
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
