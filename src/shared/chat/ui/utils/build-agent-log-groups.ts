import type { Message } from '../../core/types'
import { MessageGroupType } from '../constants/agent-log'
import { isDelegationMessage } from './agent-log-message-helpers'
import type { GroupedMessage } from './agent-log-group-types'

export function buildAgentLogGroups(messages: Message[]): GroupedMessage[] {
  const groups: GroupedMessage[] = []
  let currentDelegationChain: Message[] = []
  let currentDelegationIndices: number[] = []

  messages.forEach((msg, originalIndex) => {
    if (isDelegationMessage(msg)) {
      currentDelegationChain.push(msg)
      currentDelegationIndices.push(originalIndex)
      return
    }

    if (currentDelegationChain.length > 0) {
      groups.push({
        type: MessageGroupType.Delegation,
        messages: currentDelegationChain,
        originalIndices: currentDelegationIndices,
      })
      currentDelegationChain = []
      currentDelegationIndices = []
    }

    groups.push({
      type: MessageGroupType.Message,
      messages: [msg],
      originalIndices: [originalIndex],
    })
  })

  if (currentDelegationChain.length > 0) {
    groups.push({
      type: MessageGroupType.Delegation,
      messages: currentDelegationChain,
      originalIndices: currentDelegationIndices,
    })
  }

  return groups
}
