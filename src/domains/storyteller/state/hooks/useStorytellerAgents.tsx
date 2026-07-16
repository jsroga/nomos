'use client'

import { useCallback, useMemo, type ComponentType } from 'react'
import type { AgentQuestion as ChatAgentQuestion } from '@/shared/chat/core/types'
import type { AgentQuestion as StorytellerAgentQuestion } from '@/domains/storyteller/core/types/action-types'
import { QuestionType, QuestionUrgency } from '@/domains/storyteller/core/types/enums'
import type { StoryPlan } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import { applyUpdatesToStoryPlan } from '@/domains/storyteller/config/action-config'
import { toError } from '@/shared/errors/error-utils'
import { recordFromJson, readNumber } from '@/shared/data/json-guards'
import { useWorldStore } from '@/domains/world-building-toolkit'
import { type Message } from '@/shared/chat'
import { QuestionCard } from '@/domains/storyteller/ui/StorytellerLayout/storyteller-dynamic-imports'
import {
  StorytellerLogMessage,
  StorytellerMessageRole,
  StorytellerMessageType,
  StorytellerPremiseSection,
  StorytellerPremiseSectionLabel,
  StorytellerStreamMode,
  StorytellerThreadId,
  StorytellerQuestionFallback,
  StorytellerAnswerSeparator,
  StorytellerWorldBuildingPhase,
  StorytellerDefaultTitle,
  StorytellerQueryParam,
  StorytellerBibleQuery,
} from '@/domains/storyteller/core/storyteller-page-wire'
import { postStorytellerChatStream } from '@/domains/storyteller/core/io/chat.api'
import { Phase } from '@/domains/storyteller/core/types/enums'
import { MoodboardFieldAlias } from '@/domains/storyteller/config/constants/bible-wire-fields'
import {
  patchStorytellerEpisode,
  patchStorytellerProject,
} from '@/domains/storyteller/core/io/storyteller.api'
import {
  StorytellerAgentTriggerPrompt,
  StorytellerToastId,
} from '@/domains/storyteller/state/constants/agent-trigger-prompts'
import { DomExceptionName } from '@/shared/chat/core/constants/chat-stream'
import { QuestionUrgency as ChatQuestionUrgency } from '@/shared/chat/core/constants/chat-messages'
import type { StorytellerWorkspaceCore } from './useStorytellerPageBase'
import type { useStorytellerChat } from './useStorytellerChat'

type ChatSlice = ReturnType<typeof useStorytellerChat>

function premiseSectionLabel(section: string | null | undefined): string {
  if (section === StorytellerPremiseSection.ProtagonistHook) {
    return StorytellerPremiseSectionLabel.ProtagonistHook
  }
  if (section === StorytellerPremiseSection.FatalFlaw) {
    return StorytellerPremiseSectionLabel.FatalFlaw
  }
  if (section === StorytellerPremiseSection.InevitableConsequence) {
    return StorytellerPremiseSectionLabel.InevitableConsequence
  }
  return section ?? ''
}

