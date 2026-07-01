'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { TOUR_STEP_IDS } from '@/lib/tour-constants'
import { useSearchParams, useRouter, useParams, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { CorkBoard } from '@/domains/storyteller/components/CorkBoard'
import { CharacterPanel } from '@/domains/storyteller/components/CharacterPanel'
// Consolidated Chat & Storyteller Imports
import { AgentAction, AgentQuestion } from '@/domains/storyteller/core/ActionTypes'
import { ActionStatus } from '@/domains/storyteller/core/Enums'
import {
  actionRequiresApproval,
  getSectionForActionType,
} from '@/domains/storyteller/config/action-config'
import { QuestionSession } from '@/domains/storyteller/core/ActionTypes'
import { SmartQuickActions } from '@/domains/chat/components/QuickActions'
import { StreamingTerminal } from '@/domains/chat/components/StreamingTerminal'
import { StreamingSectionsInline } from '@/domains/chat/components/StreamingSectionsInline'
import { useChatStream } from '@/domains/chat/hooks/useChatStream'
import { Message } from '@/domains/chat/types'
import {
  MentionsProvider,
  MentionsChatInterface,
} from '@/domains/storyteller/mentions/MentionsProvider'
// Action UI components loaded dynamically below (ActionCommitted, ActionSuggestion, ActionApprovalModal, QuestionCard)
import {
  Loader2,
  Lock,
  Network,
} from 'lucide-react'
import { STORYTELLER_AGENT_CONFIG } from '@/domains/storyteller/config/storyteller-agents'

// EpisodeManager and MasterPromptEditor loaded dynamically below
import { useLoadingStates } from '@/domains/storyteller/hooks/useLoadingStates'
import { useBibleState } from '@/domains/storyteller/hooks/useBibleState'
import { useEpisodeData } from '@/domains/storyteller/hooks/useEpisodeData'
import { useStorytellerHydration } from '@/domains/storyteller/hooks/useStorytellerHydration'
import { useStorytellerActions } from '@/domains/storyteller/hooks/useStorytellerActions'
import { PhaseNavigatorCompact } from '@/domains/storyteller/components/PhaseNavigator'
import { StorytellerEmptyState } from '@/domains/storyteller/components/StorytellerEmptyState'
import dynamic from 'next/dynamic'
import type { ScriptEditorProps } from '@/domains/storyteller/components/ScriptEditor'
import type { TimelineProps } from '@/domains/storyteller/components/Timeline'
import type { StoryPlanBoardProps } from '@/domains/storyteller/components/StoryPlanBoard'
import type { WorldBiblePanelProps } from '@/domains/storyteller/components/WorldBiblePanel'
import type { CharacterWebProps } from '@/domains/storyteller/components/CharacterWeb/CharacterWeb'

// Dynamic imports for heavy components to reduce initial bundle size
const ScriptEditor = dynamic<ScriptEditorProps>(
  () => import('@/domains/storyteller/components/ScriptEditor').then(m => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    ),
  }
)
const Timeline = dynamic<TimelineProps>(() => import('@/domains/storyteller/components/Timeline'), {
  ssr: false,
})
const StoryPlanBoard = dynamic<StoryPlanBoardProps>(
  () => import('@/domains/storyteller/components/StoryPlanBoard'),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    ),
  }
)
const WorldBiblePanel = dynamic<WorldBiblePanelProps>(
  () => import('@/domains/storyteller/components/WorldBiblePanel'),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    ),
  }
)
const CharacterWeb = dynamic<CharacterWebProps>(
  () => import('@/domains/storyteller/components/CharacterWeb').then(m => m.CharacterWeb),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    ),
  }
)
const ActionApprovalModal = dynamic(
  () => import('@/domains/storyteller/components/ActionApprovalModal').then(m => m.ActionApprovalModal),
  { ssr: false }
)
const ActionCommitted = dynamic(
  () => import('@/domains/storyteller/components/ActionToast').then(m => m.ActionCommitted),
  { ssr: false }
)
const ActionSuggestion = dynamic(
  () => import('@/domains/storyteller/components/ActionToast').then(m => m.ActionSuggestion),
  { ssr: false }
)
const QuestionCard = dynamic(
  () => import('@/domains/storyteller/components/QuestionCard').then(m => m.QuestionCard),
  { ssr: false }
)
const EpisodeManager = dynamic(
  () => import('@/domains/storyteller/components/EpisodeManager').then(m => m.EpisodeManager),
  { ssr: false }
)
const MasterPromptEditor = dynamic(
  () => import('@/domains/storyteller/components/MasterPromptEditor').then(m => m.MasterPromptEditor),
  { ssr: false }
)
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { useGlobalStatusStore } from '@/store/useGlobalStatusStore'
// posterGenerationService loaded dynamically at call sites
import { FileText, Users, BookOpen, AlertCircle, Scroll } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DomainSidebar,
  SidebarSection,
  SidebarEmptyState,
  SidebarHeader,
} from '@/components/ui/domain-sidebar'
// regenerateText moved to API call to fix client-side bundle issues
import { StoryPlan, StorySequence } from '@/domains/storyteller/prompts/schemas/agent-schemas'

// import { useProjectFromUrl } from '@/hooks/useProjectFromUrl'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'

import { LocalStorageKeys } from '@/constants/localStorage'
// moodboardGenerationService loaded dynamically at call sites
import { cachedFetch, clearFetchCache } from '@/lib/fetch-cache'
import { isAdminUser } from '@/lib/admin-users'
import { toError } from '@/lib/error-utils'

// Module-level tracking removed in favor of useRef
// const hydratedProjects = new Set<string>()

const MAX_ROUNDS = 15 // Hard stop after this many rounds

// Get model config from localStorage for API requests

interface Character {
  id: string
  name: string
  role: string
  description?: string
  archetype?: string
  traits?: string[]
  // Shimmer/Panel compat
  gender?: string
  characterPrompt?: string
  // Metrics
  valence?: number
  arousal?: number
  autonomy?: number
  competence?: number
  relatedness?: number
  cognitiveClarity?: number // 0-100: Mental sharpness
  perceivedStakes?: number // 0-100: How much is on the line
  socialSafety?: number // 0-100: Perceived safety in social context
  moralAlignment?: number // 0-100: Alignment between actions and values
  transformation?: number // 0-100: Arc progress
  stress?: number
  trust?: number
  resilience?: number
  agency?: number
  image?: string
  psychology?: {
    goals?: string[]
    fears?: string[]
    selfDelusion?: string
    actualMotivation?: string
  }
  currentGoals?: string[]
  fears?: string[]
  selfDelusion?: string
  actualMotivation?: string
  // Added for missing props
  power?: number
  morality?: number
  hope?: number
  isolation?: number
}

interface Beat {
  id: string
  sequence: number
  logline: string
  beatType: string
  status: string
  content?: string
  imagePrompt?: string
  // Added for BeatCard compatibility
  episodeId?: string
  charactersInvolved?: string[]
  emotionalShifts?: Record<string, { from: string; to: string }>
  visualHook?: string
  causalDependencies?: string[]
  setupsPayoffs?: { setupId?: string; payoffFor?: string }
}

