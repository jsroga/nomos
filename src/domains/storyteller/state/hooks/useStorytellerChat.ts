'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ActionHistoryStatus,
  QuestionMachineState,
  actionRequiresApproval,
  getSectionForActionType,
  type QuestionSession,
} from '@/domains/storyteller'
import { parsePhaseId } from '@/domains/storyteller/core/types/Enums'
import { useChatStream, type Message } from '@/domains/chat'
import { DEFAULT_CHAT_MODEL, getChatModelOption } from '@/domains/storyteller/config/ChatModelCatalog'
import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import { clearFetchCache } from '@/shared/data/fetch-cache'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { storytellerCharacterFromRow } from '@/domains/storyteller/core/entities/character-wire'
import { useStoryActionRenderer } from '@/domains/storyteller/ui/StorytellerLayout/StoryActionRenderer'
import type { StorytellerWorkspaceCore } from './useStorytellerPageBase'

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

  // --- CHAT STREAM HOOK ---
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
    loadingSections, // Section-specific loading states for granular shimmer
    setLoadingSections, // To set loading state immediately on button click
  } = useChatStream({
    verboseUiEnabled: isActivityPanelOpen,
    // Use project + episode as persist key
    persistKey: currentProject?.id
      ? `storyteller-${currentProject.id}-${currentEpisodeId || 'global'}`
      : undefined,
    // Langfuse session tracking - groups all chat interactions for this project/episode
    projectId: currentProject?.id,
    episodeId: currentEpisodeId || undefined,
    userId: userEmail || undefined,
    initialMessages: [
      {
        sender: 'Showrunner',
        content:
          'Welcome to the Writers Room! Select an episode to begin, then tell me about the story you want to create.',
        type: 'ai',
      },
    ],
    onAction: async action => {
      // Handle action events from tool results
      // CRITICAL: Don't block the stream - use fire-and-forget pattern
      if (process.env.NEXT_PUBLIC_CHAT_DEBUG === '1') console.log('[Action received]', action.type)

        // Fire and forget - don't await to prevent blocking/crashing the stream
        ; (async () => {
          try {
            // Use centralized approval check
            const requiresApproval = actionRequiresApproval(action.type, action.status)

            if (requiresApproval) {
              if (process.env.NEXT_PUBLIC_CHAT_DEBUG === '1') console.log(`[Action received] ${action.type} - awaiting user approval`, {
                payload: action.payload ? Object.keys(action.payload) : 'no payload',
                status: action.status,
              })
              // Do NOT auto-apply to local state.
              // Wait for user to click "Approve" which will call handleApprove -> executeAction

              // Set section pending action for Bible sections (for blur overlay)
              const section = getSectionForActionType(action.type)
              if (process.env.NEXT_PUBLIC_CHAT_DEBUG === '1') console.log(`[Action] Mapped '${action.type}' -> '${section}'`)

              // For 'full' section or no section, we don't blur a specific Bible panel
              // but the action is still shown as a pending action in the chat interface
              if (section && section !== 'full') {
                if (process.env.NEXT_PUBLIC_CHAT_DEBUG === '1') console.log(`[Action] Pending overlay for ${section}`)
                // Create handlers that will execute/reject the action
                const handleSectionAccept = async () => {
                  if (process.env.NEXT_PUBLIC_CHAT_DEBUG === '1') console.log(`[Section Accept] ${action.type} for ${section}`)
                  // Set processing state on both section overlay AND chat widget
                  if (action.id) {
                    syncActionStatus(action, ApprovalActionStatus.EXECUTING)
                  }
                  setSectionPendingActions(prev => {
                    if (!prev[section]) return prev
                    return {
                      ...prev,
                      [section]: { ...prev[section], isProcessing: true },
                    }
                  })

                  try {
                    await executeAction(action)
                    // Sync chat status using ID
                    if (action.id) {
                      syncActionStatus(action, ApprovalActionStatus.COMMITTED)
                    }

                    // Clear pending action on success
                    setSectionPendingActions(prev => {
                      const { [section]: _, ...rest } = prev
                      return rest
                    })
                    // Add to history
                    setActionHistory((prevHistory: any) => [
                      {
                        id: `${Date.now()}`,
                        type: action.type,
                        status: ActionHistoryStatus.COMMITTED,
                        timestamp: Date.now(),
                        payload: action.payload,
                      },
                      ...prevHistory.slice(0, 49),
                    ])
                  } catch (e) {
                    console.error('[Section Accept] Failed:', e)
                    // Reset processing state on failure for both section and chat
                    if (action.id) {
                      syncActionStatus(action, ApprovalActionStatus.PENDING)
                    }
                    setSectionPendingActions(prev => {
                      if (!prev[section]) return prev
                      return {
                        ...prev,
                        [section]: { ...prev[section], isProcessing: false },
                      }
                    })
                  }
                }

                const handleSectionReject = () => {
                  if (process.env.NEXT_PUBLIC_CHAT_DEBUG === '1') console.log(`[Section Reject] ${action.type} for ${section}`)
                  // Sync chat status using ID
                  if (action.id) {
                    syncActionStatus(action, ApprovalActionStatus.REJECTED)
                  }

                  // Clear pending action
                  setSectionPendingActions(prev => {
                    const { [section]: _, ...rest } = prev
                    return rest
                  })
                }

                setSectionPendingActions(prev => ({
                  ...prev,
                  [section]: {
                    section,
                    preview: action.payload,
                    action,
                    onAccept: handleSectionAccept,
                    onReject: handleSectionReject,
                    onReview: () =>
                      setReviewModalAction({
                        action,
                        agentName: 'Storyteller',
                        messageIndex: -1,
                        actionIndex: -1,
                      }),
                  },
                }))
              }
            } else {
              // For non-approval actions, execute immediately
              await executeAction(action)

              // Add to history for UI feedback
              setActionHistory((prev: any) => [
                {
                  id: `stream-${Date.now()}`,
                  action,
                  agentName: 'Storyteller',
                  status: ActionHistoryStatus.COMMITTED,
                  timestamp: new Date(),
                },
                ...prev,
              ])
              if (process.env.NEXT_PUBLIC_CHAT_DEBUG === '1') console.log('[Action committed]', action.type)
            }
          } catch (err) {
            console.error('[Action failed]', action.type, err)
          }
        })()
    },
    onQuestion: questionSession => {
      setPendingQuestions(prev => {
        const existingQuestionTexts = new Set(
          prev.map(p => p.question.question.toLowerCase().trim())
        )
        if (!existingQuestionTexts.has(questionSession.question.question.toLowerCase().trim())) {
          return [
            ...prev,
            {
              ...questionSession,
              machineState: QuestionMachineState.AWAITING_ANSWER,
              createdAt: new Date(),
            } as QuestionSession,
          ]
        }
        return prev
      })
    },
    onStreamingUpdate: data => {
      // DEBUG: Log streaming updates
      console.log('📡 [DEBUG] Streaming update:', data.type)
      if (data.type === 'start') {
        useGlobalStatusStore.getState().addOperation({
          id: 'story-session',
          type: 'story-agent',
          label: 'Story Session',
          details: 'Writers Room',
          status: 'in-progress',
        })
      } else if (data.type === 'node_start' || (data.type === 'message' && 'node' in data && data.node)) {
        const nodeDetail = readString(recordFromJson(data).node)
        useGlobalStatusStore.getState().updateOperation('story-session', {
          details: nodeDetail ?? undefined,
        })
      } else if (
        data.type === 'done' ||
        data.type === 'terminated' ||
        data.type === 'error' ||
        data.type === 'complete'
      ) {
        useGlobalStatusStore.getState().removeOperation('story-session')
      } else if (data.type === 'tool_result' && data.toolName === 'create_character') {
        console.log('🔄 [Storyteller] Character created by agent, syncing sidebar...')
        if (currentProject?.id) {
          clearFetchCache(`characters:${currentProject.id}`)
          const resultRecord = recordFromJson(data.result)
          const newChar = storytellerCharacterFromRow(resultRecord.character)
          if (newChar) {
            setCharacters(prev => {
              const filtered = prev.filter(
                c => c.id !== newChar.id && c.name.toLowerCase() !== newChar.name.toLowerCase()
              )
              return [newChar, ...filtered]
            })
          } else {
            // Fallback: trigger refetch
            fetch(`/api/storyteller/characters?projectId=${currentProject.id}`)
              .then(res => res.json())
              .then(data => {
                if (Array.isArray(data)) {
                  const mapped = data.map((c: any) => ({
                    ...c,
                    stress: c.stressLevel ?? c.stress_level ?? 30,
                    trust: c.trustLevel ?? c.trust_level ?? 50,
                    power: c.powerLevel ?? c.power_level ?? 30,
                    morality: c.moralityLevel ?? c.morality_level ?? 50,
                    hope: c.hopeLevel ?? c.hope_level ?? 60,
                    isolation: c.isolationLevel ?? c.isolation_level ?? 20,
                    transformation:
                      c.transformationProgress ??
                      c.transformation_progress ??
                      c.arcStatus?.transformation ??
                      0,
                    id: c.id || c.characterId,
                    role: c.role || '',
                  }))
                  setCharacters(mapped)
                }
              })
              .catch(e => console.error('Failed to refetch characters', e))
          }
        }
      } else if (data.type === 'tool_result' && data.toolName === 'update_world_bible') {
        // NOTE: Don't call loadProject here - it causes a heavy refresh that disrupts UI
        // The action event handler (onAction -> executeAction) already updates the Bible state
        console.log('🔄 [Storyteller] World Bible updated by agent tool')
      } else if (data.type === 'tool_result' && data.toolName === 'update_story_phase') {
        const phase = readString(recordFromJson(data.result).phase)
        if (phase) {
          console.log('🎬 [Storyteller] Story phase updated to:', phase)
          setCurrentPhase(parsePhaseId(phase))
        }
      }
    },
    onComplete: () => {
      // Reset section-specific generation state when stream completes
      setGeneratingSection(null)
      // Clear all section loading states
      setLoadingSections({})
    },
  })

  // Derived state
  const showThinking = !!thinkingAgent
  const roundCount = 0 // Placeholder

  // getActionSection provided by useStorytellerActions hook

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

      // Execute all pending actions
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
            // Stop if one fails to be safe? Or continue?
            // Let's continue for now.
          }
        }
      }
    },
    [messages, syncActionStatus, executeAction]
  )

  const serializedMessagesRef = useRef<{ src: Message[]; mapped: any[] } | null>(null)

  const getSerializedMessages = useCallback((msgs: Message[]) => {
    const cached = serializedMessagesRef.current
    if (cached && cached.src === msgs) return cached.mapped
    const mapped = msgs.map(m => ({
      role: m.type === 'human' || m.sender === 'User' ? 'user' : 'assistant',
      content: m.content,
      name: m.sender,
    }))
    serializedMessagesRef.current = { src: msgs, mapped }
    return mapped
  }, [])

  const seriesBibleRef = useRef<any>(null)
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

  // Selected chat model for the Writers Room. Hydrate from localStorage after
  // mount to avoid SSR/client mismatch (localStorage is not available on server).
  const [selectedModel, setSelectedModel] = useState(DEFAULT_CHAT_MODEL)
  const modelHydratedRef = useRef(false)
  useEffect(() => {
    const stored = window.localStorage.getItem(LocalStorageKeys.STORYTELLER_CHAT_MODEL)
    if (stored && getChatModelOption(stored)) setSelectedModel(stored)
    modelHydratedRef.current = true
  }, [])
  useEffect(() => {
    if (!modelHydratedRef.current) return
    window.localStorage.setItem(LocalStorageKeys.STORYTELLER_CHAT_MODEL, selectedModel)
  }, [selectedModel])
  const handleModelChange = useCallback((modelId: string) => setSelectedModel(modelId), [])

  const handleSendMessage = useCallback(
    async (e?: React.FormEvent, msgOverride?: string, section?: string) => {
      e?.preventDefault()
      const content = msgOverride || input

      if (!content.trim()) return

      if (isSending) {
        console.warn('[Storyteller] Blocked send - already processing a message')
        return
      }

      if (section) {
        setLoadingSections(prev => ({
          ...prev,
          [section]: { loading: true, message: 'Generating...' },
        }))
      }

      setInput('')
      setMessages(prev => [...prev, { sender: 'User', content, type: 'human' }])

      let effectivePhase = currentPhase
      if (isWorldBibleOpen) {
        effectivePhase = 'premise'
      } else if (activeTab === 'script') {
        effectivePhase = 'writing'
      } else if (activeTab === 'board') {
        effectivePhase = 'breaking'
      } else if (activeTab === 'plan') {
        effectivePhase = 'premise'
      }

      const serializedMessages = getSerializedMessages(messages)
      const seriesBible = getSeriesBible()

      const charactersSummary = characters.map((c: any) => ({
        characterId: c.id,
        name: c.name,
        currentGoals: c.psychology?.goals || c.currentGoals || [],
        fears: c.psychology?.fears || c.fears || [],
        selfDelusion: c.psychology?.selfDelusion || c.selfDelusion || '',
        actualMotivation: c.psychology?.actualMotivation || c.actualMotivation || '',
        transformationProgress: c.transformation || 0,
        knowledgeState: c.knowledgeState || [],
        stressLevel: c.stress || c.stressLevel || 30,
      }))

      await sendMessage('/api/storyteller/chat/stream', {
        message: content,
        messages: serializedMessages,
        projectId: currentProject?.id,
        threadId: currentEpisodeId || 'general',
        episodeId: currentEpisodeId,
        currentPhase: effectivePhase,
        seriesBible,
        characters: charactersSummary,
        streamMode: useEnhancedStreaming ? 'events' : 'nodes',
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
