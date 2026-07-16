'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ActionHistoryStatus,
  QuestionMachineState,
  actionRequiresApproval,
  getSectionForActionType,
  type QuestionSession,
} from '@/domains/storyteller'
import { parsePhaseId, BibleSection } from '@/domains/storyteller/core/types/enums'
import { useChatStream, type Message } from '@/shared/chat'
import { DEFAULT_CHAT_MODEL, getChatModelOption } from '@/domains/storyteller/config/constants/chat-model-catalog'
import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import { clearFetchCache } from '@/shared/data/fetch-cache'
import {
  recordFromJson,
  readString,
  readNumber,
  stringArrayFromJson,
} from '@/shared/data/json-guards'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { storytellerCharacterFromRow } from '@/domains/storyteller/core/entities/character-wire'
import { fetchStorytellerCharacters } from '@/domains/storyteller/core/io/character.api'
import { useStoryActionRenderer } from '@/domains/storyteller/ui/StorytellerLayout/StoryActionRenderer'
import {
  AsyncOperationStatus,
  ChatFrameType,
  ChatMessageRole,
  ChatSenderName,
  OpenAiChatRole,
  Phase as StorytellerPhase,
  STORYTELLER_CHAT_WELCOME_MESSAGE,
  StorytellerChatLog,
  StorytellerChatTool,
  StorytellerGlobalOperation,
  StorytellerMessageRole,
  StorytellerMessageType,
  StorytellerStreamMode,
  StorytellerTab,
  StorytellerThreadId,
} from '@/domains/storyteller/state/constants/storyteller-chat'
import type { StorytellerWorkspaceCore } from './useStorytellerPageBase'

/** Map a chat message to the OpenAI-style role/content/name shape sent to the model. */
function serializeChatMessage(m: Message) {
  return {
    role:
      m.type === ChatMessageRole.Human || m.sender === StorytellerMessageRole.User
        ? OpenAiChatRole.User
        : OpenAiChatRole.Assistant,
    content: m.content,
    name: m.sender,
  }
}

