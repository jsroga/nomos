import { useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { AgentAction, ActionStatus, Message, ActionMessageLocation } from '../core/types'
import {
  syncActionStatusInMessages,
  updateActionStatusByIdInMessages,
  updateActionStatusInMessages,
} from './chat-stream-action-status'

export function useChatStreamActionCallbacks(
  setMessagesInternal: Dispatch<SetStateAction<Message[]>>
) {
  const updateActionStatus = useCallback(
    (messageIndex: number, actionIndex: number, newStatus: ActionStatus) => {
      updateActionStatusInMessages(setMessagesInternal, messageIndex, actionIndex, newStatus)
    },
    [setMessagesInternal]
  )

  const updateActionStatusById = useCallback(
    (actionId: string, newStatus: ActionStatus) => {
      updateActionStatusByIdInMessages(setMessagesInternal, actionId, newStatus)
    },
    [setMessagesInternal]
  )

  const syncActionStatus = useCallback(
    (action: AgentAction, newStatus: ActionStatus, location?: ActionMessageLocation) => {
      syncActionStatusInMessages(
        action,
        newStatus,
        location,
        updateActionStatusById,
        updateActionStatus
      )
    },
    [updateActionStatus, updateActionStatusById]
  )

  return { updateActionStatus, updateActionStatusById, syncActionStatus }
}
