'use client'

import { useCallback, useEffect, useRef } from 'react'
import { toError } from '@/shared/errors/error-utils'
import { recordFromJson, readNumber } from '@/shared/data/json-guards'
import { type Message } from '@/shared/chat'
import {
  StorytellerLogMessage,
  StorytellerMessageRole,
  StorytellerMessageType,
  StorytellerThreadId,
  StorytellerQuestionFallback,
  StorytellerAnswerSeparator,
  StorytellerStreamMode,
} from '@/domains/storyteller/core/storyteller-page-wire'
import { postStorytellerChatStream } from '@/domains/storyteller/core/io/chat.api'
import { DomExceptionName } from '@/shared/chat/core/constants/chat-stream'
import type { StorytellerWorkspaceCore } from './useStorytellerPageBase'
import type { useStorytellerChat } from './useStorytellerChat'

type ChatSlice = ReturnType<typeof useStorytellerChat>

export function useStorytellerAgentQuestions(core: StorytellerWorkspaceCore, chat: ChatSlice) {
  const {
    currentProject,
    currentEpisodeId,
    characters,
    pendingQuestions,
    setPendingQuestions,
    storyDecisions,
    setStoryDecisions,
    currentPhase,
    useEnhancedStreaming,
    setAnsweredQuestions,
  } = core

  const {
    setMessages,
    setIsSending,
    setIsAwaitingInput,
    processStream,
    roundCount,
    handleSendMessage,
  } = chat

  const sharedAbortRef = useRef(chat.abortControllerRef)
  useEffect(() => {
    sharedAbortRef.current = chat.abortControllerRef
  })

  const handleQuestionAnswer = useCallback(
    async (questionId: string, answer: string | string[]) => {
      const questionSession = pendingQuestions.find(q => q.id === questionId)
      const questionText = questionSession?.question.question || StorytellerQuestionFallback.UnknownQuestion

      setPendingQuestions(prev => prev.filter(q => q.id !== questionId))
      setIsAwaitingInput(false)

      const answerText = Array.isArray(answer) ? answer.join(StorytellerAnswerSeparator.CommaSpace) : answer
      setAnsweredQuestions(prev => [...prev, { question: questionText, answer: answerText }])

      const decisionKey = questionText
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .slice(0, 50)
      setStoryDecisions(prev => ({ ...prev, [decisionKey]: answerText }))

      const userMsg: Message = {
        sender: StorytellerMessageRole.User,
        content: `**Answer to "${questionText}":** ${answerText}\n\nPlease proceed with the story based on this decision.`,
        type: StorytellerMessageType.Human,
      }
      setMessages(prev => [...prev, userMsg])
      setIsSending(true)

      const decisionsContext = Object.entries({ ...storyDecisions, [decisionKey]: answerText })
        .map(([k, v]) => `- ${k}: ${v}`)
        .join('\n')

      const payload = {
        message: `User answered: "${answerText}" to the question "${questionText}".

IMPORTANT: This question has been answered. Do NOT ask this question again.

STORY DECISIONS MADE SO FAR:
${decisionsContext}

Please acknowledge this answer and MOVE FORWARD with the story. Propose the next beat or ask a NEW question about something else.`,
        projectId: currentProject?.id,
        threadId: currentEpisodeId || StorytellerThreadId.General,
        episodeId: currentEpisodeId,
        currentPhase,
        seriesBible: {
          ...(currentProject?.series_bible ?? {}),
          userDecisions: { ...storyDecisions, [decisionKey]: answerText },
          masterPrompt: currentProject?.master_prompt || '',
        },
        characters: characters.map(c => ({
          characterId: c.id,
          name: c.name,
          currentGoals: c.psychology?.goals || [],
          fears: c.psychology?.fears || [],
          selfDelusion: c.psychology?.selfDelusion || '',
          actualMotivation: c.psychology?.actualMotivation || '',
          transformationProgress: c.transformation || 0,
          knowledgeState: [],
          stressLevel: readNumber(recordFromJson(c).stress) ?? 30,
        })),
        streamMode: useEnhancedStreaming ? StorytellerStreamMode.Events : StorytellerStreamMode.Nodes,
      }

      const abortController = new AbortController()
      sharedAbortRef.current.current = abortController

      try {
        const res = await postStorytellerChatStream(payload, {
          signal: abortController.signal,
        })
        await processStream(res, abortController.signal, roundCount)
      } catch (error: unknown) {
        if (toError(error).name !== DomExceptionName.AbortError) {
          console.error(StorytellerLogMessage.FailedContinueAfterAnswer, error)
        }
      }
    },
    [
      currentProject,
      currentEpisodeId,
      characters,
      pendingQuestions,
      storyDecisions,
      roundCount,
      currentPhase,
      useEnhancedStreaming,
      setAnsweredQuestions,
      setIsAwaitingInput,
      setIsSending,
      setMessages,
      setPendingQuestions,
      setStoryDecisions,
      processStream,
    ]
  )

  const handleQuestionSkip = useCallback(
    (questionId: string) => {
      setPendingQuestions(prev => prev.filter(q => q.id !== questionId))
      if (pendingQuestions.length <= 1) {
        setIsAwaitingInput(false)
      }
    },
    [pendingQuestions.length, setIsAwaitingInput, setPendingQuestions]
  )

  const handleChatSendMessage = useCallback(
    (msg: string) => handleSendMessage(undefined, msg),
    [handleSendMessage]
  )

  const handleChatQuestionAnswer = useCallback(
    (id: string, answer: string | string[]) => handleQuestionAnswer(id, answer),
    [handleQuestionAnswer]
  )

  const handleChatQuestionSkip = useCallback(
    (id: string) => handleQuestionSkip(id),
    [handleQuestionSkip]
  )

  return {
    handleQuestionAnswer,
    handleQuestionSkip,
    handleChatSendMessage,
    handleChatQuestionAnswer,
    handleChatQuestionSkip,
  }
}
