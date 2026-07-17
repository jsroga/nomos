import type { AgentAction, ActionStatus, Message, ActionMessageLocation } from '../core/types'
import {
  USE_CHAT_STREAM_LOG_UPDATE_ACTION_BY_ID,
  USE_CHAT_STREAM_LOG_UPDATE_ACTION_STATUS,
  USE_CHAT_STREAM_LOG_UPDATE_ACTION_STATUS_RESULT,
} from './constants/use-chat-stream-log'
import { CHAT_DEBUG_ENABLED } from '../core/constants/chat-stream'
import type { Dispatch, SetStateAction } from 'react'

const CHAT_DEBUG = process.env.NEXT_PUBLIC_CHAT_DEBUG === CHAT_DEBUG_ENABLED

export function updateActionStatusInMessages(
  setMessagesInternal: Dispatch<SetStateAction<Message[]>>,
  messageIndex: number,
  actionIndex: number,
  newStatus: ActionStatus
): void {
  console.log(
    `${USE_CHAT_STREAM_LOG_UPDATE_ACTION_STATUS}[${messageIndex}].actions[${actionIndex}].status = ${newStatus}`
  )
  setMessagesInternal(prev => {
    const newMessages = prev.map((msg, mIdx) => {
      if (mIdx !== messageIndex || !msg.actions) return msg
      return {
        ...msg,
        actions: msg.actions.map((action, aIdx) =>
          aIdx === actionIndex ? { ...action, status: newStatus } : action
        ),
      }
    })
    console.log(
      USE_CHAT_STREAM_LOG_UPDATE_ACTION_STATUS_RESULT,
      newMessages[messageIndex]?.actions?.[actionIndex]?.status
    )
    return newMessages
  })
}

export function updateActionStatusByIdInMessages(
  setMessagesInternal: Dispatch<SetStateAction<Message[]>>,
  actionId: string,
  newStatus: ActionStatus
): void {
  if (CHAT_DEBUG) {
    console.log(`${USE_CHAT_STREAM_LOG_UPDATE_ACTION_BY_ID} ${actionId} status = ${newStatus}`)
  }
  setMessagesInternal(prev =>
    prev.map(msg => {
      if (!msg.actions) return msg
      const actionIndex = msg.actions.findIndex(a => a.id === actionId)
      if (actionIndex === -1) return msg

      return {
        ...msg,
        actions: msg.actions.map((a, idx) =>
          idx === actionIndex ? { ...a, status: newStatus } : a
        ),
      }
    })
  )
}

export function syncActionStatusInMessages(
  action: AgentAction,
  newStatus: ActionStatus,
  location: ActionMessageLocation | undefined,
  updateById: (actionId: string, status: ActionStatus) => void,
  updateByIndex: (messageIndex: number, actionIndex: number, status: ActionStatus) => void
): void {
  if (action.id) {
    updateById(action.id, newStatus)
  } else if (location) {
    updateByIndex(location.messageIndex, location.actionIndex, newStatus)
  }
}