export default function StorytellerPage() {
  // DEBUG: Track component mount/unmount
  useEffect(() => {
    console.log('🔵 [DEBUG] StorytellerPage MOUNTED')
    return () => {
      console.log('🔴 [DEBUG] StorytellerPage UNMOUNTED')
    }
  }, [])

  const searchParams = useSearchParams()
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()

  const currentProject = useWorldStore(state => state.currentProject)
  const setCurrentProject = useWorldStore(state => state.setCurrentProject)

  // --- Extracted hooks ---
  const {
    isWorldBibleOpen,
    isBibleLocked,
    bibleLockedBy,
    userEmail,
    setOptimisticBibleOpen,
    toggleBible,
    closeBible,
  } = useBibleState(currentProject?.id)

  const {
    currentEpisodeId,
    setCurrentEpisodeId,
    currentEpisodeTitle,
    setCurrentEpisodeTitle,
    currentEpisode,
    hasEpisodes,
    firstEpisodeId,
    overrideState,
    selectEpisode,
  } = useEpisodeData(currentProject?.id)

  // --- Local component state ---
  const [selectedBeatId, setSelectedBeatId] = useState<string | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [beats, setBeats] = useState<Beat[]>([])
  const [script, setScript] = useState<string>('')
  const [isScriptLoading, setIsScriptLoading] = useState(false)
  const [currentPhase, setCurrentPhase] = useState<string>('premise')
  const [activeTab, setActiveTab] = useState<string>('plan')
  const [focusEntityId, setFocusEntityId] = useState<string | null>(null)
  const [storyPlan, setStoryPlan] = useState<StoryPlan | null>(null)
  const [isPlanApproved, setIsPlanApproved] = useState(false)
  const episodeParam = searchParams?.get('episodeId') ?? null
  const [isFetchingPlan, setIsFetchingPlan] = useState(!!episodeParam)
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false)
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false)
  const [primaryMoodboardUrl, setPrimaryMoodboardUrl] = useState<string | null>(null)
  const [isActivityPanelOpen, setIsActivityPanelOpen] = useState(false)
  const [storyDecisions, setStoryDecisions] = useState<Record<string, string>>({})
  const [input, setInput] = useState('')
  const [pendingQuestions, setPendingQuestions] = useState<QuestionSession[]>([])
  const [answeredQuestions, setAnsweredQuestions] = useState<
    { question: string; answer: string }[]
  >([])
  const [generatingSection, setGeneratingSection] = useState<string | null>(null)

  // --- Extracted hooks ---
  useStorytellerHydration({ currentProject, setStoryPlan, setStoryDecisions })

  const {
    actionHistory,
    setActionHistory,
    showToasts,
    setShowToasts,
    undoStack,
    setUndoStack,
    reviewModalAction,
    setReviewModalAction,
    sectionPendingActions,
    setSectionPendingActions,
    pendingActionsRef,
    episodeIdRef,
    refreshBeats: refreshBeatsRaw,
    executeAction,
    getActionSection,
    handleDismissToast,
  } = useStorytellerActions({
    currentProject,
    currentEpisodeId,
    setStoryPlan,
    setStoryDecisions,
    setCharacters,
    setScript,
    setCurrentEpisodeTitle,
    setCurrentPhase,
    setCurrentProject,
  })

  const refreshBeats = useCallback(async (episodeId: string) => {
    const mapped = await refreshBeatsRaw(episodeId)
    if (mapped) setBeats(mapped)
  }, [refreshBeatsRaw])

  // Listen for entity navigation events
  useEffect(() => {
    const handleNavigateToEntity = (e: Event) => {
      const { refId } = (e as CustomEvent).detail || {}
      if (!refId) return
      console.log(`[StorytellerPage] Navigating to entity: ${refId}`)
      setFocusEntityId(refId)
      if (isWorldBibleOpen) {
        window.dispatchEvent(
          new CustomEvent('bible-switch-tab', { detail: { tab: 'relationships' } })
        )
      } else if (currentEpisodeId) {
        setActiveTab('relationships')
      }
    }
    window.addEventListener('navigate-to-entity', handleNavigateToEntity)
    return () => window.removeEventListener('navigate-to-entity', handleNavigateToEntity)
  }, [isWorldBibleOpen, currentEpisodeId])

  // Sync activeTab with currentPhase
  useEffect(() => {
    const phaseToTab: Record<string, string> = {
      premise: 'plan',
      breaking: 'board',
      writing: 'script',
      complete: 'script',
    }
    const newTab = phaseToTab[currentPhase] || 'plan'
    if (activeTab !== newTab) {
      setActiveTab(newTab)
    }
  }, [currentPhase])

  const loadingStates = useLoadingStates()

  const hasBible = useMemo(() => {
    if (overrideState === 'NO_BIBLE') return false
    if (overrideState === 'NO_EPISODES' || overrideState === 'HAS_EPISODES') return true
    return !!(
      storyPlan?.worldDescription ||
      (storyPlan?.genre && storyPlan.genre !== 'Unknown' && storyPlan.genre !== '') ||
      (storyPlan?.tone && storyPlan.tone !== 'Unknown' && storyPlan.tone !== '') ||
      (storyPlan?.themes && storyPlan.themes.length > 0)
    )
  }, [storyPlan, overrideState])

  const useEnhancedStreaming = true
  const useStreaming = true

  const addOperation = useGlobalStatusStore(state => state.addOperation)
  const removeOperation = useGlobalStatusStore(state => state.removeOperation)

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
                  if ('id' in action && action.id) {
                    updateActionStatusById(action.id as string, 'executing')
                  }
                  setSectionPendingActions(prev => {
                    if (!prev[section]) return prev
                    return {
                      ...prev,
                      [section]: { ...prev[section], isProcessing: true },
                    }
                  })

                  try {
                    await executeAction(action as any)
                    // Sync chat status using ID
                    if ('id' in action && action.id) {
                      updateActionStatusById(action.id as string, 'committed')
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
                        status: 'committed',
                        timestamp: Date.now(),
                        payload: action.payload,
                      },
                      ...prevHistory.slice(0, 49),
                    ])
                  } catch (e) {
                    console.error('[Section Accept] Failed:', e)
                    // Reset processing state on failure for both section and chat
                    if ('id' in action && action.id) {
                      updateActionStatusById(action.id as string, 'pending')
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
                  if ('id' in action && action.id) {
                    updateActionStatusById(action.id as string, 'rejected')
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
                    action: action as AgentAction,
                    onAccept: handleSectionAccept,
                    onReject: handleSectionReject,
                    onReview: () =>
                      setReviewModalAction({
                        action: action as AgentAction,
                        agentName: 'Storyteller',
                        messageIndex: -1,
                        actionIndex: -1,
                      }),
                  },
                }))
              }
            } else {
              // For non-approval actions, execute immediately
              await executeAction(action as any)

              // Add to history for UI feedback
              setActionHistory((prev: any) => [
                {
                  id: `stream-${Date.now()}`,
                  action: action as any,
                  agentName: 'Storyteller',
                  status: ActionStatus.COMMITTED,
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
              machineState: 'pending',
              createdAt: new Date(),
            } as any,
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
      } else if (data.type === 'node_start' || (data.type === 'message' && data.node)) {
        useGlobalStatusStore.getState().updateOperation('story-session', {
          details: data.node || data.message?.node,
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
          // If the tool returned the character, add it to state immediately after mapping
          if (data.result?.character) {
            const raw = data.result.character
            const newChar = {
              ...raw,
              // Match the mapping logic from the fetch effect (lines ~1714)
              stress: raw.stressLevel ?? raw.stress_level ?? 30,
              trust: raw.trustLevel ?? raw.trust_level ?? 50,
              power: raw.powerLevel ?? raw.power_level ?? 30,
              morality: raw.moralityLevel ?? raw.morality_level ?? 50,
              hope: raw.hopeLevel ?? raw.hope_level ?? 60,
              isolation: raw.isolationLevel ?? raw.isolation_level ?? 20,
              transformation:
                raw.transformationProgress ??
                raw.transformation_progress ??
                raw.arcStatus?.transformation ??
                0,
              id: raw.id || raw.characterId,
              role: raw.role || '',
              // Ensure portraitUrl is preserved
              portraitUrl: raw.portraitUrl || raw.portrait_url,
            }

            setCharacters(prev => {
              // Robust deduplication: Remove existing char if same ID or same Name
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
        // Automatically switch phase when triggered by agent
        if (data.result?.phase) {
          console.log('🎬 [Storyteller] Story phase updated to:', data.result.phase)
          setCurrentPhase(data.result.phase)
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

  // Memoized ActionComponent to prevent re-renders on every streaming token
  const MemoizedActionComponent = useMemo(() => {
    return React.memo(function ActionComponentInner({
      action,
      agentName,
      messageIndex,
      actionIndex,
    }: {
      action: AgentAction
      agentName: string
      messageIndex: number
      actionIndex: number
    }) {
      const status = action.status || 'pending'

      const actionId = `${messageIndex}-${actionIndex}`
      const section = getActionSection(action.type)

      const handleApprove = async () => {
        if ('id' in action && action.id) {
          updateActionStatusById(action.id as string, 'executing')
        } else {
          updateActionStatus(messageIndex, actionIndex, 'executing')
        }

        // Set processing state on section pending action (so overlay shows loading)
        if (section) {
          setSectionPendingActions(prev => {
            if (!prev[section]) return prev
            return {
              ...prev,
              [section]: {
                ...prev[section],
                isProcessing: true,
              },
            }
          })
        }

        // Save current state for undo (only for UPDATE_* actions)
        if (action.type.startsWith('UPDATE_')) {
          setUndoStack(prev => [
            ...prev.slice(-4),
            { storyPlan: storyPlan ? { ...storyPlan } : null, actionId },
          ])
        }

        try {
          await executeAction(action as any)

          if ('id' in action && action.id) {
            updateActionStatusById(action.id as string, 'committed')
          } else {
            updateActionStatus(messageIndex, actionIndex, 'committed')
          }

          // Clear section pending action on success
          if (section) {
            setSectionPendingActions(prev => {
              const { [section]: _, ...rest } = prev
              return rest
            })
          }

          setActionHistory(prev => [
            {
              id: actionId,
              action,
              agentName,
              status: ActionStatus.COMMITTED,
              timestamp: new Date(),
            },
            ...prev,
          ])
        } catch (e) {
          console.error('Approval failed', e)

          if ('id' in action && action.id) {
            updateActionStatusById(action.id as string, 'pending')
          } else {
            updateActionStatus(messageIndex, actionIndex, 'pending')
          }

          // Reset processing state on failure
          if (section) {
            setSectionPendingActions(prev => {
              if (!prev[section]) return prev
              return {
                ...prev,
                [section]: {
                  ...prev[section],
                  isProcessing: false,
                },
              }
            })
          }

          // Remove from undo stack on failure
          setUndoStack(prev => prev.filter(u => u.actionId !== actionId))
        }
      }

      const handleReject = () => {
        if ('id' in action && action.id) {
          updateActionStatusById(action.id as string, 'rejected')
        } else {
          updateActionStatus(messageIndex, actionIndex, 'rejected')
        }

        // Clear section pending action
        if (section) {
          setSectionPendingActions(prev => {
            const { [section]: _, ...rest } = prev
            return rest
          })
        }
      }

      const handleUndo = async () => {
        const undoEntry = undoStack.find(u => u.actionId === actionId)

        // Handle StoryPlan Undo
        if (undoEntry && undoEntry.storyPlan) {
          setStoryPlan(undoEntry.storyPlan)
          setUndoStack(prev => prev.filter(u => u.actionId !== actionId))
          updateActionStatus(messageIndex, actionIndex, 'rejected')
          console.log('↩️ [Undo] Reverted to previous state for action:', actionId)
        }

        // Handle Character Creation Undo
        if (action.type === 'CREATE_CHARACTER') {
          const charName = 'payload' in action && action.payload && typeof action.payload === 'object' && 'name' in action.payload
            ? (action.payload as any).name
            : ('payload' in action && action.payload && typeof action.payload === 'object' && 'character' in action.payload
              ? (action.payload as any).character?.name
              : undefined)
          if (charName) {
            console.log('↩️ [Undo] Removing character:', charName)
            setCharacters(prev => prev.filter(c => c.name.toLowerCase() !== charName.toLowerCase()))
            // Optionally trigger a delete API call?
            // Ideally we would, but for now let's just clean the UI as the user rejected it.
            // If we really want to "Undo", we should delete it.
            // But "Reject" usually means "Don't do it". If it's already done (tool_result), we need to undo it.
            // For now, removing from UI is the primary request ("should only appear in sidebar if approved").
          }
          updateActionStatus(messageIndex, actionIndex, 'rejected')
        }
      }

      const canUndo =
        (action.type.startsWith('UPDATE_') && undoStack.some(u => u.actionId === actionId)) ||
        action.type === 'CREATE_CHARACTER'

      if (status === 'committed') {
        return (
          <ActionCommitted
            entry={{
              id: actionId,
              action,
              agentName,
              timestamp: new Date(),
              status: ActionStatus.COMMITTED,
            }}
            compact
            onUndo={handleUndo}
            canUndo={canUndo}
          />
        )
      }
      if (status === 'rejected') {
        return (
          <div className="text-[10px] text-red-400/60 uppercase tracking-widest px-2 italic">
            Discarded
          </div>
        )
      }
      const handleReview = () => {
        setReviewModalAction({ action, agentName, messageIndex, actionIndex })
      }

      // Note: Section pending actions are now set via the stream handler when actions are received
      // This avoids the React hooks conditional call issue

      return (
        <ActionSuggestion
          action={action}
          agentName={agentName}
          onAccept={handleApprove}
          onReview={handleReview}
          onReject={handleReject}
          isProcessing={status === 'executing'}
        />
      )
    })
  }, [
    updateActionStatus,
    executeAction,
    setActionHistory,
    storyPlan,
    undoStack,
    setUndoStack,
    setStoryPlan,
    setReviewModalAction,
    getActionSection,
    setSectionPendingActions,
  ])

  const handleApproveAllActions = useCallback(
    async (messageIndex: number) => {
      const msg = messages[messageIndex]
      if (!msg || !msg.actions) return

      // Execute all pending actions
      for (let i = 0; i < msg.actions.length; i++) {
        const action = msg.actions[i]
        if (action.status !== 'committed' && action.status !== 'rejected') {
          updateActionStatus(messageIndex, i, 'executing')
          try {
            await executeAction(action as any)
            updateActionStatus(messageIndex, i, 'committed')
          } catch (e) {
            console.error(`Failed to approve all: action ${i} failed`, e)
            updateActionStatus(messageIndex, i, 'pending')
            // Stop if one fails to be safe? Or continue?
            // Let's continue for now.
          }
        }
      }
    },
    [messages, updateActionStatus, executeAction]
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
      ...((currentProject?.series_bible as any) || {}),
      masterPrompt: currentProject?.master_prompt ?? '',
      userDecisions: storyDecisions,
    }
    seriesBibleRef.current = bible
    seriesBibleKeyRef.current = key
    return bible
  }, [currentProject?.id, currentProject?.series_bible, currentProject?.master_prompt, storyDecisions])

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
        effectivePhase = 'world_building'
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
    ]
  )

  const lastResumedProjectId = useRef<string | null>(null)

  // Resume pending poster generations on mount
  useEffect(() => {
    // Only run if we have a project ID and haven't resumed for this project yet
    if (currentProject?.id && lastResumedProjectId.current !== currentProject.id) {
      lastResumedProjectId.current = currentProject.id

      import('@/domains/storyteller/services/PosterGenerationService').then(({ posterGenerationService }) =>
        posterGenerationService.resumePendingGenerations(
          currentProject!.id,
          async (url, episodeId, type) => {
            if (episodeId === currentEpisodeId) {
              if (type === 'poster') {
                setIsGeneratingPoster(false)
                setStoryPlan(prev => (prev ? ({ ...prev, posterUrl: url } as any) : null))
              } else {
                setIsGeneratingStoryboard(false)
                setStoryPlan(prev => (prev ? ({ ...prev, storyboardUrl: url } as any) : null))
              }
            }

            try {
              const payload = type === 'poster' ? { posterUrl: url } : { storyboardUrl: url }
              await fetch(`/api/storyteller/episodes/${episodeId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              })
            } catch (e) {
              console.error('Failed to save resumed generation:', e)
            }
          }
        )
      )
    }
  }, [currentProject?.id, currentEpisodeId])

  // Storyboard Trigger (Gemini)
  const handleStoryboardTrigger = useCallback(
    async (eventOrEpisodeId?: Event | string | React.MouseEvent) => {
      let episodeId: string | undefined

      if (typeof eventOrEpisodeId === 'string') {
        episodeId = eventOrEpisodeId
      } else if (
        eventOrEpisodeId &&
        'detail' in eventOrEpisodeId &&
        (eventOrEpisodeId as unknown as CustomEvent).detail?.episodeId
      ) {
        episodeId = (eventOrEpisodeId as unknown as CustomEvent).detail.episodeId
      } else {
        episodeId = currentEpisodeId || undefined
      }

      if (!episodeId || !currentProject?.id) return

      if (isGeneratingStoryboard) return

      setIsGeneratingStoryboard(true)

      // Read Gemini API key from localStorage (legacy client-side config)
      let geminiApiKey: string | undefined
      try {
        const geminiConfig = localStorage.getItem(LocalStorageKeys.AI_CONFIG_GEMINI)
        if (geminiConfig) geminiApiKey = JSON.parse(geminiConfig).apiKey
      } catch { /* ignore */ }

      if (!geminiApiKey) {
        alert('Gemini API Key missing! Configure it in your environment.')
        setIsGeneratingStoryboard(false)
        return
      }

      try {
        const premise = (storyPlan as any)?.premise || storyPlan
        const prompt = `A visual storyboard for an episode titled "${premise?.title || 'Unknown'}".`

        const beatsPayload = beats.map((b: Beat) => ({
          logline: b.logline,
          visualHook: b.content,
          imagePrompt: b.imagePrompt,
        }))

        const { posterGenerationService } = await import('@/domains/storyteller/services/PosterGenerationService')
        await posterGenerationService.generateStoryboard(
          currentProject.id,
          episodeId,
          prompt,
          beatsPayload,
          { apiKey: geminiApiKey },
          async url => {
            setIsGeneratingStoryboard(false)
            setStoryPlan(prev => (prev ? ({ ...prev, storyboardUrl: url } as any) : null))

            if (episodeId) {
              try {
                await fetch(`/api/storyteller/episodes/${episodeId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ storyboardUrl: url }),
                })
              } catch (e) {
                console.error('Failed to save storyboard URL:', e)
              }
            }
          }
        )
      } catch (error) {
        console.error('Storyboard generation failed', error)
        setIsGeneratingStoryboard(false)
      }
    },
    [currentProject?.id, currentEpisodeId, isGeneratingStoryboard, beats, storyPlan]
  )

  // Poster Trigger (Midjourney via Comet)
  const handlePosterTrigger = useCallback(
    async (eventOrEpisodeId?: Event | string | React.MouseEvent) => {
      let episodeId: string | undefined

      if (typeof eventOrEpisodeId === 'string') {
        episodeId = eventOrEpisodeId
      } else if (
        eventOrEpisodeId &&
        'detail' in eventOrEpisodeId &&
        (eventOrEpisodeId as unknown as CustomEvent).detail?.episodeId
      ) {
        episodeId = (eventOrEpisodeId as unknown as CustomEvent).detail.episodeId
      } else {
        episodeId = currentEpisodeId || undefined
      }

      if (!episodeId || !currentProject?.id) return

      if (isGeneratingPoster) return

      setIsGeneratingPoster(true)

      // Retrieve LegNext API key from local storage
      let apiKey = ''
      try {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('ai-config-legnext')
          if (stored) {
            const parsed = JSON.parse(stored)
            apiKey = parsed.apiKey || ''
          }
        }
      } catch (e) {
        console.warn('Failed to parse LegNext config', e)
      }

      try {
        const premise = (storyPlan as any)?.premise || storyPlan
        const prompt = `Title: ${premise?.title || 'Unknown'}. Theme: ${premise?.thematicFocus || 'Cinematic'}. ${premise?.protagonistHook || ''}`

        // Log action start
        setActionHistory(prev => [
          {
            id: `poster-${Date.now()}`,
            action: { type: 'GENERATE_POSTER', payload: { episodeId, prompt } },
            agentName: 'PosterAgent',
            status: ActionStatus.COMMITTED,
            timestamp: new Date(),
          },
          ...prev,
        ])

        const { posterGenerationService: posterSvc } = await import('@/domains/storyteller/services/PosterGenerationService')
        await posterSvc.generatePoster(
          currentProject.id,
          episodeId,
          prompt,
          { apiKey },
          async url => {
            setIsGeneratingPoster(false)
            setStoryPlan(prev => (prev ? ({ ...prev, posterUrl: url } as any) : null))

            if (episodeId) {
              try {
                await fetch(`/api/storyteller/episodes/${episodeId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ posterUrl: url }),
                })
              } catch (e) {
                console.error('Failed to save poster URL:', e)
              }
            }

            // Log completion
            setActionHistory(prev => [
              {
                id: `poster-complete-${Date.now()}`,
                action: { type: 'GENERATE_POSTER', payload: { episodeId, prompt } },
                agentName: 'PosterAgent',
                status: ActionStatus.COMMITTED,
                timestamp: new Date(),
              },
              ...prev,
            ])
          }
        )
      } catch (error) {
        console.error('Poster generation failed', error)
        setIsGeneratingPoster(false)
        alert('Poster generation failed. Please check the API key configuration or try again.')

        // Log failure
        setActionHistory(prev => [
          {
            id: `poster-fail-${Date.now()}`,
            action: { type: 'GENERATE_POSTER', payload: { episodeId, prompt: 'Failed' } },
            agentName: 'PosterAgent',
            status: ActionStatus.UNDONE,
            timestamp: new Date(),
          },
          ...prev,
        ])
      }
    },
    [currentProject?.id, currentEpisodeId, isGeneratingPoster, storyPlan]
  )

  // Moodboard Generation Trigger
  const handleMoodboardTrigger = useCallback(
    async (event?: Event) => {
      const detail = (event as CustomEvent)?.detail
      const projectId = detail?.projectId || currentProject?.id

      if (!projectId) return

      const { moodboardGenerationService } = await import('@/domains/storyteller/services/MoodboardGenerationService')
      await moodboardGenerationService.generate(projectId, [], undefined, {}, async () => {
        // Refetch project data when generation completes
        try {
          const response = await fetch(`/api/storyteller/projects/${projectId}`)
          if (response.ok) {
            const data = await response.json()
            const bible = data.seriesBible || data.series_bible
            if (bible?.moodImages) {
              setStoryPlan(prev => (prev ? { ...prev, moodImages: bible.moodImages } : prev))
              // Also update the store - get fresh reference from store
              const latestProject = useWorldStore.getState().currentProject
              if (latestProject) {
                useWorldStore.getState().setCurrentProject({
                  ...latestProject,
                  series_bible: {
                    ...((latestProject.series_bible as any) || {}),
                    moodImages: bible.moodImages,
                  },
                })
              }
            }
          }
        } catch (error) {
          console.error('Failed to refetch moodboard data:', error)
        }
      })
    },
    [currentProject?.id]
  )

  // Listeners
  useEffect(() => {
    const onStoryboard = (e: Event) => handleStoryboardTrigger(e)
    const onPoster = (e: Event) => handlePosterTrigger(e)
    const onMoodboard = (e: Event) => handleMoodboardTrigger(e)

    window.addEventListener('trigger-storyboard-generation', onStoryboard)
    window.addEventListener('generate-episode-poster', onPoster)
    window.addEventListener('trigger-moodboard-generation', onMoodboard)

    return () => {
      window.removeEventListener('trigger-storyboard-generation', onStoryboard)
      window.removeEventListener('generate-episode-poster', onPoster)
      window.removeEventListener('trigger-moodboard-generation', onMoodboard)
    }
  }, [handleStoryboardTrigger, handlePosterTrigger, handleMoodboardTrigger])

  // Update StoryPlanBoard to pass isGeneratingPoster
  // ... (Wait, I need to check where StoryPlanBoard is rendered to pass the prop)

  // Update primary moodboard background
  const updatePrimaryMoodboard = useCallback(() => {
    if (!currentProject?.id) return
    const savedPrimary = localStorage.getItem(`moodboard-primary-${currentProject.id}`)
    const primaryIdx = savedPrimary !== null ? parseInt(savedPrimary) : null
    if (primaryIdx !== null && storyPlan?.moodImages?.[primaryIdx]) {
      const img = storyPlan.moodImages[primaryIdx]
      // Handle both local filenames and absolute URLs
      if (img.startsWith('http')) {
        setPrimaryMoodboardUrl(img)
      } else {
        setPrimaryMoodboardUrl(`/projects/${currentProject.id}/${img}`)
      }
    } else {
      setPrimaryMoodboardUrl(null)
    }
  }, [currentProject, storyPlan?.moodImages])

  // Listen for primary moodboard changes and generation completion
  useEffect(() => {
    updatePrimaryMoodboard()
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('moodboard-primary-')) {
        updatePrimaryMoodboard()
      }
    }
    const handleCustomEvent = () => updatePrimaryMoodboard()

    // Handle moodboard generation completion from the service
    const handleMoodboardComplete = async (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (!detail || detail.projectId !== currentProject?.id) return

      console.log('📸 [Moodboard] Generation complete, updating UI:', detail)

      // Update UI with new images
      if (detail.images && detail.images.length > 0) {
        setStoryPlan(prev => {
          if (!prev) return prev
          const currentImages = (prev as any).moodImages || []

          // If promptIndex specified, update that specific image
          if (detail.promptIndex !== undefined) {
            const updated = [...currentImages]
            updated[detail.promptIndex] = detail.images[0]
            return { ...prev, moodImages: updated }
          }

          // Otherwise append new images
          return { ...prev, moodImages: [...currentImages, ...detail.images] }
        })
      }

      // Also refetch full data to ensure sync
      try {
        const response = await fetch(`/api/storyteller/projects/${detail.projectId}`)
        if (response.ok) {
          const data = await response.json()
          const bible = data.seriesBible || data.series_bible
          if (bible?.moodImages) {
            setStoryPlan(prev => (prev ? { ...prev, moodImages: bible.moodImages } : prev))
          }
        }
      } catch (error) {
        console.error('Failed to refetch moodboard data:', error)
      }

      updatePrimaryMoodboard()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('moodboard-primary-changed', handleCustomEvent)
    window.addEventListener('moodboard-generation-complete', handleMoodboardComplete)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('moodboard-primary-changed', handleCustomEvent)
      window.removeEventListener('moodboard-generation-complete', handleMoodboardComplete)
    }
  }, [updatePrimaryMoodboard, currentProject?.id])

  const [isFetchingCharacters, setIsFetchingCharacters] = useState(false)
  const [isDeletingCharacter, setIsDeletingCharacter] = useState(false)
  const [characterWebVersion, setCharacterWebVersion] = useState(0)

  // Fetch characters - using cachedFetch to prevent infinite loops on remount
  useEffect(() => {
    let isMounted = true
    const projectId = currentProject?.id
    if (!projectId) return

    setIsFetchingCharacters(true)

    cachedFetch(
      `characters:${projectId}`,
      async () => {
        const res = await fetch(`/api/storyteller/characters?projectId=${projectId}`)
        return res.json()
      },
      { ttlMs: 60_000 } // Cache for 1 minute
    )
      .then(data => {
        if (!isMounted) return
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
      .catch(err => console.error('Failed to fetch characters:', err))
      .finally(() => {
        if (isMounted) setIsFetchingCharacters(false)
      })

    return () => {
      isMounted = false
    }
  }, [currentProject?.id])

  // Resume any pending moodboard generations on mount
  useEffect(() => {
    const projectId = currentProject?.id
    if (projectId) {
      import('@/domains/storyteller/services/MoodboardGenerationService').then(({ moodboardGenerationService }) =>
        moodboardGenerationService.resumePendingGenerations(projectId, async () => {
          try {
            const response = await fetch(`/api/storyteller/projects/${projectId}`)
            if (response.ok) {
              const data = await response.json()
              const bible = data.seriesBible || data.series_bible
              if (bible?.moodImages) {
                setStoryPlan(prev => (prev ? { ...prev, moodImages: bible.moodImages } : prev))
              }
            }
          } catch (error) {
            console.error('Failed to refetch moodboard data:', error)
          }
        })
      )
    }
  }, [currentProject?.id])

  // Fetch beats for selected episode
  useEffect(() => {
    if (currentEpisodeId) {
      fetch(`/api/storyteller/timeline?episodeId=${currentEpisodeId}`)
        .then(res => res.json())
        .then(data => {
          if (data.beats) {
            setBeats(
              data.beats.map((b: any) => ({
                id: b.id,
                sequence: b.sequence,
                logline: b.logline || b.log_line || 'Untitled beat',
                beatType: b.beat_type || b.beatType || 'default',
                status: b.status || 'proposed',
              }))
            )
          }
        })
        .catch(err => console.error('Failed to fetch beats:', err))
    } else {
      setBeats([])
      setSelectedBeatId(null)
    }
  }, [currentEpisodeId])

  // Fetch story plan for selected episode OR load project bible
  useEffect(() => {
    // Stability Check: If we already have the right data for the current context, skip
    const isEpisodeContext = !!currentEpisodeId
    // Check for BOTH series_bible AND story_plan - worldRules are stored in story_plan!
    const projectAny = currentProject as any
    const hasSeriesBible = !!projectAny?.series_bible || !!projectAny?.seriesBible
    const hasStoryPlan = !!projectAny?.story_plan || !!projectAny?.storyPlan
    const isGlobalContext = !currentEpisodeId && (hasSeriesBible || hasStoryPlan)

    // Skip if no context at all - but DON'T wipe existing storyPlan if we have it from hydration
    if (!currentEpisodeId && !hasSeriesBible && !hasStoryPlan) {
      console.log('❌ [Debug] No Episode selected and No Series Bible/Story Plan found.')
      // ONLY set to null if we don't already have storyPlan from hydration
      // This prevents wiping out worldRules that were loaded during hydration
      setStoryPlan(prev => {
        if (prev && (prev.worldRules?.length || prev.plotTwists?.length || prev.factions?.length)) {
          console.log(
            '🛡️ [Debug] Preserving existing storyPlan with',
            prev.worldRules?.length,
            'worldRules'
          )
          return prev
        }
        return null
      })
      return
    }

    console.log('🔍 [Debug] Plan Effect Triggered:', {
      episodeId: currentEpisodeId,
      projectId: currentProject?.id,
      hasBible: !!currentProject?.series_bible,
    })

    if (currentEpisodeId) {
      console.log('🔍 [Debug] Fetching plan for episode:', currentEpisodeId)
      setIsFetchingPlan(true)
      fetch(`/api/storyteller/plan?episodeId=${currentEpisodeId}`)
        .then(res => res.json())
        .then(data => {
          console.log('📥 [Debug] Plan API Received:', data)
          // Fix TS errors by handling potentially loose types on currentProject
          const projectAny = currentProject as any
          const hasProjectData =
            projectAny?.seriesBible ||
            projectAny?.series_bible ||
            projectAny?.storyPlan ||
            projectAny?.story_plan

          if (data.storyPlan || hasProjectData) {
            console.log('✅ [Debug] Setting storyPlan for Episode with Merged Context')

            // MERGE STRATEGY:
            // 1. Series Bible (Global Truths: Factions, Rules, World Desc)
            // 2. Season Plan (Global Arc: Sequences, Summary)
            // 3. Episode Specifics (Overrides if any)

            let bible = projectAny?.seriesBible || projectAny?.series_bible || {}

            // Unpack nested categories if present
            const categories = [
              'General',
              'Setting',
              'History',
              'Magic',
              'Factions',
              'Technology',
              'Culture',
            ]
            const processedInit = { ...bible }
            for (const cat of categories) {
              if (bible[cat]) {
                Object.assign(processedInit, bible[cat])
              }
            }
            bible = processedInit
            const seasonPlan = projectAny?.storyPlan || projectAny?.story_plan || {}
            const episodePlan = (data.storyPlan || {}) as any

            const newPlan = {
              ...bible,
              ...seasonPlan,
              ...episodePlan,
              // Explicitly ensure critical fields are not lost if they are missing in one layer
              // Priority: episode > seasonPlan (storyPlan table) > bible > updatedFields
              sequences: episodePlan.sequences || seasonPlan.sequences ||
                seasonPlan.episodeRoadmap?.episodes || seasonPlan.episodeRoadmap?.sequences || [],
              factions:
                episodePlan.factions ||
                seasonPlan.factions ||
                bible.factions ||
                bible.updatedFields?.factions ||
                [],
              worldRules:
                episodePlan.worldRules ||
                seasonPlan.worldRules ||
                bible.worldRules ||
                bible.updatedFields?.worldRules ||
                [],
              plotTwists:
                episodePlan.plotTwists ||
                seasonPlan.plotTwists ||
                bible.plotTwists ||
                bible.updatedFields?.plotTwists ||
                [],
              keyCharacters:
                episodePlan.keyCharacters ||
                seasonPlan.keyCharacters ||
                bible.keyCharacters ||
                bible.updatedFields?.characters ||
                [],
              soundtracks:
                episodePlan.soundtracks || seasonPlan.soundtracks || bible.soundtracks || [],
              moodImages: episodePlan.moodImages || bible.moodImages || [],
              imagePrompts: episodePlan.imagePrompts || bible.imagePrompts || {},
              seasonStructure:
                episodePlan.seasonStructure ||
                seasonPlan.seasonStructure ||
                bible.seasonStructure ||
                {},
              // Ensure we keep the project info
              projectId: currentProject?.id,
            }

            console.log(
              '📊 [Debug] Merged plan worldRules:',
              newPlan.worldRules?.length,
              'from sources:',
              {
                episode: episodePlan.worldRules?.length,
                season: seasonPlan.worldRules?.length,
                bible: bible.worldRules?.length,
                updatedFields: bible.updatedFields?.worldRules?.length,
              }
            )

            setStoryPlan(newPlan)
            setIsPlanApproved(data.planApproved)

            // Load phase from DB, but infer correct phase from data state
            let phase = data.currentPhase || 'premise'

            // Infer phase from actual data state to fix any misalignment
            // If script exists and is substantial, we're in writing or complete
            if (data.script && data.script.length > 100) {
              if (phase === 'premise' || phase === 'breaking') {
                phase = 'writing'
              }
            }

            setCurrentPhase(phase)

            // Load script if present
            if (data.script) {
              setScript(data.script)
            }
          } else {
            // No episode-specific plan - fall back to global series bible + story_plan
            const projectAnyFallback = currentProject as any
            const rawBible =
              projectAnyFallback?.series_bible || projectAnyFallback?.seriesBible || {}
            const rawStoryPlan =
              projectAnyFallback?.story_plan || projectAnyFallback?.storyPlan || {}

            if (rawBible || Object.keys(rawStoryPlan).length > 0) {
              console.log(
                '📖 [Debug] No episode plan, using Global Series Bible + Story Plan (Unpacking...)'
              )

              // Start with storyPlan data (has worldRules, plotTwists, etc.)
              const processedBible: any = { ...rawStoryPlan }

              // Merge known categories from bible
              const categories = [
                'General',
                'Setting',
                'History',
                'Magic',
                'Factions',
                'Technology',
                'Culture',
                'updatedFields',
              ]
              for (const cat of categories) {
                if (rawBible[cat]) {
                  Object.assign(processedBible, rawBible[cat])
                }
              }

              // Ensure critical fields from both sources
              processedBible.worldRules =
                rawStoryPlan.worldRules ||
                rawBible.worldRules ||
                rawBible.updatedFields?.worldRules ||
                []
              processedBible.plotTwists =
                rawStoryPlan.plotTwists ||
                rawBible.plotTwists ||
                rawBible.updatedFields?.plotTwists ||
                []
              processedBible.keyCharacters =
                rawStoryPlan.keyCharacters ||
                rawBible.keyCharacters ||
                rawBible.updatedFields?.characters ||
                []
              processedBible.factions =
                rawStoryPlan.factions || rawBible.factions || rawBible.updatedFields?.factions || []
              processedBible.soundtracks = rawStoryPlan.soundtracks || rawBible.soundtracks || []
              processedBible.sequences = rawStoryPlan.sequences || rawBible.sequences || []
              processedBible.seasonStructure =
                rawStoryPlan.seasonStructure || rawBible.seasonStructure || {}

              console.log('📊 [Debug] Fallback plan worldRules:', processedBible.worldRules?.length)
              setStoryPlan(processedBible)
            } else {
              setStoryPlan(null)
            }
            setIsPlanApproved(false)
            setCurrentPhase(data.currentPhase || 'premise')
          }
        })
        .catch(err => console.error('Failed to fetch plan:', err))
        .finally(() => setIsFetchingPlan(false))
    } else if (hasSeriesBible || hasStoryPlan) {
      console.log(
        '📖 [Debug] Loading Global Series Bible/Story Plan (DELEGATED TO MAIN HYDRATION LOOP)'
      )
      // DO NOT setStoryPlan here. It overwrites the robust parsing at the top of the file.
      // The top-level useEffect now handles merging General/Setting/etc.
      // However, if storyPlan is still null, trigger a re-hydration
      if (!storyPlan) {
        console.log('🔄 [Debug] storyPlan is null, manually triggering hydration...')
        const rawBible = projectAny?.series_bible || projectAny?.seriesBible || {}
        const rawStoryPlan = projectAny?.story_plan || projectAny?.storyPlan || {}

        // Merge from both sources - storyPlan table has highest priority
        const initialPlan: any = { ...rawStoryPlan }

        // Unpack nested categories including updatedFields
        const categories = [
          'General',
          'Setting',
          'History',
          'Magic',
          'Factions',
          'Technology',
          'Culture',
          'updatedFields',
        ]
        for (const cat of categories) {
          if (rawBible[cat]) Object.assign(initialPlan, rawBible[cat])
        }

        // Apply plan fields - rawStoryPlan has highest priority
        const planFields = [
          'soundtracks',
          'worldRules',
          'factions',
          'keyCharacters',
          'plotTwists',
          'inspirations',
          'worldDescription',
          'genre',
          'tone',
          'sequences',
          'seasonStructure',
          'centralTheme',
          'masterPrompt',
          'moodImages',
        ]
        for (const field of planFields) {
          // Priority: rawStoryPlan > rawBible.updatedFields > rawBible
          if (
            !initialPlan[field] ||
            (Array.isArray(initialPlan[field]) && initialPlan[field].length === 0)
          ) {
            if (rawStoryPlan[field] !== undefined && rawStoryPlan[field] !== null) {
              initialPlan[field] = rawStoryPlan[field]
            } else if (rawBible.updatedFields?.[field] !== undefined) {
              initialPlan[field] = rawBible.updatedFields[field]
            } else if (rawBible[field] !== undefined) {
              initialPlan[field] = rawBible[field]
            }
          }
        }

        // Also check for characters alias in updatedFields
        if (
          rawBible.updatedFields?.characters &&
          (!initialPlan.keyCharacters || initialPlan.keyCharacters.length === 0)
        ) {
          initialPlan.keyCharacters = rawBible.updatedFields.characters
        }

        if (Object.keys(initialPlan).length > 0) {
          console.log('✅ [Debug] Manually hydrated storyPlan with keys:', Object.keys(initialPlan))
          console.log('✅ [Debug] worldRules count:', initialPlan.worldRules?.length || 0)
          console.log('✅ [Debug] worldRules sources:', {
            fromStoryPlan: rawStoryPlan?.worldRules?.length,
            fromUpdatedFields: rawBible?.updatedFields?.worldRules?.length,
            fromBible: rawBible?.worldRules?.length,
          })
          setStoryPlan(initialPlan)
        }
      }
    }
    // Use stable dependencies to prevent infinite loops - only re-run when IDs change, not object refs
    // We include hasStoryPlan to re-run when story_plan becomes available (contains worldRules!)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentEpisodeId,
    currentProject?.id,
    !!(currentProject as any)?.series_bible,
    !!(currentProject as any)?.story_plan,
    !!(currentProject as any)?.storyPlan,
  ])

  // Save phase to DB when it changes
  const savePhaseToDb = useCallback(
    async (phase: string) => {
      if (!currentEpisodeId) return
      try {
        await fetch('/api/storyteller/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            episodeId: currentEpisodeId,
            currentPhase: phase,
          }),
        })
      } catch (error) {
        console.error('Failed to save phase:', error)
      }
    },
    [currentEpisodeId]
  )

  // Sync phase based on data state (beats exist = at least breaking phase)
  useEffect(() => {
    // Only sync if we have beats but phase is still 'premise' - this is a mismatch
    if (beats.length > 0 && currentPhase === 'premise' && currentEpisodeId) {
      console.log('🔄 [Phase Sync] Beats exist but phase is premise - advancing to breaking')
      setCurrentPhase('breaking')
      savePhaseToDb('breaking')
    }
  }, [beats.length, currentPhase, currentEpisodeId, savePhaseToDb])

  const handleCreateCharacter = async (char: any) => {
    if (!currentProject?.id) return
    try {
      const res = await fetch('/api/storyteller/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...char, projectId: currentProject.id }),
      })
      const newChar = await res.json()
      if (newChar.id) {
        // Clear cache so future fetches get updated data
        clearFetchCache(`characters:${currentProject.id}`)
        setCharacters(prev => [
          {
            ...newChar,
            stress: newChar.stressLevel ?? newChar.stress_level ?? 30,
            trust: newChar.trustLevel ?? newChar.trust_level ?? 50,
            power: newChar.powerLevel ?? newChar.power_level ?? 30,
            morality: newChar.moralityLevel ?? newChar.morality_level ?? 50,
            hope: newChar.hopeLevel ?? newChar.hope_level ?? 60,
            isolation: newChar.isolationLevel ?? newChar.isolation_level ?? 20,
            transformation: newChar.transformationProgress ?? newChar.transformation_progress ?? 0,
          },
          ...prev,
        ])
      }
    } catch (error) {
      console.error('Failed to create character:', error)
    }
  }

  const handleUpdateCharacter = async (id: string, updates: any) => {
    try {
      const res = await fetch('/api/storyteller/characters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      })
      const updated = await res.json()
      if (updated.id) {
        setCharacters(prev =>
          prev.map(c =>
            c.id === id
              ? {
                ...updated,
                stress: updated.stressLevel ?? updated.stress_level ?? c.stress,
                trust: updated.trustLevel ?? updated.trust_level ?? c.trust,
                power: updated.powerLevel ?? updated.power_level ?? c.power,
                morality: updated.moralityLevel ?? updated.morality_level ?? c.morality,
                hope: updated.hopeLevel ?? updated.hope_level ?? c.hope,
                isolation: updated.isolationLevel ?? updated.isolation_level ?? c.isolation,
                transformation:
                  updated.transformationProgress ??
                  updated.transformation_progress ??
                  c.transformation,
              }
              : c
          )
        )
      }
    } catch (error) {
      console.error('Failed to update character:', error)
    }
  }

  const handleDeleteCharacter = async (id: string) => {
    try {
      setIsDeletingCharacter(true)
      const res = await fetch(`/api/storyteller/characters?id=${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        // Clear cache so future fetches get updated data
        if (currentProject?.id) clearFetchCache(`characters:${currentProject.id}`)
        setCharacters(prev => prev.filter(c => c.id !== id))
        setCharacterWebVersion(prev => prev + 1)
      }
    } catch (error) {
      console.error('Failed to delete character:', error)
    } finally {
      setIsDeletingCharacter(false)
    }
  }

  // Story Plan Handlers
  const handleApprovePlan = useCallback(async () => {
    if (!storyPlan || !currentProject?.id) return

    try {
      // Save approved plan to database with approved flag AND phase change
      await fetch('/api/storyteller/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject.id,
          episodeId: currentEpisodeId,
          storyPlan,
          approved: true,
          currentPhase: 'breaking', // Move to breaking phase
        }),
      })

      setIsPlanApproved(true)
      setCurrentPhase('breaking')
      setActiveTab('board')

      setMessages(prev => [
        ...prev,
        {
          sender: 'System',
          content: '✅ Story plan approved! Now breaking into individual beats...',
          type: 'ai',
        },
      ])
    } catch (error) {
      console.error('Failed to save plan:', error)
    }
  }, [storyPlan, currentProject?.id, currentEpisodeId])

  const handleUpdateSequence = useCallback(
    async (sequenceId: number, updates: Partial<StorySequence>) => {
      if (!storyPlan) return

      // Update local state
      setStoryPlan(prev => {
        if (!prev) return prev
        return {
          ...prev,
          sequences: (prev.sequences || []).map(seq =>
            seq.id === sequenceId ? { ...seq, ...updates } : seq
          ),
        }
      })

      // Persist to database
      if (currentEpisodeId) {
        try {
          await fetch('/api/storyteller/plan', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              episodeId: currentEpisodeId,
              sequenceId,
              updates,
            }),
          })
        } catch (error) {
          console.error('Failed to save sequence update:', error)
        }
      }
    },
    [storyPlan, currentEpisodeId]
  )

  const handleDraftFirstEpisode = useCallback(async () => {
    if (!currentProject?.id || isSending) return

    try {
      setIsSending(true)
      // 1. Create the episode
      const res = await fetch('/api/storyteller/episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject.id,
          title: 'Episode 1: The Beginning',
          sequence: 1,
        }),
      })
      const newEpisode = await res.json()

      if (newEpisode?.id) {
        // 2. Select it (Update URL and state)
        const params = new URLSearchParams(searchParams?.toString() || '')
        params.set('episodeId', newEpisode.id)
        router.push(`?${params.toString()}`)
        setCurrentEpisodeId(newEpisode.id)

        // Use a small timeout to ensure the state update is processed
        setTimeout(() => {
          handleSendMessage(
            undefined,
            'Let\'s draft the first episode. Start by generating a compelling premise for \'Episode 1: The Beginning\'.'
          )
        }, 100)
      }
    } catch (error) {
      console.error('Failed to draft first episode:', error)
      setIsSending(false)
    }
  }, [currentProject?.id, isSending, handleSendMessage, searchParams, router])

  const handleGenerateBible = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('bible', 'open')
    router.push(`?${params.toString()}`)

    // Give it a tiny bit of time for the panel to open before sending message
    setTimeout(() => {
      handleSendMessage(
        undefined,
        'Let\'s build the series foundation. Help me define the genre, tone, and core rules for this world.'
      )
    }, 100)
  }, [searchParams, router, handleSendMessage])

  // Phase Navigation Handlers
  const PHASE_ORDER = ['premise', 'breaking', 'writing', 'complete']

  // Confirmation dialog for going back in phases (will clear current phase data)
  const { confirm: confirmPhaseBack, ConfirmDialogComponent: PhaseBackConfirmDialog } =
    useConfirmDialog()

  const handlePreviousPhase = useCallback(async () => {
    const idx = PHASE_ORDER.indexOf(currentPhase)
    if (idx > 0) {
      // Show confirmation dialog - going back will erase current phase data
      const phaseNames: Record<string, string> = {
        premise: 'Premise',
        breaking: 'Story Beats',
        writing: 'Script',
        complete: 'Complete',
      }

      const confirmed = await confirmPhaseBack({
        title: 'Go Back to Previous Phase?',
        description: `Going back will erase all data from the current "${phaseNames[currentPhase]}" phase. This action cannot be undone.`,
        confirmLabel: 'Go Back',
        cancelLabel: 'Stay Here',
        variant: 'destructive',
      })

      if (!confirmed) return

      // Clear current phase data
      if (currentPhase === 'writing') {
        setScript('')
        // TODO: Clear script from DB
      } else if (currentPhase === 'breaking') {
        setBeats([])
        // TODO: Clear beats from DB
      }
      // Note: premise phase data is kept as it's the foundation

      const prevPhase = PHASE_ORDER[idx - 1]
      setCurrentPhase(prevPhase)
      if (prevPhase === 'premise') setActiveTab('plan')
      else if (prevPhase === 'writing') setActiveTab('script')
      else setActiveTab('board')

      // Save to DB
      await savePhaseToDb(prevPhase)
    }
  }, [currentPhase, savePhaseToDb, confirmPhaseBack])

  // Direct phase navigation - allows clicking on any previous phase
  const handlePhaseChange = useCallback(
    async (targetPhase: string) => {
      const currentIdx = PHASE_ORDER.indexOf(currentPhase)
      const targetIdx = PHASE_ORDER.indexOf(targetPhase)

      // Only allow going to previous phases or staying on current
      if (targetIdx >= currentIdx) return

      const phaseNames: Record<string, string> = {
        premise: 'Premise',
        breaking: 'Story Beats',
        writing: 'Script',
        complete: 'Complete',
      }

      // Confirm if we're skipping phases (e.g., writing -> premise)
      const phasesToClear = PHASE_ORDER.slice(targetIdx + 1, currentIdx + 1)
      const clearingMultiple = phasesToClear.length > 1

      const confirmed = await confirmPhaseBack({
        title: `Go to ${phaseNames[targetPhase]}?`,
        description: clearingMultiple
          ? `This will clear data from: ${phasesToClear.map(p => phaseNames[p]).join(', ')}. This cannot be undone.`
          : `Going back will clear "${phaseNames[currentPhase]}" phase data. This cannot be undone.`,
        confirmLabel: `Go to ${phaseNames[targetPhase]}`,
        cancelLabel: 'Cancel',
        variant: 'destructive',
      })

      if (!confirmed) return

      // Clear phases between target and current
      for (const phase of phasesToClear) {
        if (phase === 'writing') {
          setScript('')
        } else if (phase === 'breaking') {
          setBeats([])
        }
      }

      setCurrentPhase(targetPhase)
      if (targetPhase === 'premise') setActiveTab('plan')
      else if (targetPhase === 'writing') setActiveTab('script')
      else setActiveTab('board')

      await savePhaseToDb(targetPhase)
    },
    [currentPhase, savePhaseToDb, confirmPhaseBack]
  )

  // Note: Forward navigation removed - use AI to advance phases naturally
  const canGoBack = PHASE_ORDER.indexOf(currentPhase) > 0

  // Track pending action executions to ensure cleanup waits for them - actually hook handles async actions if we await them in onAction!
  // But our executeAction is async. The hook awaits onAction. So we are good!

  // Stop streaming handler removed (handled by hook)

  // Use ref for currentEpisodeId to avoid stale closure
  // Helper functions and actions removed (already defined above)

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
          ...((currentProject?.series_bible as any) || {}),
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
          stressLevel: c.stress || 30,
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
      const detail = (e as CustomEvent).detail
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
            ...((currentProject?.series_bible as any) || {}),
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
        const sectionName = detail.section
        setGeneratingSection(sectionName)
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
            ...((currentProject?.series_bible as any) || {}),
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
            ...((currentProject?.series_bible as any) || {}),
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
      const detail = (e as CustomEvent).detail
      if (!detail) return

      // 1. Optimistic Update
      setStoryPlan(prev => {
        if (!prev) return { premise: detail } as any

        // If the top-level storyPlan object is actually just a premise, 
        // merge directly. Otherwise merge into the premise property.
        // It's usually nested under .premise for episodes.
        return {
          ...prev,
          premise: { ...(prev as any).premise, ...detail },
          title: detail.title || (prev as any).title,
        } as any
      })

      // 2. Update Title
      if (detail.title) {
        setCurrentEpisodeTitle(detail.title)
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
            setStoryPlan(prev => (prev ? { ...prev, moodImages: newMoodImages } : prev))
          }
          useWorldStore.getState().setCurrentProject({
            ...latestProject,
            series_bible: {
              ...(latestProject.series_bible as Record<string, unknown> || {}),
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
          const currentBible = (latestProject.series_bible as StoryPlan) || {}
          const newBible = { ...currentBible, ...updates }
          useWorldStore.getState().setCurrentProject({
            ...latestProject,
            series_bible: newBible,
          })
          if (!currentEpisodeId) {
            setStoryPlan(newBible)
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
      // 1. Optimistic Update
      const newBible = {
        ...(storyPlan || (currentProject?.series_bible as any) || {}),
        ...updates,
      } as StoryPlan

      setStoryPlan(prev => {
        if (!prev) return newBible
        return { ...prev, ...updates }
      })

      // 2. Persist to DB
      if (!currentProject?.id) return

      // Update local store immediately for responsiveness
      useWorldStore.getState().setCurrentProject({
        ...currentProject,
        series_bible: newBible,
      })

      await fetch(`/api/storyteller/projects/${currentProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ series_bible: newBible, story_plan: newBible }),
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

  const StableQuestionComponent = useCallback(
    ({ question, onAnswer, onSkip }: { question: any; onAnswer: (a: string | string[]) => void; onSkip: () => void }) => (
      <QuestionCard
        question={question as unknown as AgentQuestion}
        onAnswer={onAnswer}
        onSkip={onSkip}
      />
    ),
    []
  )

  const worldBiblePanelStoryPlan = useMemo(
    () =>
      ((storyPlan || {
        title: currentProject?.name || 'Untitled',
        genre: '',
        tone: '',
        centralQuestion: '',
        themes: [],
        worldRules: [],
        factions: [],
        keyCharacters: characters as any,
        protagonist: null,
        antagonist: null,
        executiveSummary: null,
        moodImages: [],
      }) as any),
    [characters, currentProject?.name, storyPlan]
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

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden font-sans">
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Navigation & Context */}
        <DomainSidebar
          header={
            <div className="flex items-center gap-3 group cursor-default">
              <SidebarHeader>Storyteller</SidebarHeader>
              <Button
                variant={isWorldBibleOpen ? 'default' : 'outline'}
                size="sm"
                onClick={toggleBible}
                disabled={isSending}
                className={cn(
                  'h-7 px-3 gap-1.5 text-[10px] font-bold border transition-colors duration-150 rounded-md uppercase tracking-widest active:scale-[0.98]',
                  isWorldBibleOpen
                    ? isBibleLocked
                      ? 'bg-red-500/15 text-red-400 border-red-500/40 hover:bg-red-500/25'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/40 hover:bg-amber-500/25'
                    : isBibleLocked
                      ? 'bg-transparent text-red-400/70 border-red-500/30 hover:bg-red-500/10 hover:text-red-400'
                      : 'bg-transparent text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground',
                  isSending && 'opacity-50 cursor-not-allowed'
                )}
                title={
                  isSending
                    ? 'Storybible unavailable while agents are working'
                    : isBibleLocked
                      ? `Storybible Locked by ${bibleLockedBy || 'Admin'} - ${isWorldBibleOpen ? 'Close' : 'Open'} (Read-Only)`
                      : isWorldBibleOpen
                        ? 'Close Storybible'
                        : 'Open Storybible'
                }
                id={TOUR_STEP_IDS.STORYTELLER_BIBLE}
              >
                {isBibleLocked ? (
                  <Lock className="w-3.5 h-3.5" />
                ) : (
                  <BookOpen className="w-3.5 h-3.5" />
                )}
                <span>{isWorldBibleOpen ? 'BIBLE · OPEN' : 'STORYBIBLE'}</span>
              </Button>
            </div>
          }
          storageKey="storyteller"
        >
          {currentProject ? (
            <div className="space-y-6">
              {/* 1. Project Master Prompt */}
              <div id={TOUR_STEP_IDS.STORYTELLER_MASTER_PROMPT}>
                <SidebarSection icon={<Scroll size={12} />}>
                  <MasterPromptEditor
                    scope="Project"
                    initialPrompt={currentProject.master_prompt || ''}
                    onSave={handleSaveProjectPrompt}
                  />
                </SidebarSection>
              </div>

              {/* 2. Cast List - Characters displayed directly in sidebar */}
              <div id={TOUR_STEP_IDS.STORYTELLER_CHARACTERS}>
                <SidebarSection separator icon={<Users size={12} />}>
                  <CharacterPanel
                    characters={characters}
                    onUpdate={handleUpdateCharacter}
                    onCreate={handleCreateCharacter}
                    onDelete={handleDeleteCharacter}
                    projectId={currentProject?.id || ''}
                    selectedBeatId={selectedBeatId}
                    episodeId={currentEpisodeId}
                    isLoading={isFetchingCharacters || isDeletingCharacter}
                  />
                </SidebarSection>
              </div>

              {/* 3. Episode Manager - disabled while agents working */}
              <div id={TOUR_STEP_IDS.STORYTELLER_EPISODES}>
                <SidebarSection separator>
                  <div className={isSending ? 'opacity-50 pointer-events-none' : ''}>
                    <EpisodeManager
                      projectId={currentProject.id}
                      currentEpisodeId={currentEpisodeId}
                      onEpisodeChange={id => {
                        // Optimistic update
                        setCurrentEpisodeId(id)
                        const params = new URLSearchParams(searchParams?.toString() || '')
                        params.set('episodeId', id)
                        router.push(`?${params.toString()}`)
                      }}
                      onEpisodeTitleChange={title => setCurrentEpisodeTitle(title)}
                    />
                    {isSending && (
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <AlertCircle size={12} />
                        Can&apos;t change episode while agents are working
                      </div>
                    )}
                  </div>
                </SidebarSection>
              </div>

              {/* 4. Episode Prompt (if episode selected) */}
              {currentEpisodeId && (
                <SidebarSection separator icon={<FileText size={12} />}>
                  <MasterPromptEditor
                    scope="Episode"
                    initialPrompt={currentEpisode?.episode_prompt || ''}
                    onSave={handleSaveEpisodePrompt}
                  />
                </SidebarSection>
              )}
            </div>
          ) : (
            <SidebarEmptyState
              icon={<Users size={24} className="opacity-50" />}
              message="Please select a project to start."
            />
          )}
        </DomainSidebar>

        {/* Center: Workspace */}
        {/* Center: Workspace */}
        <div className="flex-1 flex flex-col relative border-r border-border h-full overflow-hidden bg-black">
          {/* Background image layer when primary moodboard is selected */}
          {primaryMoodboardUrl && (
            <div className="absolute inset-x-0 top-0 h-[400px] z-0 overflow-hidden pointer-events-none">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${primaryMoodboardUrl})`,
                  opacity: 0.35,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/70 to-black" />
            </div>
          )}
          {/* Layer 1: Episode content or empty state (always base layer) */}
          {currentEpisodeId ? (
            <>
              {/* Header Bar */}
              <div className="shrink-0 border-b border-border flex items-center px-4 bg-card justify-between z-40 relative py-2 gap-4 flex-wrap min-h-[60px]">
                <div className="flex items-center gap-3 shrink-0">
                  <h1 className="text-sm font-bold whitespace-nowrap">
                    {currentEpisodeTitle || `Ep. ${currentEpisodeId?.slice(0, 6) || ''}...`}
                  </h1>

                  {/* Unified Phase Navigator */}
                  <PhaseNavigatorCompact
                    currentPhase={currentPhase as any}
                    isWorking={isSending}
                    onGoBack={handlePreviousPhase}
                    onPhaseChange={handlePhaseChange}
                  />

                  {/* Relationships View Toggle */}
                  <button
                    onClick={() =>
                      setActiveTab(activeTab === 'relationships' ? 'plan' : 'relationships')
                    }
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 border',
                      activeTab === 'relationships'
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                        : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 border-transparent'
                    )}
                    title="View character & faction relationships"
                  >
                    <Network size={12} />
                    <span>Relationships</span>
                  </button>
                </div>

                {/* Tabs removed - phase now controls the view automatically */}
              </div>
              {/* Main Content Area */}
              <div className="flex-1 relative overflow-hidden">
                {activeTab === 'plan' && (
                  <StoryPlanBoard
                    storyPlan={storyPlan}
                    globalBible={currentProject?.series_bible as any}
                    onApprove={handleApprovePlan}
                    isGenerating={isSending}
                    isGeneratingPoster={isGeneratingPoster}
                    isGeneratingStoryboard={isGeneratingStoryboard}
                    isLoading={isFetchingPlan || isFetchingCharacters}
                    projectId={currentProject?.id || (params?.projectId as string) || 'unknown'}
                    episodeId={currentEpisodeId}
                    generatingSection={generatingSection}
                  />
                )}
                {activeTab === 'board' && (
                  <div className="flex-1 overflow-hidden relative h-full">
                    <div className="absolute inset-0 overflow-y-auto p-4">
                      <CorkBoard
                        beats={beats as any}
                        episodeId={currentEpisodeId || undefined}
                        onAddMessage={msg => setMessages(prev => [...prev, msg as any])}
                        onSendMessage={msg => handleSendMessage(undefined, msg)}
                        // Combined Storyboard Props
                        storyboardUrl={(storyPlan as any)?.storyboardUrl}
                        isGeneratingCombined={isGeneratingStoryboard}
                        onGenerateCombined={handleStoryboardTrigger}
                        projectId={currentProject?.id || (params?.projectId as string) || 'unknown'}
                      />
                    </div>
                  </div>
                )}
                {activeTab === 'script' && (
                  <div className="flex-1 overflow-hidden flex flex-col h-full">
                    <ScriptEditor
                      content={script}
                      onChange={setScript}
                      onRegenerateSelection={async (selection, instruction) => {
                        try {
                          const res = await fetch('/api/storyteller/script/edit', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ selection, instruction }),
                          })
                          const data = await res.json()
                          if (data.error) throw new Error(data.error)
                          return data.result
                        } catch (e) {
                          console.error('Regeneration failed:', e)
                          return selection
                        }
                      }}
                      isLoading={isScriptLoading}
                    />
                  </div>
                )}
                {activeTab === 'relationships' && (
                  <div className="flex-1 overflow-hidden relative h-full">
                    <CharacterWeb
                      projectId={currentProject?.id || (params?.projectId as string) || ''}
                      className="h-full"
                      focusEntityId={focusEntityId}
                      onNodeClick={handleCharacterWebNodeClick}
                      key={characterWebVersion}
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <StorytellerEmptyState
              hasBible={hasBible}
              hasEpisodes={hasEpisodes}
              firstEpisodeId={firstEpisodeId}
              isSending={isSending}
              onGenerateBible={handleGenerateBible}
              onDraftFirstEpisode={handleDraftFirstEpisode}
              onSelectFirstEpisode={selectEpisode}
              onOpenBible={() => {
                const params = new URLSearchParams(searchParams?.toString() || '')
                params.set('bible', 'open')
                router.push(`?${params.toString()}`)
              }}
            />
          )}

          {/* Layer 2: Bible overlay — floats on top based on bible=open param */}
          {isWorldBibleOpen && (
            <div className="absolute inset-0 z-20 bg-black overflow-hidden px-6 pb-6 animate-in fade-in zoom-in-95 duration-200">
              <WorldBiblePanel
                storyPlan={worldBiblePanelStoryPlan}
                projectId={currentProject?.id || ''}
                onUpdate={handleUpdateGlobalBible}
                onSendMessage={handleBibleSendMessage}
                isReadOnly={isSending}
                isLoading={isFetchingPlan}
                loadingSections={loadingSections}
                pendingActions={sectionPendingActions}
                onClose={closeWorldBiblePanel}
              />
            </div>
          )}
        </div>

        {/* Right Sidebar: Writers Room */}
        <DomainSidebar
          header={null}
          position="right"
          storageKey="writers-room"
          defaultWidth={384}
          rawContent
        >
          <div className="flex flex-col h-full" id={TOUR_STEP_IDS.STORYTELLER_CHAT}>
            <MentionsProvider
              projectId={currentProject?.id || ''}
              characters={characters}
              beats={beats}
              storyPlan={storyPlan}
            >
            <MentionsChatInterface
              isActivityPanelOpen={isActivityPanelOpen}
              onActivityToggle={toggleActivityPanel}
              isAdmin={isAdminUser(userEmail)}
              messages={messages}
              agentConfig={STORYTELLER_AGENT_CONFIG}
              projectId={currentProject?.id}
              thinkingAgent={thinkingAgent}
              streamingTokens={streamingTokens}
              activeOperations={chatActiveOperations}
              onSendMessage={handleChatSendMessage}
              onStopStream={handleStopStream}
              onQuestionAnswer={handleChatQuestionAnswer}
              onQuestionSkip={handleChatQuestionSkip}
              onApproveAllActions={handleApproveAllActions}
              isSending={isSending}
              showThinking={showThinking}
              currentPhase={currentPhase}
              ActionComponent={MemoizedActionComponent}
              QuestionComponent={StableQuestionComponent}
            >
              {/* Streaming Terminal - Only when Activity ON */}
              {isActivityPanelOpen && isTokenStreaming && streamingTokens && (
                <div className="mb-4 ml-8 animate-in fade-in duration-300">
                  <StreamingTerminal
                    streamingTokens={streamingTokens}
                    thinkingAgent={
                      thinkingAgent === 'RunnableSequence' ? 'agent' : thinkingAgent
                    }
                    fallbackAgentLabel="writers-room"
                  />
                </div>
              )}

              {/* Streaming Sections Inline - Only when Activity ON */}
              {isActivityPanelOpen && streamingSections.length > 0 && (
                <div className="mb-4 ml-8">
                  <StreamingSectionsInline sections={streamingSections} />
                </div>
              )}

              {/* Smart Quick Actions & Propose Next Step */}
              {!isSending && !isTokenStreaming && (
                <div className="mt-2 border-t border-border/10 pt-2 px-2 pb-1">
                  <div className="flex items-center justify-between mb-1.5 px-1">
                    <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-widest">
                      Suggested
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-2 text-[10px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
                      onClick={() => handleSendMessage(undefined, 'I\'d like to expand our cast of characters. Considering the setting and story so far, who would be an interesting new character to introduce next?')}
                    >
                      <Users className="w-3 h-3 mr-1" />
                      Add Cast
                    </Button>
                  </div>
                  <SmartQuickActions
                    currentPhase={currentPhase as any}
                    onSendMessage={msg => {
                      handleSendMessage(undefined, msg)
                    }}
                  />
                </div>
              )}
            </MentionsChatInterface>
            </MentionsProvider>
          </div>
        </DomainSidebar>
      </div >

      {/* Action Toasts - DISABLED (User prefers inline approvals only) */}
      {/* <ActionToastContainer entries={showToasts} onDismiss={handleDismissToast} /> */}

      {/* Timeline at Bottom */}
      <Timeline
        episodeId={currentEpisodeId}
        beats={beats}
        onBeatSelect={setSelectedBeatId}
        selectedBeatId={selectedBeatId}
        pendingQuestions={pendingQuestions}
      />

      {/* Phase Back Confirmation Dialog */}
      {PhaseBackConfirmDialog}

      {/* Cast Modal removed - Cast is now in left sidebar */}

      {/* Action Review Modal */}
      {
        reviewModalAction && (
          <ActionApprovalModal
            action={reviewModalAction.action}
            agentName={reviewModalAction.agentName}
            isOpen={!!reviewModalAction}
            isProcessing={
              messages[reviewModalAction.messageIndex]?.actions?.[reviewModalAction.actionIndex]?.status === 'executing'
            }
            onClose={() => setReviewModalAction(null)}
            onApprove={async () => {
              const { action, messageIndex, actionIndex } = reviewModalAction

              if ('id' in action && action.id) {
                updateActionStatusById(action.id as string, 'executing')
              } else if (messageIndex >= 0) {
                updateActionStatus(messageIndex, actionIndex, 'executing')
              } else {
                // Fallback: Try to find action in messages by finding matching payload/type
                // This handles the case where action came from sectionPendingActions with index -1
                const found = messages.map((m, mIdx) => ({
                  mIdx,
                  aIdx: m.actions?.findIndex(a =>
                    a.type === action.type &&
                    JSON.stringify(a.payload) === JSON.stringify(action.payload)
                  ) ?? -1
                })).find(res => res.aIdx !== -1)

                if (found) {
                  updateActionStatus(found.mIdx, found.aIdx, 'executing')
                }
              }

              // Set processing state on section pending action (so Bible overlay shows loading)
              const section = getActionSection(action.type)
              if (section) {
                setSectionPendingActions(prev => {
                  if (!prev[section]) return prev
                  return {
                    ...prev,
                    [section]: { ...prev[section], isProcessing: true },
                  }
                })
              }

              // Save current state for undo
              if (action.type.startsWith('UPDATE_')) {
                const actionId = `${messageIndex}-${actionIndex}`
                setUndoStack(prev => [
                  ...prev.slice(-4),
                  { storyPlan: storyPlan ? { ...storyPlan } : null, actionId },
                ])
              }

              try {
                // Execute the action (calls the backend)
                await executeAction(action as any)

                // Clear pending review overlay if it exists for this section
                if (section) {
                  setSectionPendingActions(prev => {
                    const { [section]: _, ...rest } = prev
                    return rest
                  })
                }

                // MANUAL STATE UPDATE:
                // For bible updates, we must update the local state immediately so the UI reflects it
                // and the entity extractor sees the new data for tooltips.
                if (action.type === 'UPDATE_FACTIONS') {
                  const factions = (action.payload as any).factions
                  if (factions) {
                    setStoryPlan(prev => (prev ? { ...prev, factions: factions } : prev))
                    // Also update store to be safe
                    const latest = useWorldStore.getState().currentProject
                    if (latest) {
                      useWorldStore.getState().setCurrentProject({
                        ...latest,
                        series_bible: { ...(latest.series_bible as any), factions },
                      })
                    }
                    toast.success('Factions updated')
                  }
                } else if (action.type === 'UPDATE_WORLD_RULES') {
                  const rules = (action.payload as any).worldRules
                  if (rules) {
                    setStoryPlan(prev => (prev ? { ...prev, worldRules: rules } : prev))
                    toast.success('World rules updated')
                  }
                } else if (action.type === 'UPDATE_EPISODE_ROADMAP') {
                  const payload = action.payload as any
                  // Support both new nested format and legacy flat format if any
                  const roadmap = payload.episodeRoadmap || payload

                  if (roadmap) {
                    setStoryPlan(prev => {
                      const base = prev || ({} as StoryPlan)
                      return {
                        ...base,
                        sequences: roadmap.episodes || roadmap.sequences || base.sequences,
                        seasonStructure: roadmap.seasonStructure || base.seasonStructure,
                        executiveSummary: roadmap.executiveSummary || base.executiveSummary,
                      }
                    })
                    toast.success('Roadmap updated')
                  }
                }

                if ('id' in action && action.id) {
                  updateActionStatusById(action.id as string, 'committed')
                } else if (messageIndex >= 0) {
                  updateActionStatus(messageIndex, actionIndex, 'committed')
                } else {
                  // Fallback for committed status
                  const found = messages.map((m, mIdx) => ({
                    mIdx,
                    aIdx: m.actions?.findIndex(a =>
                      a.type === action.type &&
                      JSON.stringify(a.payload) === JSON.stringify(action.payload)
                    ) ?? -1
                  })).find(res => res.aIdx !== -1)

                  if (found) {
                    updateActionStatus(found.mIdx, found.aIdx, 'committed')
                  }
                }
                setActionHistory(prev => [
                  {
                    id: `${messageIndex}-${actionIndex}`,
                    action,
                    agentName: reviewModalAction.agentName,
                    status: ActionStatus.COMMITTED,
                    timestamp: new Date(),
                  },
                  ...prev,
                ])
              } catch (e) {
                console.error('Approval failed', e)
                if ('id' in action && action.id) {
                  updateActionStatusById(action.id as string, 'pending')
                } else if (messageIndex >= 0) {
                  updateActionStatus(messageIndex, actionIndex, 'pending')
                }
                // Reset processing state on section overlay
                if (section) {
                  setSectionPendingActions(prev => {
                    if (!prev[section]) return prev
                    return {
                      ...prev,
                      [section]: { ...prev[section], isProcessing: false },
                    }
                  })
                }
              }
              setReviewModalAction(null)
            }}
            onReject={() => {
              const { action, messageIndex, actionIndex } = reviewModalAction
              if ('id' in action && action.id) {
                updateActionStatusById(action.id as string, 'rejected')
              } else if (messageIndex >= 0) {
                updateActionStatus(messageIndex, actionIndex, 'rejected')
              }
              // Clear section pending action overlay
              const section = getActionSection(action.type)
              if (section) {
                setSectionPendingActions(prev => {
                  const { [section]: _, ...rest } = prev
                  return rest
                })
              }
              setReviewModalAction(null)
            }}
          />
        )
      }
    </div >
  )
}
