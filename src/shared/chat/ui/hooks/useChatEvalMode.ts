'use client'

import { useState, useEffect, useCallback } from 'react'
import { Message } from '../../core/types'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import { browserStorage } from '@/shared/data/browser-storage'
import {
  BrowserStorageEventName,
  CHAT_DEBUG_ADMIN_PIN,
  CHAT_EVAL_CONSOLE_PREFIX,
  CHAT_EVAL_FAILED_ERROR,
  CHAT_EVAL_FAILED_FEEDBACK,
  CHAT_EVAL_MODE_STORAGE_KEY,
  ChatEvalLocalValue,
  ChatMessageType,
  LlmJudgeCriterion,
  LlmJudgeRole,
} from '../constants/chat-interface'
import { evaluateChatConversation } from '../../core/io/chat-ui.api'

export interface ChatEvalResult {
  score: number
  feedback: string
  criteria: Record<string, { score: number; comment: string }>
}

export function useChatEvalMode(isAdmin: boolean, messages: Message[]) {
  const [isEvalEnabled, setIsEvalEnabled] = useState(isAdmin)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [evalResult, setEvalResult] = useState<ChatEvalResult | null>(null)

  useEffect(() => {
    const checkEvalMode = () => {
      if (typeof window !== 'undefined') {
        const evalKey = browserStorage.getString(CHAT_EVAL_MODE_STORAGE_KEY)
        const debugKey = browserStorage.getString(LocalStorageKeys.DEBUG_MODE)
        setIsEvalEnabled(
          isAdmin ||
            evalKey === ChatEvalLocalValue.Enabled ||
            evalKey === ChatEvalLocalValue.EnabledNumeric ||
            debugKey === CHAT_DEBUG_ADMIN_PIN
        )
      }
    }
    checkEvalMode()
    window.addEventListener(BrowserStorageEventName.Storage, checkEvalMode)
    return () => window.removeEventListener(BrowserStorageEventName.Storage, checkEvalMode)
  }, [isAdmin])

  const runEvaluation = useCallback(async () => {
    if (messages.length === 0) return

    setIsEvaluating(true)
    setEvalResult(null)

    try {
      const result = await evaluateChatConversation({
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
      })
      if (!result.feedback && result.score === 0) {
        throw new Error(CHAT_EVAL_FAILED_ERROR)
      }
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

  const dismissEvalResult = useCallback(() => {
    setEvalResult(null)
  }, [])

  return {
    isEvalEnabled,
    isEvaluating,
    evalResult,
    runEvaluation,
    dismissEvalResult,
  }
}
