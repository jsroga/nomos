'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useChatStream, type Message } from '@/shared/chat'
import { DEFAULT_CHAT_MODEL, getChatModelOption } from '@/domains/storyteller/config/constants/chat-model-catalog'
import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import { browserStorage } from '@/shared/data/browser-storage'
import { useStoryActionRenderer } from '@/domains/storyteller/ui/StorytellerLayout/StoryActionRenderer'
import {
  ChatMessageRole,
  STORYTELLER_CHAT_WELCOME_MESSAGE,
  StorytellerChatLog,
  StorytellerMessageRole,
  StorytellerMessageType,
  StorytellerStreamMode,
  StorytellerThreadId,
} from '@/domains/storyteller/state/constants/storyteller-chat'
import type { StorytellerWorkspaceCore } from './useStorytellerPageBase'
import { serializeChatMessage, type SerializedChatMessage } from '@/domains/storyteller/state/utils/storyteller-chat-serialize'
import { appendUniqueQuestionSession } from '@/domains/storyteller/state/utils/storyteller-chat-question'
import { handleStorytellerStreamingUpdate } from '@/domains/storyteller/state/utils/storyteller-chat-stream-update'
import { runStorytellerStreamAction } from '@/domains/storyteller/state/utils/storyteller-chat-stream-action'
import {
  buildCharactersSummary,
  resolveEffectivePhase,
} from '@/domains/storyteller/state/utils/storyteller-chat-send-helpers'

