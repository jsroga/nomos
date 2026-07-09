'use client'

import { useEffect, useCallback, useMemo, type ComponentType } from 'react'
import type { AgentQuestion as ChatAgentQuestion } from '@/domains/chat/core/types'
import type { AgentQuestion as StorytellerAgentQuestion } from '@/domains/storyteller/core/types/ActionTypes'
import { QuestionType, QuestionUrgency } from '@/domains/storyteller/core/types/Enums'
import type { StoryPlan } from '@/domains/storyteller/prompts/schemas/agent-schemas'
import { applyUpdatesToStoryPlan } from '@/domains/storyteller/config/action-config'
import { customEventDetailRecord, readString } from '@/shared/data/json-guards'
import { toError } from '@/shared/errors/error-utils'
import { recordFromJson, readNumber } from '@/shared/data/json-guards'
import { useWorldStore } from '@/domains/world-building-toolkit'
import { type Message } from '@/domains/chat'
import { QuestionCard } from '@/domains/storyteller/ui/StorytellerLayout/storyteller-dynamic-imports'
import type { StorytellerWorkspaceCore } from './useStorytellerPageBase'
import type { useStorytellerChat } from './useStorytellerChat'

type ChatSlice = ReturnType<typeof useStorytellerChat>

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
    setCurrentEpisodeTitle,
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
      const questionText = questionSession?.question.question || 'Unknown question'

      // Remove the question from pending
      setPendingQuestions(prev => prev.filter(q => q.id !== questionId))
      setIsAwaitingInput(false)

      // Track the answer
      const answerText = Array.isArray(answer) ? answer.join(', ') : answer
      setAnsweredQuestions(prev => [...prev, { question: questionText, answer: answerText }])

      // Store as a story decision (key = simplified question)
      const decisionKey = questionText
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .slice(0, 50)
      setStoryDecisions(prev => ({ ...prev, [decisionKey]: answerText }))

      // Add user answer as message with context
      const userMsg: Message = {
        sender: 'User',
        content: `**Answer to "${questionText}":** ${answerText}\n\nPlease proceed with the story based on this decision.`,
        type: 'human',
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
        threadId: currentEpisodeId || 'general',
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
        streamMode: useEnhancedStreaming ? 'events' : 'nodes',
      }

      // Create abort controller
      abortControllerRef.current = new AbortController()

      try {
        const res = await fetch('/api/storyteller/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: abortControllerRef.current.signal,
        })
        // Continue with current round count since we're resuming
        await processStream(res, abortControllerRef.current.signal, roundCount)
      } catch (error: unknown) {
        if (toError(error).name !== 'AbortError') {
          console.error('Failed to continue after answer:', error)
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

  // Listener for manual agent triggers from UI components
  useEffect(() => {
    const handleTrigger = (e: Event) => {
      const detail = customEventDetailRecord(e)
      if (detail?.type === 'generate_episode_premise') {
        const userMsg: Message = {
          sender: 'User',
          content: 'Please generate an episode premise using the Ozymandias framework.',
          type: 'human',
        }
        setMessages(prev => [...prev, userMsg])
        setIsSending(true)

        const payload = {
          message:
            'Please generate an episode premise using the Ozymandias framework. Delegate to the Episode Premise Architect.',
          projectId: currentProject?.id,
          threadId: currentEpisodeId || 'general',
          episodeId: currentEpisodeId,
          currentPhase: 'premise',
          seriesBible: {
            ...(currentProject?.series_bible ?? {}),
            masterPrompt: currentProject?.master_prompt || '',
          },
          characters: characters,
          streamMode: 'events', // Always use enhanced streaming for premise generation
          progressiveGeneration: true,
        }

        abortControllerRef.current = new AbortController()

        fetch('/api/storyteller/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: abortControllerRef.current.signal,
        })
          .then(res => processStream(res, abortControllerRef.current!.signal))
          .catch(err => console.error('Trigger error:', err))
      } else if (detail?.type === 'generate_episode_premise_section') {
        const sectionName = readString(detail.section)
        setGeneratingSection(sectionName ?? null)
        const readableSection =
          sectionName === 'protagonistHook'
            ? 'Protagonist Hook'
            : sectionName === 'fatalFlaw'
              ? 'Fatal Flaw'
              : sectionName === 'inevitableConsequence'
                ? 'Inevitable Consequence'
                : sectionName

        const userMsg: Message = {
          sender: 'User',
          content: `Please regenerate only the ${readableSection} of the episode premise.`,
          type: 'human',
        }
        setMessages(prev => [...prev, userMsg])
        setIsSending(true)

        const payload = {
          message: `Please regenerate ONLY the ${readableSection} (${sectionName}) for the episode premise. Return a JSON object containing ONLY this field. Do not include unchanged fields. Take a completely new, bold, and distinct creative direction. Do not just rephrase the previous version - give me a brand new idea. Delegate to the Episode Premise Architect.`,
          projectId: currentProject?.id,
          threadId: currentEpisodeId || 'general',
          episodeId: currentEpisodeId,
          currentPhase: 'premise',
          seriesBible: {
            ...(currentProject?.series_bible ?? {}),
            masterPrompt: currentProject?.master_prompt || '',
          },
          characters: characters,
          streamMode: 'events', // Always use enhanced streaming for premise generation
          progressiveGeneration: true,
        }

        abortControllerRef.current = new AbortController()

        fetch('/api/storyteller/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: abortControllerRef.current.signal,
        })
          .then(res => processStream(res, abortControllerRef.current!.signal))
          .catch(err => console.error('Trigger error:', err))
      } else if (detail?.type === 'generate_roadmap') {
        const userMsg: Message = {
          sender: 'User',
          content: 'Please generate a detailed episode roadmap for the season.',
          type: 'human',
        }
        setMessages(prev => [...prev, userMsg])
        setIsSending(true)

        const payload = {
          message:
            'Generate a detailed episode roadmap for the season. Create distinct episodes with titles, summaries, key factions involved, and consequences. Delegate to the Story Architect.',
          projectId: currentProject?.id,
          threadId: 'general',
          episodeId: null,
          currentPhase: 'world_building',
          seriesBible: {
            ...(currentProject?.series_bible ?? {}),
            masterPrompt: currentProject?.master_prompt || '',
          },
          characters: characters,
          streamMode: 'events',
          progressiveGeneration: true,
        }

        abortControllerRef.current = new AbortController()

        fetch('/api/storyteller/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: abortControllerRef.current.signal,
        })
          .then(res => processStream(res, abortControllerRef.current!.signal))
          .catch(err => console.error('Trigger error:', err))
      }
    }
    const handleUpdateEpisodePremise = async (e: Event) => {
      const detail = customEventDetailRecord(e)
      if (Object.keys(detail).length === 0) return

      setStoryPlan(prev =>
        applyUpdatesToStoryPlan(prev, {
          premise: detail,
          title: readString(detail.title),
        })
      )

      const title = readString(detail.title)
      if (title) {
        setCurrentEpisodeTitle(title)
      }

      // 3. Persist
      if (currentEpisodeId) {
        try {
          await fetch(`/api/storyteller/episodes/${currentEpisodeId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              premise: detail,
              title: detail.title,
            }),
          })
        } catch (err) {
          console.error('Failed to persist premise update:', err)
        }
      }
    }

    window.addEventListener('trigger-agent-action', handleTrigger)
    window.addEventListener('update_episode_premise', handleUpdateEpisodePremise)

    return () => {
      window.removeEventListener('trigger-agent-action', handleTrigger)
      window.removeEventListener('update_episode_premise', handleUpdateEpisodePremise)
    }
  }, [currentProject?.id, currentEpisodeId, characters])

  // handleDismissToast provided by useStorytellerActions hook

  const handleSaveProjectPrompt = useCallback(
    async (prompt: string) => {
      try {
        const res = await fetch(`/api/storyteller/projects/${currentProject?.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ masterPrompt: prompt }),
        })
        if (res.ok && currentProject) {
          useWorldStore.getState().setCurrentProject({
            ...currentProject,
            master_prompt: prompt,
          })
        }
      } catch (err) {
        console.error('Failed to save master prompt:', err)
      }
    },
    [currentProject]
  )

  const handleSaveEpisodePrompt = useCallback(
    async (prompt: string) => {
      if (!currentEpisodeId) return

      try {
        await fetch(`/api/storyteller/episodes/${currentEpisodeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            episode_prompt: prompt,
          }),
        })

        // Dismiss toast if this was from a suggestion
        handleDismissToast('episode-prompt-suggestion')
      } catch (err) {
        console.error('Failed to save episode prompt:', err)
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
          updateKeys.length === 1 && updateKeys[0] === 'moodImages'

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
          await fetch(`/api/storyteller/projects/${latestProject.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              seriesBible: { moodImages: newMoodImages },
              storyPlan: { moodImages: newMoodImages },
            }),
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
          await fetch(`/api/storyteller/projects/${latestProject.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ series_bible: newBible, story_plan: newBible }),
          })
        }
      } catch (e) {
        console.error('Failed to save global bible:', e)
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
          : (applyUpdatesToStoryPlan(null, updates) as StoryPlan)
      )

      if (!currentProject?.id) return

      const mergedBible = { ...(currentProject.series_bible ?? {}), ...updates }
      useWorldStore.getState().setCurrentProject({
        ...currentProject,
        series_bible: mergedBible,
      })

      await fetch(`/api/storyteller/projects/${currentProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ series_bible: mergedBible, story_plan: mergedBible }),
      })
    } catch (e) {
      console.error('Failed to save bible:', e)
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
      agentName: 'Showrunner',
      question: question.question,
      questionType: question.options?.length
        ? QuestionType.SINGLE_CHOICE
        : QuestionType.FREE_TEXT,
      urgency:
        question.urgency === 'blocking' ? QuestionUrgency.BLOCKING : QuestionUrgency.OPTIONAL,
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
        title: currentProject?.name || 'Untitled',
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
    params.set('bible', 'off')
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
    console.log('Character web node clicked:', nodeId, type)
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
  }
}
