'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { CorkBoard } from '@/domains/storyteller/components/CorkBoard'
import { CharacterPanel } from '@/domains/storyteller/components/CharacterPanel'
import { AgentLog, Message } from '@/domains/storyteller/components/AgentLog'
import { StreamingContent, StreamingSection } from '@/domains/storyteller/components/StreamingContent'
import { EpisodeManager } from '@/domains/storyteller/components/EpisodeManager'
import { MasterPromptEditor } from '@/domains/storyteller/components/MasterPromptEditor'
import { ScriptEditor } from '@/domains/storyteller/components/ScriptEditor'
import { Timeline } from '@/domains/storyteller/components/Timeline'
import { PendingActions } from '@/domains/storyteller/components/PendingActions'
import { ActionToastContainer } from '@/domains/storyteller/components/ActionToast'
import { StoryPlanBoard } from '@/domains/storyteller/components/StoryPlanBoard'
import { WorldBiblePanel } from '@/domains/storyteller/components/WorldBiblePanel'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { useGlobalStatusStore } from '@/store/useGlobalStatusStore'
import {
  Settings,
  Layout,
  FileText,
  X,
  Users,
  Zap,
  History,
  BookOpen,
  StopCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Map,
  Scroll,
  Film,
  Send,
} from 'lucide-react'
import {
  DomainSidebar,
  SidebarSection,
  SidebarEmptyState,
} from '@/components/ui/domain-sidebar'
import { regenerateText } from '@/domains/storyteller/services/script-operations'
import { StoryPlan, StorySequence } from '@/domains/storyteller/schemas/agent-schemas'
import { AgentAction, AgentQuestion, ActionHistoryEntry } from '@/domains/storyteller/actions/types'
import { QuestionSession, createQuestionSession } from '@/domains/storyteller/questions/types'
import { useProjectFromUrl } from '@/hooks/useProjectFromUrl'
import { LocalStorageKeys } from '@/constants/localStorage'
import { moodboardGenerationService } from '@/domains/storyteller/services/MoodboardGenerationService'

const MAX_ROUNDS = 15 // Hard stop after this many rounds

// Get model config from localStorage for API requests
function getModelConfigFromStorage() {
  if (typeof window === 'undefined') return { provider: 'openai' as const }

  const provider = localStorage.getItem(LocalStorageKeys.PREFERRED_MODEL_PROVIDER)
  const anthropicApiKey = localStorage.getItem(LocalStorageKeys.ANTHROPIC_API_KEY)

  // Get Gemini API key from existing AI_CONFIG_GEMINI structure
  let geminiApiKey: string | undefined
  const geminiConfig = localStorage.getItem(LocalStorageKeys.AI_CONFIG_GEMINI)
  if (geminiConfig) {
    try {
      const parsed = JSON.parse(geminiConfig)
      geminiApiKey = parsed.apiKey || undefined
    } catch {
      // ignore
    }
  }

  return {
    provider: (provider === 'anthropic' || provider === 'openai' || provider === 'gemini') ? provider : 'openai' as const,
    anthropicApiKey: anthropicApiKey || undefined,
    geminiApiKey: geminiApiKey || undefined,
  }
}

interface Beat {
  id: string
  sequence: number
  logline: string
  beatType: string
  status: string
}