export function useStorytellerChat(core: StorytellerWorkspaceCore) {
  const {
    currentProject,
    currentEpisodeId,
    userEmail,
    isActivityPanelOpen,
    isWorldBibleOpen,
    activeTab,
    currentPhase,
    characters,
    setCharacters,
    storyPlan,
    storyDecisions,
    input,
    setInput,
    setPendingQuestions,
    setCurrentPhase,
    setActionHistory,
    setReviewModalAction,
    setSectionPendingActions,
    executeAction,
    getActionSection,
    undoStack,
    setUndoStack,
    setStoryPlan,
    useEnhancedStreaming,
    setGeneratingSection,
  } = core

  const {
    messages,
    setMessages,
    isSending,
    setIsSending,
    thinkingAgent,
    stopStream: handleStopStream,
    sendMessage,
    processStream,
    streamingTokens,
    streamingSections,
    isTokenStreaming,
    isAwaitingInput,
    setIsAwaitingInput,
    abortControllerRef,
    updateActionStatus,
    updateActionStatusById,
    syncActionStatus,
    loadingSections,
    setLoadingSections,
  } = useChatStream({
    resumeUrl: '/api/storyteller/workflow/resume',
    verboseUiEnabled: isActivityPanelOpen,
    persistKey: currentProject?.id
      ? `storyteller-${currentProject.id}-${currentEpisodeId || StorytellerThreadId.General}`
      : undefined,
    projectId: currentProject?.id,
    episodeId: currentEpisodeId || undefined,
    userId: userEmail || undefined,
    initialMessages: [
      {
        sender: StorytellerMessageRole.Showrunner,
        content: STORYTELLER_CHAT_WELCOME_MESSAGE,
        type: StorytellerMessageType.Ai,
      },
    ],
    onAction: async action => {
      runStorytellerStreamAction(
        {
          executeAction,
          syncActionStatus,
          setActionHistory,
          setSectionPendingActions,
          setReviewModalAction,
        },
        action
      )
    },
    onQuestion: questionSession => {
      setPendingQuestions(prev => appendUniqueQuestionSession(prev, questionSession))
    },
    onStreamingUpdate: data => {
      handleStorytellerStreamingUpdate(
        {
          currentProjectId: currentProject?.id,
          setCharacters,
          setCurrentPhase,
        },
        data
      )
    },
    onComplete: () => {
      setGeneratingSection(null)
      setLoadingSections({})
    },
  })

  const showThinking = !!thinkingAgent
  const roundCount = 0

  const MemoizedActionComponent = useStoryActionRenderer({
    storyPlan,
    undoStack,
    setUndoStack,
    setStoryPlan,
    setCharacters,
    setActionHistory,
    setReviewModalAction,
    setSectionPendingActions,
    syncActionStatus,
    executeAction,
    getActionSection,
  })

  const handleApproveAllActions = useCallback(
    async (messageIndex: number) => {
      const msg = messages[messageIndex]
      if (!msg || !msg.actions) return

      for (let i = 0; i < msg.actions.length; i++) {
        const action = msg.actions[i]
        if (action.status !== ApprovalActionStatus.COMMITTED && action.status !== ApprovalActionStatus.REJECTED) {
          syncActionStatus(action, ApprovalActionStatus.EXECUTING, { messageIndex, actionIndex: i })
          try {
            await executeAction(action)
            syncActionStatus(action, ApprovalActionStatus.COMMITTED, { messageIndex, actionIndex: i })
          } catch (e) {
            console.error(`Failed to approve all: action ${i} failed`, e)
            syncActionStatus(action, ApprovalActionStatus.PENDING, { messageIndex, actionIndex: i })
          }
        }
      }
    },
    [messages, syncActionStatus, executeAction]
  )

  const serializedMessagesRef = useRef<{ src: Message[]; mapped: SerializedChatMessage[] } | null>(
    null
  )

  const getSerializedMessages = useCallback((msgs: Message[]) => {
    const cached = serializedMessagesRef.current
    if (cached && cached.src === msgs) return cached.mapped
    const mapped = msgs.map(serializeChatMessage)
    serializedMessagesRef.current = { src: msgs, mapped }
    return mapped
  }, [])

  const seriesBibleRef = useRef<Record<string, unknown> | null>(null)
  const seriesBibleKeyRef = useRef<string | undefined>(undefined)

  const getSeriesBible = useCallback(() => {
    const key = currentProject?.id
    if (key === seriesBibleKeyRef.current && seriesBibleRef.current) {
      return seriesBibleRef.current
    }
    const bible = {
      ...(currentProject?.series_bible ?? {}),
      masterPrompt: currentProject?.master_prompt ?? '',
      userDecisions: storyDecisions,
    }
    seriesBibleRef.current = bible
    seriesBibleKeyRef.current = key
    return bible
  }, [currentProject?.id, currentProject?.series_bible, currentProject?.master_prompt, storyDecisions])

  const [selectedModel, setSelectedModel] = useState(() => {
    const stored = browserStorage.getString(LocalStorageKeys.STORYTELLER_CHAT_MODEL)
    if (stored && getChatModelOption(stored)) return stored
    return DEFAULT_CHAT_MODEL
  })
  useEffect(() => {
    browserStorage.setString(LocalStorageKeys.STORYTELLER_CHAT_MODEL, selectedModel)
  }, [selectedModel])
  const handleModelChange = useCallback((modelId: string) => setSelectedModel(modelId), [])

  const handleSendMessage = useCallback(
    async (e?: React.FormEvent, msgOverride?: string, section?: string) => {
      e?.preventDefault()
      const content = msgOverride || input

      if (!content.trim()) return

      if (isSending) {
        console.warn(StorytellerChatLog.BlockedSend)
        return
      }

      if (section) {
        setLoadingSections(prev => ({
          ...prev,
          [section]: { loading: true, message: StorytellerChatLog.Generating },
        }))
      }

      setInput('')
      setMessages(prev => [...prev, { sender: StorytellerMessageRole.User, content, type: ChatMessageRole.Human }])

      const effectivePhase = resolveEffectivePhase(currentPhase, isWorldBibleOpen, activeTab)
      const serializedMessages = getSerializedMessages(messages)
      const seriesBible = getSeriesBible()

      await sendMessage('/api/storyteller/chat/stream', {
        message: content,
        messages: serializedMessages,
        projectId: currentProject?.id,
        threadId: currentEpisodeId || StorytellerThreadId.General,
        episodeId: currentEpisodeId,
        currentPhase: effectivePhase,
        seriesBible,
        characters: buildCharactersSummary(characters),
        streamMode: useEnhancedStreaming ? StorytellerStreamMode.Events : StorytellerStreamMode.Nodes,
        modelName: selectedModel,
      })
    },
    [
      input,
      messages,
      currentProject?.id,
      currentEpisodeId,
      currentPhase,
      characters,
      sendMessage,
      isWorldBibleOpen,
      activeTab,
      useEnhancedStreaming,
      isSending,
      setLoadingSections,
      setInput,
      setMessages,
      getSerializedMessages,
      getSeriesBible,
      selectedModel,
    ]
  )

  return {
    messages,
    setMessages,
    isSending,
    setIsSending,
    thinkingAgent,
    handleStopStream,
    sendMessage,
    processStream,
    streamingTokens,
    streamingSections,
    isTokenStreaming,
    isAwaitingInput,
    setIsAwaitingInput,
    abortControllerRef,
    updateActionStatus,
    updateActionStatusById,
    syncActionStatus,
    loadingSections,
    setLoadingSections,
    showThinking,
    roundCount,
    MemoizedActionComponent,
    handleApproveAllActions,
    getSerializedMessages,
    getSeriesBible,
    selectedModel,
    setSelectedModel,
    handleModelChange,
    handleSendMessage,
  }
}
