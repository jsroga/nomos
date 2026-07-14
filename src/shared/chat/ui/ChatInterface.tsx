'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { AgentLog } from './AgentLog'
import { ChatInput } from './ChatInput'
import { Message, AgentConfigMap, AgentQuestion, ThinkingMessagesConfig } from '../core/types'
import { Button } from '@/components/Button'
import { Activity, FlaskConical, Loader2 } from 'lucide-react'
import { MentionProvider, ProjectContext } from '../core/mentions/types'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import {
  BrowserStorageEventName,
  CHAT_DEBUG_ADMIN_PIN,
  CHAT_EVAL_CONSOLE_PREFIX,
  CHAT_EVAL_FAILED_ERROR,
  CHAT_EVAL_FAILED_FEEDBACK,
  CHAT_EVAL_MODE_STORAGE_KEY,
  CHAT_LLM_JUDGE_API_PATH,
  ChatEvalLocalValue,
  ChatFetchMethod,
  ChatMessageType,
  LlmJudgeCriterion,
  LlmJudgeRole,
} from './constants/chat-interface'

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
  /** Real-time streaming tokens for activity visualization */
  streamingTokens?: string
  /** Admin mode - enables eval button without magic key */
  isAdmin?: boolean
  /** Current phase for activity display */
  currentPhase?: string
  /** Active operations for activity display */
  activeOperations?: Array<{
    id: string
    type: string
    label: string
    startTime?: number
    tool?: string
  }>
  /** Project ID for entity reference resolution */
  projectId?: string

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
  streamingTokens,
  isAdmin = false,
  currentPhase,
  activeOperations = [],
  ActionComponent,
  QuestionComponent,
  projectId,
}) => {
  // Eval mode state - admins always have access
  const [isEvalEnabled, setIsEvalEnabled] = useState(isAdmin)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [evalResult, setEvalResult] = useState<{
    score: number
    feedback: string
    criteria: Record<string, { score: number; comment: string }>
  } | null>(null)

  // Check localStorage for eval mode key OR admin status
  useEffect(() => {
    const checkEvalMode = () => {
      if (typeof window !== 'undefined') {
        const evalKey = localStorage.getItem(CHAT_EVAL_MODE_STORAGE_KEY)
        const debugKey = localStorage.getItem(LocalStorageKeys.DEBUG_MODE)
        setIsEvalEnabled(
          isAdmin ||
            evalKey === ChatEvalLocalValue.Enabled ||
            evalKey === ChatEvalLocalValue.EnabledNumeric ||
            debugKey === CHAT_DEBUG_ADMIN_PIN
        )
      }
    }
    checkEvalMode()
    // Listen for storage changes
    window.addEventListener(BrowserStorageEventName.Storage, checkEvalMode)
    return () => window.removeEventListener(BrowserStorageEventName.Storage, checkEvalMode)
  }, [isAdmin])

  // LLM-as-Judge evaluation function
  const runEvaluation = useCallback(async () => {
    if (messages.length === 0) return

    setIsEvaluating(true)
    setEvalResult(null)

    try {
      const response = await fetch(CHAT_LLM_JUDGE_API_PATH, {
        method: ChatFetchMethod.Post,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation: messages.map(m => ({
            role:
              m.type === ChatMessageType.Human ? LlmJudgeRole.User : LlmJudgeRole.Assistant,
            content: m.content,
            agentName: m.sender || m.name,
            thinking: m.thinking || m.additional_kwargs?.thinking,
          })),
          criteria: [
            LlmJudgeCriterion.NarrativeCoherence,
            LlmJudgeCriterion.CharacterConsistency,
            LlmJudgeCriterion.CreativeQuality,
            LlmJudgeCriterion.UserGoalAlignment,
            LlmJudgeCriterion.PacingAndStructure,
          ],
        }),
      })

      if (!response.ok) {
        throw new Error(CHAT_EVAL_FAILED_ERROR)
      }

      const result = await response.json()
      setEvalResult(result)
    } catch (error) {
      console.error(CHAT_EVAL_CONSOLE_PREFIX, error)
      setEvalResult({
        score: 0,
        feedback: CHAT_EVAL_FAILED_FEEDBACK,
        criteria: {},
      })
    } finally {
      setIsEvaluating(false)
    }
  }, [messages])

  return (
    <div className="flex flex-col h-full bg-background border-l border-border/50">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-card/50 backdrop-blur-sm flex items-center justify-between sticky top-0 z-20 min-h-[56px]">
        <div className="flex items-center gap-3">
          {headerContent}
          {title && (
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              {title}
            </span>
          )}
        </div>

        {/* Activity Toggle + Eval Button */}
        <div className="flex items-center gap-2">
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

          {/* Eval Button - Only visible when magic key is set */}
          {isEvalEnabled && (
            <Button
              variant={evalResult ? 'secondary' : 'ghost'}
              size="sm"
              onClick={runEvaluation}
              disabled={isEvaluating || messages.length === 0}
              className="group h-8 gap-2 text-xs font-medium text-purple-400 border border-purple-500/40 hover:bg-purple-500 hover:text-white hover:border-purple-500 transition-colors duration-200"
              title="Run LLM-as-Judge evaluation on this conversation"
            >
              {isEvaluating ? (
                <Loader2 size={14} className="animate-spin text-purple-400 group-hover:text-white transition-colors duration-200" />
              ) : (
                <FlaskConical size={14} className="text-purple-400 group-hover:text-white transition-colors duration-200" />
              )}
              <span className="text-purple-400 group-hover:text-white transition-colors duration-200">
                {isEvaluating
                  ? 'Evaluating...'
                  : evalResult
                    ? `Score: ${evalResult.score}/10`
                    : 'Eval'}
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* Eval Results Panel - Show when we have results */}
      {isEvalEnabled && evalResult && (
        <div className="px-4 py-3 border-b bg-purple-500/5 border-purple-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FlaskConical size={16} className="text-purple-400" />
              <span className="text-sm font-semibold text-purple-400">Mastra Scorer Evaluation</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEvalResult(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Dismiss
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="col-span-2 p-2 rounded bg-background/50 border border-border/30">
              <div className="font-medium text-foreground mb-1">
                Overall Score: {evalResult.score}/10
              </div>
              <p className="text-muted-foreground">{evalResult.feedback}</p>
            </div>
            {Object.entries(evalResult.criteria).map(([key, value]) => (
              <div key={key} className="p-2 rounded bg-background/30 border border-border/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium capitalize">{key.replace(/_/g, ' ')}</span>
                  <span
                    className={`font-mono ${value.score >= 7 ? 'text-green-400' : value.score >= 5 ? 'text-yellow-400' : 'text-red-400'}`}
                  >
                    {value.score}/10
                  </span>
                </div>
                <p className="text-muted-foreground text-[10px]">{value.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}

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
            streamingTokens={streamingTokens}
            currentPhase={currentPhase}
            activeOperations={activeOperations}
            ActionComponent={ActionComponent}
            QuestionComponent={QuestionComponent}
            projectId={projectId}
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
