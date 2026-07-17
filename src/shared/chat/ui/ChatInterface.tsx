'use client'

import React from 'react'
import { AgentLog } from './AgentLog'
import { ChatInput } from './ChatInput'
import {
  Message,
  AgentConfigMap,
  AgentQuestion,
  ThinkingMessagesConfig,
  type AgentAction,
} from '../core/types'
import { MentionProvider, ProjectContext, type MentionItem } from '../core/mentions/types'
import { ChatEvalResultsPanel } from './components/ChatEvalResultsPanel'
import { ChatInterfaceHeader } from './components/ChatInterfaceHeader'
import { useChatEvalMode } from './hooks/useChatEvalMode'

interface ChatInterfaceProps {
  title?: string
  messages: Message[]
  agentConfig: AgentConfigMap
  onSendMessage: (message: string) => void
  onStopStream?: () => void
  onQuestionAnswer?: (questionId: string, answer: string | string[]) => void
  onQuestionSkip?: (questionId: string) => void
  onApproveAllActions?: (messageIndex: number) => void
  isSending: boolean
  showThinking?: boolean
  isActivityPanelOpen?: boolean
  onActivityToggle?: () => void
  children?: React.ReactNode
  headerContent?: React.ReactNode
  mentions?: MentionItem[]
  mentionProviders?: MentionProvider[]
  projectContext?: ProjectContext
  thinkingAgent?: string | null
  thinkingMessagesConfig?: ThinkingMessagesConfig
  streamingTokens?: string
  isAdmin?: boolean
  currentPhase?: string
  activeOperations?: Array<{
    id: string
    type: string
    label: string
    startTime?: number
    tool?: string
  }>
  projectId?: string
  ActionComponent?: React.ComponentType<{
    action: AgentAction
    agentName: string
    messageIndex: number
    actionIndex: number
  }>
  QuestionComponent?: React.ComponentType<{
    question: AgentQuestion
    onAnswer: (a: string | string[]) => void
    onSkip?: () => void
  }>
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  title,
  messages,
  agentConfig,
  onSendMessage,
  onStopStream,
  onQuestionAnswer,
  onQuestionSkip,
  onApproveAllActions,
  isSending,
  showThinking = false,
  isActivityPanelOpen = false,
  onActivityToggle,
  children,
  headerContent,
  mentions = [],
  mentionProviders,
  projectContext,
  thinkingAgent,
  thinkingMessagesConfig,
  streamingTokens,
  isAdmin = false,
  currentPhase,
  activeOperations = [],
  ActionComponent,
  QuestionComponent,
  projectId,
}) => {
  const { isEvalEnabled, isEvaluating, evalResult, runEvaluation, dismissEvalResult } =
    useChatEvalMode(isAdmin, messages)

  return (
    <div className="flex flex-col h-full bg-background border-l border-border/50">
      <ChatInterfaceHeader
        title={title}
        headerContent={headerContent}
        isActivityPanelOpen={isActivityPanelOpen}
        onActivityToggle={onActivityToggle}
        isEvalEnabled={isEvalEnabled}
        isEvaluating={isEvaluating}
        evalResult={evalResult}
        onRunEvaluation={runEvaluation}
        messageCount={messages.length}
      />

      {isEvalEnabled && evalResult && (
        <ChatEvalResultsPanel evalResult={evalResult} onDismiss={dismissEvalResult} />
      )}

      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 p-3 pb-0 flex flex-col overflow-y-auto">
          <AgentLog
            messages={messages}
            agentConfig={agentConfig}
            onQuestionAnswer={onQuestionAnswer}
            onQuestionSkip={onQuestionSkip}
            onApproveAllActions={onApproveAllActions}
            showThinking={showThinking}
            isActivityPanelOpen={isActivityPanelOpen}
            isSending={isSending}
            thinkingAgent={thinkingAgent}
            thinkingMessagesConfig={thinkingMessagesConfig}
            streamingTokens={streamingTokens}
            currentPhase={currentPhase}
            activeOperations={activeOperations}
            ActionComponent={ActionComponent}
            QuestionComponent={QuestionComponent}
            projectId={projectId}
          >
            {children}
          </AgentLog>
        </div>
      </div>

      <ChatInput
        onSend={onSendMessage}
        onStop={onStopStream}
        isSending={isSending}
        mentions={mentions}
        mentionProviders={mentionProviders}
        projectContext={projectContext}
      />
    </div>
  )
}