export function useStorytellerAgents(core: StorytellerWorkspaceCore, chat: ChatSlice) {
  const {
    currentProject,
    currentEpisodeId,
    characters,
    pendingQuestions,
    setPendingQuestions,
    storyDecisions,
    setStoryDecisions,
    setStoryPlan,
    currentPhase,
    storyPlan,
    useEnhancedStreaming,
    loadingStates,
    searchParams,
    router,
    setIsActivityPanelOpen,
    setFocusEntityId,
    handleDismissToast,
    setAnsweredQuestions,
    executeAction,
    setGeneratingSection,
  } = core

  const {
    setMessages,
    setIsSending,
    setIsAwaitingInput,
    processStream,
    abortControllerRef,
    roundCount,
    handleSendMessage,
  } = chat

  // Handle question answers
  const handleQuestionAnswer = useCallback(
    async (questionId: string, answer: string | string[]) => {
      // Find the question being answered
      const questionSession = pendingQuestions.find(q => q.id === questionId)
      const questionText = questionSession?.question.question || StorytellerQuestionFallback.UnknownQuestion

      // Remove the question from pending
      setPendingQuestions(prev => prev.filter(q => q.id !== questionId))
      setIsAwaitingInput(false)

      // Track the answer
      const answerText = Array.isArray(answer) ? answer.join(StorytellerAnswerSeparator.CommaSpace) : answer
      setAnsweredQuestions(prev => [...prev, { question: questionText, answer: answerText }])

      // Store as a story decision (key = simplified question)
      const decisionKey = questionText
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .slice(0, 50)
      setStoryDecisions(prev => ({ ...prev, [decisionKey]: answerText }))

      // Add user answer as message with context
      const userMsg: Message = {
        sender: StorytellerMessageRole.User,
        content: `**Answer to "${questionText}":** ${answerText}\n\nPlease proceed with the story based on this decision.`,
        type: StorytellerMessageType.Human,
      }
      setMessages(prev => [...prev, userMsg])

      // Continue the conversation with the answer and context of previous decisions
      setIsSending(true)

      // Build context of all decisions made
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
        currentPhase, // Include current phase!
        seriesBible: {
          ...(currentProject?.series_bible ?? {}),
          // Include answered decisions in series bible
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
        // Enhanced streaming options
        streamMode: useEnhancedStreaming ? StorytellerStreamMode.Events : StorytellerStreamMode.Nodes,
      }

      // Create abort controller
      abortControllerRef.current = new AbortController()

      try {
        const res = await postStorytellerChatStream(payload, {
          signal: abortControllerRef.current.signal,
        })
        // Continue with current round count since we're resuming
        await processStream(res, abortControllerRef.current.signal, roundCount)
      } catch (error: unknown) {
        if (toError(error).name !== DomExceptionName.AbortError) {
          console.error(StorytellerLogMessage.FailedContinueAfterAnswer, error)
        }
      }
      // Note: thinkingAgent is managed by useChatStream and will reset when stream completes
    },
    [
      currentProject,
      currentEpisodeId,
      characters,
      pendingQuestions,
      storyDecisions,
      executeAction,
      roundCount,
      currentPhase,
      useEnhancedStreaming,
    ]
  )

  // Agent triggers from UI (premise generation, section regen, roadmap)
  const runAgentStream = useCallback(
    async (
      userContent: string,
      agentMessage: string,
      phase: string,
      scope: { threadId?: string; episodeId?: string | null } = {}
    ) => {
      const userMsg: Message = {
        sender: StorytellerMessageRole.User,
        content: userContent,
        type: StorytellerMessageType.Human,
      }
      setMessages(prev => [...prev, userMsg])
      setIsSending(true)

      const threadId = scope.threadId ?? currentEpisodeId ?? StorytellerThreadId.General
      const episodeId = scope.episodeId !== undefined ? scope.episodeId : currentEpisodeId

      const payload = {
        message: agentMessage,
        projectId: currentProject?.id,
        threadId,
        episodeId,
        currentPhase: phase,
        seriesBible: {
          ...(currentProject?.series_bible ?? {}),
          masterPrompt: currentProject?.master_prompt || '',
        },
        characters,
        streamMode: StorytellerStreamMode.Events,
        progressiveGeneration: true,
      }

      abortControllerRef.current = new AbortController()

      try {
        const res = await postStorytellerChatStream(payload, {
          signal: abortControllerRef.current.signal,
        })
        await processStream(res, abortControllerRef.current.signal)
      } catch (err) {
        console.error(StorytellerLogMessage.TriggerError, err)
      }
    },
    [characters, currentEpisodeId, currentProject, processStream, setIsSending, setMessages]
  )

  const generateEpisodePremise = useCallback(() => {
    void runAgentStream(
      StorytellerAgentTriggerPrompt.GenerateEpisodePremiseUser,
      StorytellerAgentTriggerPrompt.GenerateEpisodePremiseAgent,
      Phase.PREMISE
    )
  }, [runAgentStream])

  const generateEpisodePremiseSection = useCallback(
    (section: string) => {
      setGeneratingSection(section)
      const readableSection = premiseSectionLabel(section)

      void runAgentStream(
        `${StorytellerAgentTriggerPrompt.RegeneratePremiseSectionUserPrefix}${readableSection}${StorytellerAgentTriggerPrompt.RegeneratePremiseSectionUserSuffix}`,
        `${StorytellerAgentTriggerPrompt.RegeneratePremiseSectionAgentPrefix}${readableSection}${StorytellerAgentTriggerPrompt.RegeneratePremiseSectionAgentMid}${section}${StorytellerAgentTriggerPrompt.RegeneratePremiseSectionAgentSuffix}`,
        Phase.PREMISE
      )
    },
    [runAgentStream, setGeneratingSection]
  )

  const generateRoadmap = useCallback(() => {
    void runAgentStream(
      StorytellerAgentTriggerPrompt.GenerateRoadmapUser,
      StorytellerAgentTriggerPrompt.GenerateRoadmapAgent,
      StorytellerWorldBuildingPhase.WorldBuilding,
      { threadId: StorytellerThreadId.General, episodeId: null }
    )
  }, [runAgentStream])

  // handleDismissToast provided by useStorytellerActions hook

  const handleSaveProjectPrompt = useCallback(
    async (prompt: string) => {
      if (!currentProject?.id) return
      try {
        await patchStorytellerProject(currentProject.id, { masterPrompt: prompt })
        if (currentProject) {
          useWorldStore.getState().setCurrentProject({
            ...currentProject,
            master_prompt: prompt,
          })
        }
      } catch (err) {
        console.error(StorytellerLogMessage.FailedSaveMasterPrompt, err)
      }
    },
    [currentProject]
  )

  const handleSaveEpisodePrompt = useCallback(
    async (prompt: string) => {
      if (!currentEpisodeId) return

      try {
        await patchStorytellerEpisode(currentEpisodeId, {
          episode_prompt: prompt,
        })

        // Dismiss toast if this was from a suggestion
        handleDismissToast(StorytellerToastId.EpisodePromptSuggestion)
      } catch (err) {
        console.error(StorytellerLogMessage.FailedSaveEpisodePrompt, err)
      }
    },
    [currentEpisodeId, handleDismissToast]
  )

  const handleQuestionSkip = useCallback(
    (questionId: string) => {
      setPendingQuestions(prev => prev.filter(q => q.id !== questionId))
      if (pendingQuestions.length <= 1) {
        setIsAwaitingInput(false)
      }
    },
    [pendingQuestions.length]
  )

  // Legacy processStream removed (handled by hook)

  const handleUpdateGlobalBible = useCallback(
    async (updates: Partial<StoryPlan>) => {
      setIsSending(true)
      try {
        // Access latest state directly to avoid dependency on currentProject changing
        const latestProject = useWorldStore.getState().currentProject
        if (!latestProject?.id) return

        const updateKeys = Object.keys(updates)
        const isMoodImagesOnly =
          updateKeys.length === 1 && updateKeys[0] === MoodboardFieldAlias.MoodImages

        if (isMoodImagesOnly) {
          // Refetch-after-delete path: only merge moodImages into state/store and persist a merge-only PATCH so we never overwrite the rest of the bible/plan
          const newMoodImages = updates.moodImages
          if (!currentEpisodeId) {
            setStoryPlan(prev => (prev ? { ...prev, moodImages: newMoodImages ?? prev.moodImages } : prev))
          }
          useWorldStore.getState().setCurrentProject({
            ...latestProject,
            series_bible: {
              ...(latestProject.series_bible ?? {}),
              moodImages: newMoodImages,
            },
          })
          await patchStorytellerProject(latestProject.id, {
            seriesBible: { moodImages: newMoodImages },
            storyPlan: { moodImages: newMoodImages },
          })
        } else {
          // Full replace path
          const currentBible = latestProject.series_bible ?? {}
          const newBible = { ...currentBible, ...updates }
          useWorldStore.getState().setCurrentProject({
            ...latestProject,
            series_bible: newBible,
          })
          if (!currentEpisodeId) {
            setStoryPlan(prev => applyUpdatesToStoryPlan(prev, updates))
          }
          await patchStorytellerProject(latestProject.id, {
            series_bible: newBible,
            story_plan: newBible,
          })
        }
      } catch (e) {
        console.error(StorytellerLogMessage.FailedSaveGlobalBible, e)
      } finally {
        setIsSending(false)
      }
    },
    [currentEpisodeId]
  )

  const handleUpdateBible = async (updates: Partial<StoryPlan>) => {
    setIsSending(true)
    try {
      setStoryPlan(prev =>
        prev
          ? { ...prev, ...updates }
          : applyUpdatesToStoryPlan<StoryPlan>(null, updates)
      )

      if (!currentProject?.id) return

      const mergedBible = { ...(currentProject.series_bible ?? {}), ...updates }
      useWorldStore.getState().setCurrentProject({
        ...currentProject,
        series_bible: mergedBible,
      })

      await patchStorytellerProject(currentProject.id, {
        series_bible: mergedBible,
        story_plan: mergedBible,
      })
    } catch (e) {
      console.error(StorytellerLogMessage.FailedSaveBible, e)
      // Optionally revert? For now we trust optimistic update.
    } finally {
      setIsSending(false)
    }
  }

  const handleBibleSendMessage = useCallback(
    (msg: string, section?: string) => handleSendMessage(undefined, msg, section),
    [handleSendMessage]
  )

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

  const worldBiblePanelStoryPlan = useMemo(
    () =>
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
      }),
    [currentProject?.name, storyPlan]
  )

  const closeWorldBiblePanel = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set(StorytellerQueryParam.Bible, StorytellerBibleQuery.Off)
    router.push(`?${params.toString()}`)
  }, [router, searchParams])

  const toggleActivityPanel = useCallback(() => {
    setIsActivityPanelOpen(prev => !prev)
  }, [])

  const chatActiveOperations = useMemo(
    () =>
      loadingStates.operations.map(op => ({
        id: op.id,
        type: op.section,
        label: op.label,
        startTime: op.startTime,
        tool: op.details,
      })),
    [loadingStates.operations]
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

  const handleCharacterWebNodeClick = useCallback((nodeId: string, type: unknown) => {
    console.log(StorytellerLogMessage.CharacterWebNodeClicked, nodeId, type)
    setFocusEntityId(null)
  }, [])

  return {
    handleQuestionAnswer,
    handleQuestionSkip,
    handleSaveProjectPrompt,
    handleSaveEpisodePrompt,
    handleUpdateGlobalBible,
    handleUpdateBible,
    handleBibleSendMessage,
    StableQuestionComponent,
    worldBiblePanelStoryPlan,
    closeWorldBiblePanel,
    toggleActivityPanel,
    chatActiveOperations,
    handleChatSendMessage,
    handleChatQuestionAnswer,
    handleChatQuestionSkip,
    handleCharacterWebNodeClick,
    generateEpisodePremise,
    generateEpisodePremiseSection,
    generateRoadmap,
  }
}