type SerializedChatMessage = ReturnType<typeof serializeChatMessage>

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
    // Tenant-explicit (D7): the platform default matches, but storyteller owns its resume endpoint.
    resumeUrl: '/api/storyteller/workflow/resume',
    verboseUiEnabled: isActivityPanelOpen,
    // Use project + episode as persist key
    persistKey: currentProject?.id
      ? `storyteller-${currentProject.id}-${currentEpisodeId || StorytellerThreadId.General}`
      : undefined,
    // Langfuse session tracking - groups all chat interactions for this project/episode
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
      // Handle action events from tool results
      // CRITICAL: Don't block the stream - use fire-and-forget pattern
      if (process.env.NEXT_PUBLIC_CHAT_DEBUG === '1') console.log(StorytellerChatLog.ActionReceived, action.type)

        // Fire and forget - don't await to prevent blocking/crashing the stream
        ; (async () => {
          try {
            // Use centralized approval check
            const requiresApproval = actionRequiresApproval(action.type, action.status)

            if (requiresApproval) {
              if (process.env.NEXT_PUBLIC_CHAT_DEBUG === '1') console.log(`${StorytellerChatLog.ActionReceived} ${action.type} - awaiting user approval`, {
                payload: action.payload ? Object.keys(action.payload) : StorytellerChatLog.NoPayload,
                status: action.status,
              })
              // Do NOT auto-apply to local state.
              // Wait for user to click "Approve" which will call handleApprove -> executeAction

              // Set section pending action for Bible sections (for blur overlay)
              const section = getSectionForActionType(action.type)
              if (process.env.NEXT_PUBLIC_CHAT_DEBUG === '1') {
                console.log(`${StorytellerChatLog.ActionMapped} '${action.type}' -> '${section}'`)
              }

              // For 'full' section or no section, we don't blur a specific Bible panel
              // but the action is still shown as a pending action in the chat interface
              if (section && section !== BibleSection.FULL) {
                if (process.env.NEXT_PUBLIC_CHAT_DEBUG === '1') {
                  console.log(`${StorytellerChatLog.ActionPendingOverlay} ${section}`)
                }
                // Create handlers that will execute/reject the action
                const handleSectionAccept = async () => {
                  if (process.env.NEXT_PUBLIC_CHAT_DEBUG === '1') {
                    console.log(`${StorytellerChatLog.SectionAccept} ${action.type} for ${section}`)
                  }
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
                    // NOTE: entries pushed here use a legacy {type,payload} shape
                    // that diverges from ActionHistoryEntry; the `any` bridges that
                    // gap. Reconciling the shape is a separate bug-fix.
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
                    console.error(StorytellerChatLog.SectionAcceptFailed, e)
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
                  if (process.env.NEXT_PUBLIC_CHAT_DEBUG === '1') {
                    console.log(`${StorytellerChatLog.SectionReject} ${action.type} for ${section}`)
                  }
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
                        agentName: ChatSenderName.Storyteller,
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
                  agentName: ChatSenderName.Storyteller,
                  status: ActionHistoryStatus.COMMITTED,
                  timestamp: new Date(),
                },
                ...prev,
              ])
              if (process.env.NEXT_PUBLIC_CHAT_DEBUG === '1') console.log(StorytellerChatLog.ActionCommitted, action.type)
            }
          } catch (err) {
            console.error(StorytellerChatLog.ActionFailed, action.type, err)
          }
        })()
    },
    onQuestion: questionSession => {
      setPendingQuestions(prev => {
        const existingQuestionTexts = new Set(
          prev.map(p => p.question.question.toLowerCase().trim())
        )
        if (!existingQuestionTexts.has(questionSession.question.question.toLowerCase().trim())) {
          // NOTE: the chat-stream callback delivers the shared `AgentQuestion`
          // shape (no agentName/questionType, string options), which is a
          // structural subset of the storyteller `QuestionSession`. Reconciling
          // the two shapes belongs to the chat-platformization workstream; until
          // then this cast bridges the seam. Do not "fix" without unifying types.
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
      console.log(StorytellerChatLog.StreamingUpdate, data.type)
      if (data.type === ChatFrameType.Start) {
        useGlobalStatusStore.getState().addOperation({
          id: StorytellerGlobalOperation.StorySession,
          type: StorytellerGlobalOperation.StoryAgent,
          label: StorytellerGlobalOperation.StorySession,
          details: StorytellerGlobalOperation.WritersRoom,
          status: AsyncOperationStatus.InProgress,
        })
      } else if (
        data.type === ChatFrameType.NodeStart ||
        (data.type === ChatFrameType.Message && ChatFrameType.Node in data && data.node)
      ) {
        const nodeDetail = readString(recordFromJson(data).node)
        useGlobalStatusStore.getState().updateOperation(StorytellerGlobalOperation.StorySession, {
          details: nodeDetail ?? undefined,
        })
      } else if (
        data.type === ChatFrameType.Done ||
        data.type === ChatFrameType.Terminated ||
        data.type === ChatFrameType.Error ||
        data.type === ChatFrameType.Complete
      ) {
        useGlobalStatusStore.getState().removeOperation(StorytellerGlobalOperation.StorySession)
      } else if (data.type === ChatFrameType.ToolResult && data.toolName === StorytellerChatTool.CreateCharacter) {
        console.log(StorytellerChatLog.CharacterCreatedSync)
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
            fetchStorytellerCharacters(currentProject.id)
              .then(data => {
                if (Array.isArray(data)) {
                  const mapped = data
                    .map(row => storytellerCharacterFromRow(row))
                    .filter((character): character is NonNullable<typeof character> => character !== null)
                  setCharacters(mapped)
                }
              })
              .catch(e => console.error(StorytellerChatLog.RefetchCharactersFailed, e))
          }
        }
      } else if (data.type === ChatFrameType.ToolResult && data.toolName === StorytellerChatTool.UpdateWorldBible) {
        console.log(StorytellerChatLog.WorldBibleUpdated)
      } else if (data.type === ChatFrameType.ToolResult && data.toolName === StorytellerChatTool.UpdateStoryPhase) {
        const phase = readString(recordFromJson(data.result).phase)
        if (phase) {
          console.log(StorytellerChatLog.PhaseUpdated, phase)
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

      let effectivePhase = currentPhase
      if (isWorldBibleOpen) {
        effectivePhase = StorytellerPhase.PREMISE
      } else if (activeTab === StorytellerTab.Script) {
        effectivePhase = StorytellerPhase.WRITING
      } else if (activeTab === StorytellerTab.Board) {
        effectivePhase = StorytellerPhase.BREAKING
      } else if (activeTab === StorytellerTab.Plan) {
        effectivePhase = StorytellerPhase.PREMISE
      }

      const serializedMessages = getSerializedMessages(messages)
      const seriesBible = getSeriesBible()

      const charactersSummary = characters.map(c => ({
        characterId: c.id,
        name: c.name,
        currentGoals: stringArrayFromJson(c.psychology?.goals),
        fears: stringArrayFromJson(c.psychology?.fears),
        selfDelusion: readString(c.psychology?.selfDelusion) ?? '',
        actualMotivation: readString(c.psychology?.actualMotivation) ?? '',
        transformationProgress: c.transformation || 0,
        knowledgeState: stringArrayFromJson(c.psychology?.knowledgeState),
        stressLevel: readNumber(c.psychology?.stress) ?? 30,
      }))

      await sendMessage('/api/storyteller/chat/stream', {
        message: content,
        messages: serializedMessages,
        projectId: currentProject?.id,
        threadId: currentEpisodeId || StorytellerThreadId.General,
        episodeId: currentEpisodeId,
        currentPhase: effectivePhase,
        seriesBible,
        characters: charactersSummary,
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
