'use client'

import { useCallback, type ComponentType } from 'react'
import type { AgentQuestion as ChatAgentQuestion } from '@/shared/chat/core/types'
import type { AgentQuestion as StorytellerAgentQuestion } from '@/domains/storyteller/core/types/action-types'
import { QuestionType, QuestionUrgency } from '@/domains/storyteller/core/types/enums'
import { applyUpdatesToStoryPlan } from '@/domains/storyteller/config/action-config'
import { QuestionCard } from '@/domains/storyteller/ui/StorytellerLayout/storyteller-dynamic-imports'
import {
  StorytellerDefaultTitle,
  StorytellerLogMessage,
  StorytellerQueryParam,
  StorytellerBibleQuery,
  StorytellerMessageRole,
} from '@/domains/storyteller/core/storyteller-page-wire'
import { QuestionUrgency as ChatQuestionUrgency } from '@/shared/chat/core/constants/chat-messages'
import type { StorytellerWorkspaceCore } from './useStorytellerPageBase'
import type { useStorytellerChat } from './useStorytellerChat'
import { useStorytellerAgentQuestions } from './useStorytellerAgentQuestions'
import { useStorytellerAgentTriggers } from './useStorytellerAgentTriggers'
import { useStorytellerAgentBible } from './useStorytellerAgentBible'

type ChatSlice = ReturnType<typeof useStorytellerChat>

export function useStorytellerAgents(core: StorytellerWorkspaceCore, chat: ChatSlice) {
  const {
    currentProject,
    storyPlan,
    searchParams,
    router,
    setIsActivityPanelOpen,
    setFocusEntityId,
    loadingStates,
  } = core

  const { handleSendMessage } = chat

  const questionHandlers = useStorytellerAgentQuestions(core, chat)
  const triggerHandlers = useStorytellerAgentTriggers(core, chat)
  const bibleHandlers = useStorytellerAgentBible(core, chat)

  const chatQuestionToStoryteller = useCallback(
    (question: ChatAgentQuestion): StorytellerAgentQuestion => ({
      id: question.id,
      agentName: StorytellerMessageRole.Showrunner,
      question: question.question,
      questionType: question.options?.length
        ? QuestionType.SINGLE_CHOICE
        : QuestionType.FREE_TEXT,
      urgency:
        question.urgency === ChatQuestionUrgency.Blocking
          ? QuestionUrgency.BLOCKING
          : QuestionUrgency.OPTIONAL,
      options: question.options?.map((label, index) => ({
        id: String(index),
        label,
        value: label,
      })),
      context: question.context,
    }),
    []
  )

  const StableQuestionComponent = useCallback<
    ComponentType<{
      question: ChatAgentQuestion
      onAnswer: (a: string | string[]) => void
      onSkip?: () => void
    }>
  >(
    ({ question, onAnswer, onSkip }) => (
      <QuestionCard
        question={chatQuestionToStoryteller(question)}
        onAnswer={onAnswer}
        onSkip={onSkip ?? (() => undefined)}
      />
    ),
    [chatQuestionToStoryteller]
  )

  const worldBiblePanelStoryPlan =
    storyPlan ??
    applyUpdatesToStoryPlan(null, {
      title: currentProject?.name || StorytellerDefaultTitle.Untitled,
      genre: '',
      tone: '',
      centralQuestion: '',
      themes: [],
      worldRules: [],
      factions: [],
      moodImages: [],
    })

  const closeWorldBiblePanel = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set(StorytellerQueryParam.Bible, StorytellerBibleQuery.Off)
    router.push(`?${params.toString()}`)
  }, [router, searchParams])

  const toggleActivityPanel = useCallback(() => {
    setIsActivityPanelOpen(prev => !prev)
  }, [setIsActivityPanelOpen])

  const chatActiveOperations = loadingStates.operations.map(op => ({
    id: op.id,
    type: op.section,
    label: op.label,
    startTime: op.startTime,
    tool: op.details,
  }))

  const handleBibleSendMessage = useCallback(
    (msg: string, section?: string) => handleSendMessage(undefined, msg, section),
    [handleSendMessage]
  )

  const handleCharacterWebNodeClick = useCallback((nodeId: string, type: unknown) => {
    console.log(StorytellerLogMessage.CharacterWebNodeClicked, nodeId, type)
    setFocusEntityId(null)
  }, [setFocusEntityId])

  return {
    ...questionHandlers,
    ...triggerHandlers,
    ...bibleHandlers,
    handleBibleSendMessage,
    StableQuestionComponent,
    worldBiblePanelStoryPlan,
    closeWorldBiblePanel,
    toggleActivityPanel,
    chatActiveOperations,
    handleChatSendMessage: questionHandlers.handleChatSendMessage,
    handleChatQuestionAnswer: questionHandlers.handleChatQuestionAnswer,
    handleChatQuestionSkip: questionHandlers.handleChatQuestionSkip,
    handleCharacterWebNodeClick,
  }
}