export default function StorytellerPage() {
  // Load project from URL
  useProjectFromUrl()
  const searchParams = useSearchParams()

  const currentProject = useWorldStore(state => state.currentProject)
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(null)
  const [selectedBeatId, setSelectedBeatId] = useState<string | null>(null)

  // Character State
  const [characters, setCharacters] = useState<any[]>([])

  // Beats State
  const [beats, setBeats] = useState<Beat[]>([])

  // Script State
  const [script, setScript] = useState<string>('')
  const [isScriptLoading, setIsScriptLoading] = useState(false)
  const [currentPhase, setCurrentPhase] = useState<string>('premise')
  const [activeTab, setActiveTab] = useState<string>('plan')
  
  // Initialize bible open state from URL param
  const bibleParamValue = searchParams.get('bible')
  const [isWorldBibleOpen, setIsWorldBibleOpen] = useState(bibleParamValue === 'open')

  // Listen for world bible toggle
  useEffect(() => {
    const handleToggle = () => setIsWorldBibleOpen(prev => !prev)
    window.addEventListener('toggle-world-bible', handleToggle)
    return () => window.removeEventListener('toggle-world-bible', handleToggle)
  }, [])

  // Story Plan State (8-sequence structure)
  const [storyPlan, setStoryPlan] = useState<StoryPlan | null>(null)
  const [isPlanApproved, setIsPlanApproved] = useState(false)
  const [primaryMoodboardUrl, setPrimaryMoodboardUrl] = useState<string | null>(null)

  // Update primary moodboard background
  const updatePrimaryMoodboard = useCallback(() => {
    if (!currentProject?.id) return
    const savedPrimary = localStorage.getItem(`moodboard-primary-${currentProject.id}`)
    const primaryIdx = savedPrimary !== null ? parseInt(savedPrimary) : null
    if (primaryIdx !== null && storyPlan?.moodImages?.[primaryIdx]) {
      setPrimaryMoodboardUrl(`/projects/${currentProject.id}/${storyPlan.moodImages[primaryIdx]}`)
    } else {
      setPrimaryMoodboardUrl(null)
    }
  }, [currentProject?.id, storyPlan?.moodImages])

  // Listen for primary moodboard changes
  useEffect(() => {
    updatePrimaryMoodboard()
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('moodboard-primary-')) {
        updatePrimaryMoodboard()
      }
    }
    const handleCustomEvent = () => updatePrimaryMoodboard()
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('moodboard-primary-changed', handleCustomEvent)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('moodboard-primary-changed', handleCustomEvent)
    }
  }, [updatePrimaryMoodboard])

  // Fetch characters
  useEffect(() => {
    if (currentProject?.id) {
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
            }))
            setCharacters(mapped)
          }
        })
        .catch(err => console.error('Failed to fetch characters:', err))
    }
  }, [currentProject?.id])

  // Resume any pending moodboard generations on mount
  useEffect(() => {
    if (currentProject?.id) {
      moodboardGenerationService.resumePendingGenerations(currentProject.id, async () => {
        // Refetch project data when generation completes
        try {
          const response = await fetch(`/api/storyteller/projects/${currentProject.id}`)
          if (response.ok) {
            const data = await response.json()
            const bible = data.seriesBible || data.series_bible
            if (bible?.moodImages) {
              setStoryPlan(prev => prev ? { ...prev, moodImages: bible.moodImages } : prev)
            }
          }
        } catch (error) {
          console.error('Failed to refetch moodboard data:', error)
        }
      })
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
    console.log('🔍 [Debug] Plan Effect Triggered:', {
      episodeId: currentEpisodeId,
      hasProject: !!currentProject,
      hasBible: !!currentProject?.series_bible
    })

    if (currentEpisodeId) {
      console.log('🔍 [Debug] Fetching plan for episode:', currentEpisodeId)
      fetch(`/api/storyteller/plan?episodeId=${currentEpisodeId}`)
        .then(res => res.json())
        .then(data => {
          console.log('📥 [Debug] Plan API Received:', data)
          if (data.storyPlan) {
            console.log('✅ [Debug] Setting storyPlan from Episode')
            setStoryPlan(data.storyPlan)
            setIsPlanApproved(data.planApproved)

            // Load phase from DB
            const phase = data.currentPhase || 'premise'
            setCurrentPhase(phase)

            // Set appropriate tab based on phase
            if (phase === 'premise') setActiveTab('plan')
            else if (phase === 'writing') setActiveTab('script')
            else setActiveTab('board')
          } else {
            // No episode-specific plan - fall back to global series bible
            if (currentProject?.series_bible) {
              console.log('📖 [Debug] No episode plan, using Global Series Bible')
              setStoryPlan(currentProject.series_bible as StoryPlan)
            } else {
              setStoryPlan(null)
            }
            setIsPlanApproved(false)
            setCurrentPhase(data.currentPhase || 'premise')
          }
        })
        .catch(err => console.error('Failed to fetch plan:', err))
    } else if (currentProject?.series_bible) {
      console.log('📖 [Debug] Loading Global Series Bible')
      // Load Series Bible if no episode selected
      setStoryPlan(currentProject.series_bible as StoryPlan)
    } else {
      console.log('❌ [Debug] No Episode selected and No Series Bible found.')
    }
  }, [currentEpisodeId, currentProject])

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
      const res = await fetch(`/api/storyteller/characters?id=${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setCharacters(prev => prev.filter(c => c.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete character:', error)
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
          sequences: prev.sequences.map(seq =>
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

  // Phase Navigation Handlers
  const PHASE_ORDER = ['premise', 'breaking', 'writing', 'complete']

  const handlePreviousPhase = useCallback(async () => {
    const idx = PHASE_ORDER.indexOf(currentPhase)
    if (idx > 0) {
      const prevPhase = PHASE_ORDER[idx - 1]
      setCurrentPhase(prevPhase)
      if (prevPhase === 'premise') setActiveTab('plan')
      else if (prevPhase === 'writing') setActiveTab('script')
      else setActiveTab('board')

      // Save to DB
      await savePhaseToDb(prevPhase)
    }
  }, [currentPhase, savePhaseToDb])

  const handleNextPhase = useCallback(async () => {
    const idx = PHASE_ORDER.indexOf(currentPhase)
    if (idx < PHASE_ORDER.length - 1) {
      const nextPhase = PHASE_ORDER[idx + 1]
      setCurrentPhase(nextPhase)
      if (nextPhase === 'premise') setActiveTab('plan')
      else if (nextPhase === 'writing') setActiveTab('script')
      else setActiveTab('board')

      // Save to DB
      await savePhaseToDb(nextPhase)
    }
  }, [currentPhase, savePhaseToDb])

  const canGoBack = PHASE_ORDER.indexOf(currentPhase) > 0
  const canGoForward = PHASE_ORDER.indexOf(currentPhase) < PHASE_ORDER.length - 1

  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'Showrunner',
      content:
        'Welcome to the Writers Room! Select an episode to begin, then tell me about the story you want to create.',
      type: 'ai',
    },
  ])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [useStreaming, setUseStreaming] = useState(true)
  const [thinkingAgent, setThinkingAgent] = useState<string | null>(null)

  // Abort controller for stopping stream
  const abortControllerRef = useRef<AbortController | null>(null)
  const [roundCount, setRoundCount] = useState(0)

  // Actions & Questions State
  const [pendingQuestions, setPendingQuestions] = useState<QuestionSession[]>([])
  const [answeredQuestions, setAnsweredQuestions] = useState<
    { question: string; answer: string }[]
  >([])
  const [actionHistory, setActionHistory] = useState<ActionHistoryEntry[]>([])
  const [showToasts, setShowToasts] = useState<ActionHistoryEntry[]>([])
  const [showThinking, setShowThinking] = useState(false)
  const [isAwaitingInput, setIsAwaitingInput] = useState(false)

  // Streaming state for token-level updates
  const [streamingTokens, setStreamingTokens] = useState<string>('')
  const [streamingSections, setStreamingSections] = useState<Array<{
    key: string
    name: string
    status: 'pending' | 'streaming' | 'complete'
    preview?: string
  }>>([])
  const [isTokenStreaming, setIsTokenStreaming] = useState(false)
  const [useEnhancedStreaming, setUseEnhancedStreaming] = useState(true) // New streaming mode

  // Story decisions that have been made (to prevent re-asking)
  const [storyDecisions, setStoryDecisions] = useState<Record<string, string>>({})

  // Stop streaming handler
  const handleStopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsSending(false)
    setThinkingAgent(null)
    setMessages(prev => [
      ...prev,
      {
        sender: 'System',
        content: '⏹️ Stream stopped by user.',
        type: 'ai',
      },
    ])
  }, [])

  // Use ref for currentEpisodeId to avoid stale closure
  const episodeIdRef = useRef(currentEpisodeId)
  useEffect(() => {
    episodeIdRef.current = currentEpisodeId
  }, [currentEpisodeId])

  // Helper to refresh beats
  const refreshBeats = useCallback(async (episodeId: string) => {
    console.log('🔄 refreshBeats called for episode:', episodeId)
    try {
      const beatsRes = await fetch(`/api/storyteller/timeline?episodeId=${episodeId}`)
      console.log('🔄 Timeline response status:', beatsRes.status)
      const beatsData = await beatsRes.json()
      console.log('🔄 Timeline data:', beatsData)
      if (beatsData.beats && beatsData.beats.length > 0) {
        const mappedBeats = beatsData.beats.map((b: any) => ({
          id: b.id,
          sequence: b.sequence,
          logline: b.logline || b.log_line || 'Untitled beat',
          beatType: b.beat_type || b.beatType || 'default',
          status: b.status || 'proposed',
        }))
        console.log('✅ Setting beats:', mappedBeats.length, mappedBeats)
        setBeats(mappedBeats)
      } else {
        console.log('⚠️ No beats in response or empty array')
      }
    } catch (err) {
      console.error('❌ Failed to refresh beats:', err)
    }
  }, [])

  // Execute action via API (persist to database)
  const executeAction = useCallback(
    async (action: AgentAction) => {
      console.log('🎯 executeAction called with:', action.type)

      if (!currentProject?.id) {
        console.error('❌ No project ID, skipping action')
        return
      }

      const episodeId = episodeIdRef.current
      console.log('📍 Episode ID from ref:', episodeId)

      if (!episodeId && action.type === 'CREATE_BEAT') {
        console.error('❌ No episode ID for CREATE_BEAT, skipping')
        return
      }

      console.log('🚀 POSTing to /api/storyteller/actions:', action.type, 'episode:', episodeId)

      try {
        const res = await fetch('/api/storyteller/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            projectId: currentProject.id,
            episodeId: episodeId,
          }),
        })

        console.log('📬 Actions API response status:', res.status)
        const data = await res.json()
        console.log('📬 Actions API response data:', data)

        if (data.success) {
          console.log('✅ Action successful, result type:', data.result?.type)

          // Always refresh beats after CREATE_BEAT action
          if (action.type === 'CREATE_BEAT' && episodeId) {
            console.log('🔄 CREATE_BEAT success - calling refreshBeats...')
            await refreshBeats(episodeId)
            console.log('🔄 refreshBeats completed')
          }

          // Refresh data based on result type as well
          if (
            data.result?.type === 'beat_created' ||
            data.result?.type === 'beat_updated' ||
            data.result?.type === 'beat_deleted'
          ) {
            console.log('🔄 Beat result detected - calling refreshBeats...')
            if (episodeId) {
              await refreshBeats(episodeId)
            }
          } else if (
            data.result?.type === 'bible_updated' ||
            data.result?.type === 'world_rule_added'
          ) {
            if (data.result.seriesBible) {
              const bible = data.result.seriesBible
              setStoryDecisions(prev => ({
                ...prev,
                ...(bible.userDecisions || {}),
              }))

              // Handle both nested and flat structures
              const newPlan = bible.storyPlan || bible as StoryPlan
              setStoryPlan(newPlan)

              // Also update the store's currentProject to ensure consistency
              if (currentProject) {
                useWorldStore.getState().setCurrentProject({
                  ...currentProject,
                  series_bible: newPlan
                })
              }
            }
          } else if (data.result?.type === 'script_updated') {
            if (data.result.script) {
              setScript(data.result.script)
            } else if (data.result.seriesBible?.script) {
              setScript(data.result.seriesBible.script)
            }
          }
        } else {
          console.error('❌ Action failed:', data.error || data)
        }
      } catch (error) {
        console.error('❌ executeAction threw:', error)
      }
    },
    [currentProject, refreshBeats]
  )

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
          masterPrompt: currentProject?.masterPrompt || '',
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
        modelConfig: getModelConfigFromStorage(),
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
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Failed to continue after answer:', error)
        }
      }

      setThinkingAgent(null)
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
      const detail = (e as CustomEvent).detail;
      if (detail?.type === 'generate_episode_premise') {
        const userMsg: Message = {
          sender: 'User',
          content: "Please generate an episode premise using the Ozymandias framework.",
          type: 'human'
        }
        setMessages(prev => [...prev, userMsg])
        setIsSending(true)

        const payload = {
          message: "Please generate an episode premise using the Ozymandias framework. Delegate to the Episode Premise Architect.",
          projectId: currentProject?.id,
          threadId: currentEpisodeId || 'general',
          episodeId: currentEpisodeId,
          currentPhase: 'premise',
          seriesBible: {
            ...((currentProject?.series_bible as any) || {}),
            masterPrompt: currentProject?.masterPrompt || '',
          },
          characters: characters,
          modelConfig: getModelConfigFromStorage(),
          streamMode: 'events', // Always use enhanced streaming for premise generation
          progressiveGeneration: true,
        }

        abortControllerRef.current = new AbortController()

        fetch('/api/storyteller/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: abortControllerRef.current.signal,
        }).then(res => processStream(res, abortControllerRef.current!.signal))
          .catch(err => console.error("Trigger error:", err))
      }
    }
    window.addEventListener('trigger-agent-action', handleTrigger)
    return () => window.removeEventListener('trigger-agent-action', handleTrigger)
  }, [currentProject?.id, currentEpisodeId, characters])


  const handleQuestionSkip = useCallback(
    (questionId: string) => {
      setPendingQuestions(prev => prev.filter(q => q.id !== questionId))
      if (pendingQuestions.length <= 1) {
        setIsAwaitingInput(false)
      }
    },
    [pendingQuestions.length]
  )

  // Process SSE stream
  const processStream = async (
    res: Response,
    signal: AbortSignal,
    initialRoundCount: number = 0
  ) => {
    const reader = res.body?.getReader()
    const decoder = new TextDecoder()
    let localRoundCount = initialRoundCount

    if (reader) {
      try {
        while (true) {
          // Check if aborted
          if (signal.aborted) {
            reader.cancel()
            break
          }

          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))

                if (data.type === 'start') {
                  setThinkingAgent('Writers Room')
                  setStreamingTokens('')
                  setStreamingSections([])
                  setIsTokenStreaming(data.streamMode === 'events')
                  useGlobalStatusStore.getState().addOperation({
                    id: 'story-session',
                    type: 'story-agent',
                    label: 'Story Session',
                    details: 'Writers Room',
                    status: 'in-progress',
                  })
                } else if (data.type === 'token') {
                  // Token-level streaming
                  setStreamingTokens(prev => prev + (data.token || ''))
                } else if (data.type === 'section_start') {
                  // Progressive section generation starting
                  setStreamingSections(prev => {
                    const existing = prev.find(s => s.key === data.section)
                    if (existing) {
                      return prev.map(s => 
                        s.key === data.section 
                          ? { ...s, status: 'streaming' as const }
                          : s
                      )
                    }
                    return [...prev, {
                      key: data.section,
                      name: data.section,
                      status: 'streaming' as const,
                    }]
                  })
                } else if (data.type === 'section_complete') {
                  // Progressive section generation completed
                  setStreamingSections(prev => 
                    prev.map(s => 
                      s.key === data.section 
                        ? { ...s, status: 'complete' as const, preview: data.preview }
                        : s
                    )
                  )
                } else if (data.type === 'node_start') {
                  // Node starting
                  setThinkingAgent(data.node)
                  useGlobalStatusStore.getState().updateOperation('story-session', {
                    details: `${data.node} starting...`,
                  })
                } else if (data.type === 'node_complete') {
                  // Node completed - clear streaming tokens for next node
                  setStreamingTokens('')
                } else if (data.type === 'message') {
                  setThinkingAgent(data.node)
                  // Update operation details to show current agent
                  if (data.node) {
                    useGlobalStatusStore.getState().updateOperation('story-session', {
                      details: data.node,
                    })
                  }
                  setMessages(prev => [...prev, data.message])

                  // Increment round count for AI messages
                  if (data.message.type === 'ai') {
                    localRoundCount++
                    setRoundCount(localRoundCount)

                    // Hard stop at MAX_ROUNDS
                    if (localRoundCount >= MAX_ROUNDS) {
                      setMessages(prev => [
                        ...prev,
                        {
                          sender: 'System',
                          content: `⚠️ **Checkpoint reached** (${MAX_ROUNDS} rounds). The conversation has been paused. Please review the progress and continue when ready.`,
                          type: 'ai',
                        },
                      ])
                      setIsAwaitingInput(true)
                      setThinkingAgent(null)
                      reader.cancel()
                      return
                    }
                  }
                } else if (data.type === 'action') {
                  console.log('🎯 Received action:', data.action?.type, data.action)

                  // Track action
                  const entry: ActionHistoryEntry = {
                    id: `action-${Date.now()}`,
                    timestamp: new Date(),
                    agentName: data.agent,
                    action: data.action,
                    status: 'committed',
                  }
                  setActionHistory(prev => [...prev, entry])

                  // Execute action (persist to DB) - don't await to avoid blocking stream
                  executeAction(data.action).catch(err => {
                    console.error('Failed to execute action:', err)
                  })
                } else if (data.type === 'questions') {
                  // Add questions to pending, avoiding duplicates
                  const newQuestions = data.questions
                    .filter(
                      (q: AgentQuestion) =>
                        q &&
                        q.question &&
                        q.question.trim().length > 5 &&
                        q.options &&
                        q.options.length > 0
                    )
                    .map((q: AgentQuestion) => createQuestionSession(q))

                  if (newQuestions.length > 0) {
                    setPendingQuestions(prev => {
                      // Dedupe by question text
                      const existingQuestionTexts = new Set(
                        prev.map(p => p.question.question.toLowerCase().trim())
                      )
                      const uniqueNew = newQuestions.filter(
                        (q: QuestionSession) =>
                          !existingQuestionTexts.has(q.question.question.toLowerCase().trim())
                      )
                      return [...prev, ...uniqueNew]
                    })
                    setIsAwaitingInput(
                      newQuestions.some((q: QuestionSession) => q.question.urgency === 'blocking')
                    )
                  }
                } else if (data.type === 'awaiting_input') {
                  setIsAwaitingInput(true)
                  setThinkingAgent(null)
                  setIsTokenStreaming(false)
                  setStreamingTokens('')
                } else if (data.type === 'done' || data.type === 'terminated') {
                  setThinkingAgent(null)
                  setIsTokenStreaming(false)
                  setStreamingTokens('')
                  setStreamingSections([])
                  useGlobalStatusStore.getState().removeOperation('story-session')
                } else if (data.type === 'error') {
                  setIsTokenStreaming(false)
                  setStreamingTokens('')
                  setStreamingSections([])
                  useGlobalStatusStore.getState().removeOperation('story-session')
                  setMessages(prev => [
                    ...prev,
                    {
                      sender: 'System',
                      content: `Error: ${data.message}`,
                      type: 'ai',
                    },
                  ])
                }
              } catch (parseErr) {
                // Skip malformed JSON
              }
            }
          }
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Stream error:', error)
        }
      }
    }
  }

  const handleUpdateBible = async (updates: Partial<StoryPlan>) => {
    // 1. Optimistic Update
    const newBible = { ...(storyPlan || (currentProject?.series_bible as any) || {}), ...updates } as StoryPlan

    setStoryPlan(prev => {
      if (!prev) return newBible
      return { ...prev, ...updates }
    })

    // 2. Persist to DB
    if (!currentProject?.id) return

    // Update local store immediately for responsiveness
    useWorldStore.getState().setCurrentProject({
      ...currentProject,
      series_bible: newBible
    })

    try {
      await fetch(`/api/storyteller/projects/${currentProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ series_bible: newBible })
      })
    } catch (e) {
      console.error("Failed to save bible:", e)
      // Optionally revert? For now we trust optimistic update.
    }
  }

  const handleSendMessage = async (e?: React.FormEvent, manualMessage?: string) => {
    e?.preventDefault()
    const contentToSend = manualMessage || input
    if (!contentToSend.trim() || isSending) return

    // Require episode selection ONLY if we are specifically not in a valid "general" context?
    // User requested to chat about world without episode.
    // So we remove this blocker.

    // If no episode, we treat it as General/World chat
    const effectiveThreadId = currentEpisodeId || 'general'

    const userMsg: Message = { sender: 'User', content: contentToSend, type: 'human' }
    setMessages(prev => [...prev, userMsg])
    if (!manualMessage) setInput('')
    setIsSending(true)
    setIsAwaitingInput(false)
    setPendingQuestions([]) // Clear pending questions when user sends a new message
    setRoundCount(0) // Reset round count for new conversation

    // Determine effective phase based on UI state for agent context
    let effectivePhase = currentPhase
    if (isWorldBibleOpen) {
      effectivePhase = 'world_building' // logic to be handled by supervisor
    } else if (activeTab === 'script') {
      effectivePhase = 'drafting'
    } else if (activeTab === 'board') {
      effectivePhase = 'breaking'
    } else if (activeTab === 'plan') {
      effectivePhase = 'premise'
    }

    const payload = {
      message: userMsg.content,
      projectId: currentProject?.id,
      threadId: currentEpisodeId,
      episodeId: currentEpisodeId,
      currentPhase: effectivePhase, // Use inferred phase from UI
      seriesBible: {
        ...((currentProject?.series_bible as any) || {}),
        userDecisions: storyDecisions, // Include previous decisions
        masterPrompt: currentProject?.masterPrompt || '',
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
      modelConfig: getModelConfigFromStorage(),
      // Enhanced streaming options
      streamMode: useEnhancedStreaming ? 'events' : 'nodes',
      progressiveGeneration: useEnhancedStreaming && effectivePhase === 'premise',
    }

    if (useStreaming) {
      // Create abort controller
      abortControllerRef.current = new AbortController()

      try {
        const res = await fetch('/api/storyteller/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: abortControllerRef.current.signal,
        })
        // Start fresh with 0 rounds for new user message
        await processStream(res, abortControllerRef.current.signal, 0)
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Streaming failed:', error)
          setMessages(prev => [
            ...prev,
            {
              sender: 'System',
              content: 'Connection error. Please try again.',
              type: 'ai',
            },
          ])
        }
      }

      abortControllerRef.current = null
    } else {
      // Use regular endpoint
      try {
        const res = await fetch('/api/storyteller/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            existingBeats: beats,
            currentPhase,
          }),
        })
        const data = await res.json()

        if (data.messages) {
          const newMessages = data.messages.filter((m: any) => m.type !== 'human')
          setMessages(prev => [...prev, ...newMessages])
        }

        if (data.currentPhase) {
          setCurrentPhase(data.currentPhase)
        }
        if (data.script) {
          setScript(data.script)
        }
        if (data.beatBoard) {
          setBeats(
            data.beatBoard.map((b: any, i: number) => ({
              id: b.id,
              sequence: b.sequence || i + 1,
              logline: b.logline,
              beatType: b.beatType,
              status: b.status,
            }))
          )
        }
      } catch (error) {
        console.error('Failed to send message:', error)
      }
    }

    setIsSending(false)
    setThinkingAgent(null)
  }

  // Dismiss action toast
  const handleDismissToast = (entryId: string) => {
    setShowToasts(prev => prev.filter(e => e.id !== entryId))
  }

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden font-sans">
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Navigation & Context */}
        <DomainSidebar header="Storyteller" storageKey="storyteller">
          {currentProject ? (
            <div className="space-y-6">
              {/* 1. Project Master Prompt */}
              <SidebarSection icon={<Scroll size={12} />}>
                <MasterPromptEditor
                  scope="Project"
                  initialPrompt={currentProject.masterPrompt || ''}
                  onSave={async (prompt) => {
                    try {
                      await fetch(`/api/storyteller/projects/${currentProject.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ masterPrompt: prompt }),
                      })
                    } catch (err) {
                      console.error('Failed to save master prompt:', err)
                    }
                  }}
                />
              </SidebarSection>

              {/* 2. Episode Manager - disabled while agents working */}
              <SidebarSection separator icon={<Film size={12} />}>
                <div className={isSending ? 'opacity-50 pointer-events-none' : ''}>
                  <EpisodeManager
                    projectId={currentProject.id}
                    currentEpisodeId={currentEpisodeId}
                    onEpisodeChange={setCurrentEpisodeId}
                  />
                  {isSending && (
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <AlertCircle size={12} />
                      Can&apos;t change episode while agents are working
                    </div>
                  )}
                </div>
              </SidebarSection>

              {/* 3. Episode Prompt (if episode selected) */}
              {currentEpisodeId && (
                <SidebarSection separator icon={<FileText size={12} />}>
                  <MasterPromptEditor
                    scope="Episode"
                    initialPrompt=""
                    onSave={prompt => console.log('Save episode prompt:', prompt)}
                  />
                </SidebarSection>
              )}

              {/* 4. Cast/Characters (last) */}
              <SidebarSection separator>
                <CharacterPanel
                  characters={characters}
                  onUpdate={handleUpdateCharacter}
                  onCreate={handleCreateCharacter}
                  onDelete={handleDeleteCharacter}
                  projectId={currentProject.id}
                />
              </SidebarSection>
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
                  opacity: 0.35
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/70 to-black" />
            </div>
          )}
          {isWorldBibleOpen ? (
            <div className="flex-1 overflow-y-auto p-6 z-10 relative animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                    World Bible
                  </h2>
                  <p className="text-sm text-muted-foreground">The foundation of your story universe</p>
                </div>
                <button
                  onClick={() => setIsWorldBibleOpen(false)}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <WorldBiblePanel storyPlan={storyPlan || {
                title: currentProject?.name || 'Untitled',
                genre: 'Unknown',
                tone: 'Unknown',
                centralQuestion: 'Unknown',
                themes: [],
                worldRules: [],
                factions: [],
                keyCharacters: characters,
                protagonist: null,
                antagonist: null
              }}
                projectId={currentProject?.id || ''}
                onUpdate={handleUpdateBible}
                onSendMessage={(msg) => handleSendMessage(undefined, msg)}
                isReadOnly={isSending}
                onConvertToCast={handleCreateCharacter}
              />
            </div>
          ) : currentEpisodeId ? (
            <>
              {/* Header Bar */}
              <div className="shrink-0 border-b border-border flex items-center px-4 bg-card justify-between z-40 relative py-2 gap-4 flex-wrap min-h-[60px]">
                <div className="flex items-center gap-3 shrink-0">
                  <h1 className="text-sm font-bold whitespace-nowrap">
                    Ep. {currentEpisodeId.slice(0, 6)}...
                  </h1>

                  {/* Phase indicator with navigation buttons */}
                  <div className="flex items-center gap-1 shrink-0 bg-background/50 p-1 rounded-lg border border-border/50">
                    <button
                      onClick={handlePreviousPhase}
                      disabled={!canGoBack || isSending}
                      className="p-1 rounded-md border border-border hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Previous phase"
                    >
                      <ChevronLeft size={12} />
                    </button>

                    <div className="flex items-center">
                      <button
                        onClick={() => {
                          setCurrentPhase('premise')
                          setActiveTab('plan')
                          savePhaseToDb('premise')
                        }}
                        disabled={isSending}
                        className={`text-[10px] px-1.5 py-0.5 rounded-l-full border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${currentPhase === 'premise'
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                          : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'
                          }`}
                      >
                        PREMISE
                      </button>
                      <button
                        onClick={() => {
                          setCurrentPhase('breaking')
                          setActiveTab('board')
                          savePhaseToDb('breaking')
                        }}
                        disabled={isSending}
                        className={`text-[10px] px-1.5 py-0.5 border-y border-l transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${currentPhase === 'breaking'
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'
                          }`}
                      >
                        BREAK
                      </button>
                      <button
                        onClick={() => {
                          setCurrentPhase('writing')
                          setActiveTab('script')
                          savePhaseToDb('writing')
                        }}
                        disabled={isSending}
                        className={`text-[10px] px-1.5 py-0.5 rounded-r-full border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${currentPhase === 'writing'
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'
                          }`}
                      >
                        WRITE
                      </button>
                    </div>

                    <button
                      onClick={handleNextPhase}
                      disabled={!canGoForward || isSending}
                      className="p-1 rounded-md border border-border hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Next phase"
                    >
                      <ChevronRight size={12} />
                    </button>
                  </div>

                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {beats.length} beat{beats.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5 shrink-0">
                  <button
                    onClick={() => setActiveTab('plan')}
                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${activeTab === 'plan'
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    <Map size={12} />
                    Plan
                  </button>
                  <button
                    onClick={() => setActiveTab('board')}
                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${activeTab === 'board'
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    <Layout size={12} />
                    Beats
                  </button>
                  <button
                    onClick={() => setActiveTab('script')}
                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${activeTab === 'script'
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    <FileText size={12} />
                    Script
                  </button>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 relative overflow-hidden">
                {activeTab === 'plan' && (
                  <StoryPlanBoard
                    storyPlan={storyPlan}
                    globalBible={currentProject?.series_bible}
                    onApprove={handleApprovePlan}
                    onUpdateSequence={handleUpdateSequence}
                    isGenerating={isSending && currentPhase === 'premise'}
                  />
                )}
                {activeTab === 'board' && (
                  <div className="flex-1 overflow-hidden relative h-full">
                    <div className="absolute inset-0 overflow-y-auto p-4">
                      <CorkBoard beats={beats} episodeId={currentEpisodeId} />
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
                          return await regenerateText(selection, instruction)
                        } catch (e) {
                          console.error('Regeneration failed:', e)
                          return selection
                        }
                      }}
                      isLoading={isScriptLoading}
                    />
                  </div>
                )}
                {activeTab === 'bible' && (
                  <div className="flex-1 overflow-y-auto w-full h-full p-6">
                    <WorldBiblePanel
                      storyPlan={storyPlan || {
                        title: currentProject?.name || 'Untitled',
                        genre: 'Unknown',
                        tone: 'Unknown',
                        centralQuestion: 'Unknown',
                        themes: [],
                        worldRules: [],
                        factions: [],
                        keyCharacters: characters,
                        protagonist: null,
                        antagonist: null
                      }}
                      projectId={currentProject?.id || ''}
                      onUpdate={handleUpdateBible}
                      onSendMessage={(msg) => handleSendMessage(undefined, msg)}
                      isReadOnly={isSending}
                      onConvertToCast={handleCreateCharacter}
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
              <Users size={48} className="opacity-30" />
              <p>Select an episode to start breaking.</p>
            </div>
          )}
        </div>

        {/* Right Sidebar: Writers Room */}
        <DomainSidebar
          position="right"
          storageKey="writers-room"
          defaultWidth={384}
          rawContent
          header={
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold tracking-tight text-primary">WRITERS ROOM</h2>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowThinking(!showThinking)}
                    className={`text-xs px-2 py-1 rounded ${showThinking ? 'bg-purple-500/20 text-purple-400' : 'bg-muted text-muted-foreground'}`}
                    title={showThinking ? 'Hide thinking' : 'Show thinking'}
                  >
                    🧠
                  </button>
                  <button
                    onClick={() => setUseStreaming(!useStreaming)}
                    className={`text-xs px-2 py-1 rounded ${useStreaming ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'}`}
                    title={useStreaming ? 'Streaming enabled' : 'Streaming disabled'}
                  >
                    {useStreaming ? '⚡ Live' : '📦 Batch'}
                  </button>
                  <button
                    onClick={() => setUseEnhancedStreaming(!useEnhancedStreaming)}
                    className={`text-xs px-2 py-1 rounded ${useEnhancedStreaming ? 'bg-cyan-500/20 text-cyan-400' : 'bg-muted text-muted-foreground'}`}
                    title={useEnhancedStreaming ? 'Token streaming ON' : 'Token streaming OFF'}
                  >
                    {useEnhancedStreaming ? '✨ Tokens' : '📄 Chunks'}
                  </button>
                </div>
              </div>

              {/* Status indicators */}
              <div className="flex items-center gap-2 text-xs flex-wrap">
                {isTokenStreaming && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded">
                    <span className="text-cyan-400 animate-pulse">✨ Streaming tokens...</span>
                  </div>
                )}
                {thinkingAgent && !isTokenStreaming && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/20 rounded animate-pulse">
                    <Zap className="w-3 h-3 text-primary" />
                    <span className="text-primary">{thinkingAgent} thinking...</span>
                  </div>
                )}
                {isAwaitingInput && !thinkingAgent && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded">
                    <span className="text-yellow-500">⏳ Waiting for your input</span>
                  </div>
                )}
                {pendingQuestions.length > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded">
                    <span className="text-red-400">{pendingQuestions.length} question(s)</span>
                  </div>
                )}
              </div>
            </div>
          }
        >
          <div className="flex flex-col h-full">
            {/* Streaming Content - Shows token-level streaming */}
            {(isTokenStreaming || streamingSections.length > 0 || streamingTokens) && (
              <div className="mb-4">
                <StreamingContent
                  agent={thinkingAgent || 'Premise Architect'}
                  currentTokens={streamingTokens}
                  sections={streamingSections}
                  isStreaming={isTokenStreaming}
                />
              </div>
            )}

            {/* Agent Log */}
            <div className="flex-1 overflow-auto">
              <AgentLog
                messages={messages}
                onQuestionAnswer={handleQuestionAnswer}
                onQuestionSkip={handleQuestionSkip}
                showThinking={showThinking}
              />
            </div>

            {/* Input - aligned to bottom */}
            <div className="pt-4 border-t border-border space-y-2 mt-auto">
              {/* Episode requirement warning - only if not in Bible mode */}
              {!currentEpisodeId && activeTab !== 'bible' && !isWorldBibleOpen && (
                <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded text-amber-400 text-xs">
                  <AlertCircle size={14} />
                  <span>Select an episode in the sidebar before starting.</span>
                </div>
              )}

              {/* Generate world bible button - show only when no conversation started and no bible exists */}
              {messages.length === 1 && !isSending && (!storyPlan || (!storyPlan.genre && !storyPlan.centralQuestion && (!storyPlan.themes || storyPlan.themes.length === 0))) && (
                <button
                  type="button"
                  onClick={() => handleSendMessage(undefined, "Generate a world bible for my story. Help me define the genre, tone, themes, world rules, and key factions.")}
                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <BookOpen size={16} />
                  Generate world bible
                </button>
              )}

              {/* Round counter */}
              {roundCount > 0 && (
                <div className="text-xs text-muted-foreground text-center">
                  Round {roundCount}/{MAX_ROUNDS}
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={
                    (!currentEpisodeId && activeTab !== 'bible')
                      ? 'Chat about your world, or select an episode...'
                      : activeTab === 'bible'
                        ? 'Discuss World Bible, Factions, or Rules...'
                        : isSending
                          ? 'Agents are deliberating...'
                          : isAwaitingInput
                            ? 'Answer the question above, or type to override...'
                            : 'Tell me about your story idea...'
                  }
                  disabled={isSending}
                  className="flex-1 bg-background border border-input rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />

                {/* Send / Stop button */}
                {isSending ? (
                  <button
                    type="button"
                    onClick={handleStopStream}
                    className="px-3 py-2 bg-destructive text-destructive-foreground rounded text-sm font-medium hover:bg-destructive/90 flex items-center gap-1.5"
                  >
                    <StopCircle size={16} />
                    Stop
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="p-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={18} />
                  </button>
                )}
              </form>
            </div>

            {/* Pending Actions (collapsible) */}
            {(pendingQuestions.length > 0 || actionHistory.length > 0) && (
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <History className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Activity
                  </span>
                </div>
                <PendingActions
                  pendingQuestions={pendingQuestions}
                  recentActions={actionHistory.slice(-5)}
                />
              </div>
            )}
          </div>
        </DomainSidebar>
      </div>

      {/* Action Toasts */}
      <ActionToastContainer entries={showToasts} onDismiss={handleDismissToast} />

      {/* Timeline at Bottom */}
      <Timeline
        episodeId={currentEpisodeId}
        beats={beats}
        onBeatSelect={setSelectedBeatId}
        selectedBeatId={selectedBeatId}
      />
    </div>
  )
}
