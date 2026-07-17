'use client'

import React from 'react'
import type { AgentConfigMap } from '../../core/types'
import { MessageGroupType } from '../constants/agent-log'
import type {
  AgentLogActionComponent,
  AgentLogQuestionComponent,
  GroupedMessage,
} from '../utils/agent-log-group-types'
import { AgentLogMessageGroup } from './AgentLogMessageGroup'
import { DelegationChain } from './DelegationChain'

interface AgentLogGroupItemProps {
  group: GroupedMessage
  groupIdx: number
  totalGroups: number
  isActivityPanelOpen: boolean
  isSending: boolean
  showThinking: boolean
  agentConfig: AgentConfigMap
  projectId?: string
  ActionComponent?: AgentLogActionComponent
  QuestionComponent?: AgentLogQuestionComponent
  onQuestionAnswer?: (questionId: string, answer: string | string[]) => void
  onQuestionSkip?: (questionId: string) => void
  onApproveAllActions?: (messageIndex: number) => void
}

export const AgentLogGroupItem: React.FC<AgentLogGroupItemProps> = ({
  group,
  groupIdx,
  totalGroups,
  isActivityPanelOpen,
  isSending,
  showThinking,
  agentConfig,
  projectId,
  ActionComponent,
  QuestionComponent,
  onQuestionAnswer,
  onQuestionSkip,
  onApproveAllActions,
}) => {
  if (group.type === MessageGroupType.Delegation && !isActivityPanelOpen) {
    return null
  }

  if (group.type === MessageGroupType.Delegation) {
    const isLastGroup = groupIdx === totalGroups - 1
    const isCurrentlyWorking = isSending && isLastGroup
    return (
      <DelegationChain
        key={`delegation-${groupIdx}`}
        messages={group.messages}
        isComplete={!isCurrentlyWorking}
      />
    )
  }

  const msg = group.messages[0]
  if (!msg) return null

  return (
    <AgentLogMessageGroup
      key={groupIdx}
      msg={msg}
      messageIndex={group.originalIndices[0]}
      agentConfig={agentConfig}
      isActivityPanelOpen={isActivityPanelOpen}
      showThinking={showThinking}
      isSending={isSending}
      projectId={projectId}
      ActionComponent={ActionComponent}
      QuestionComponent={QuestionComponent}
      onQuestionAnswer={onQuestionAnswer}
      onQuestionSkip={onQuestionSkip}
      onApproveAllActions={onApproveAllActions}
    />
  )
}
