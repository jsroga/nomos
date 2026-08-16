'use client'

import { useCallback } from 'react'
import type { StreamAgentAction } from '@/domains/storyteller/core/types/action-types'
import {
  confirmNewCastMembers,
  type ConfirmNewCastInput,
} from '@/domains/storyteller/state/utils/confirm-new-cast-members'

export type { ConfirmNewCastInput }

interface ConfirmDialogOptions {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
}

interface UseConfirmNewCastMembersInput {
  characters: readonly { name: string; role?: string; description?: string }[]
  storyPlanRef: { current: unknown }
  executeAction: (action: StreamAgentAction) => Promise<unknown> | unknown
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>
}

export function useConfirmNewCastMembers(input: UseConfirmNewCastMembersInput) {
  const { characters, storyPlanRef, executeAction, confirm } = input

  return useCallback(
    async (payload: ConfirmNewCastInput) => {
      await confirmNewCastMembers({
        payload,
        characters,
        storyPlan: storyPlanRef.current,
        executeAction,
        confirm,
      })
    },
    [characters, confirm, executeAction, storyPlanRef],
  )
}
