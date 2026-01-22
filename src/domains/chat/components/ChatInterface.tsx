'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { AgentLog } from './AgentLog'
import { ChatInput } from './ChatInput'
import { Message, AgentConfigMap, AgentQuestion, ThinkingMessagesConfig } from '../types'
import { Button } from '@/components/ui/button'
import { Activity } from 'lucide-react'
import { MentionProvider, ProjectContext } from '../mentions/types'

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
  children?: React.ReactNode // Extra UI to render inside (like toasts)
  headerContent?: React.ReactNode // Title/Controls
  /** Legacy: Direct mention items (backwards compatible) */
  mentions?: any[]
  /** New: Mention providers for domain-specific entities */
  mentionProviders?: MentionProvider[]
  /** New: Project context for mention providers */
  projectContext?: ProjectContext
  /** Current agent that's processing */
  thinkingAgent?: string | null
  /** Customizable thinking messages configuration */
  thinkingMessagesConfig?: ThinkingMessagesConfig

  // Custom renderers
  ActionComponent?: React.ComponentType<{
    action: any
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
  ActionComponent,
  QuestionComponent,
}) => {
  return (
    <div className="flex flex-col h-full bg-background border-l border-border/50">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-card/50 backdrop-blur-sm flex items-center justify-between sticky top-0 z-20 min-h-[56px]">
        {headerContent ? headerContent : <div />}

        {/* Activity Toggle with Title */}
        <div className="flex items-center gap-3">
          {title && (
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              {title}
            </span>
          )}
          {onActivityToggle && (
            <Button
              variant={isActivityPanelOpen ? 'secondary' : 'ghost'}
              size="sm"
              onClick={onActivityToggle}
              className="h-8 gap-2 text-xs font-medium border border-border/40"
              title={
                isActivityPanelOpen
                  ? 'Activity ON - showing technical details'
                  : 'Activity OFF - showing results only'
              }
            >
              <Activity
                size={14}
                className={isActivityPanelOpen ? 'text-primary' : 'text-muted-foreground'}
              />
              <span className={isActivityPanelOpen ? 'text-foreground' : 'text-muted-foreground'}>
                Activity {isActivityPanelOpen ? 'ON' : 'OFF'}
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* Messages Area */}
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
            ActionComponent={ActionComponent}
            QuestionComponent={QuestionComponent}
          >
            {/* Children injected into log flow (streaming tokens, sections, etc) */}
            {children}
          </AgentLog>
        </div>
      </div>

      {/* Input Area */}
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
