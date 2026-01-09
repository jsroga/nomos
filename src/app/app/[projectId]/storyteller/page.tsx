'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter, useParams } from 'next/navigation'
import { CorkBoard } from '@/domains/storyteller/components/CorkBoard'
import { CharacterPanel } from '@/domains/storyteller/components/CharacterPanel'
// Consolidated Chat & Storyteller Imports
import { ActionHistoryEntry, AgentAction, AgentQuestion } from '@/domains/storyteller/actions/types'
import { ActionStatus } from '@/domains/storyteller/enums'
import { QuestionSession, createQuestionSession } from '@/domains/storyteller/questions/types'
import {
  ChatInterface,
  ChatInput,
  SmartQuickActions,
  createQuickActions
} from '@/domains/chat/components'
import { useChatStream } from '@/domains/chat/hooks/useChatStream'
import { Message, AgentConfigMap } from '@/domains/chat/types'
// Import action UI components to pass to ChatInterface
import { ActionCommitted } from '@/domains/storyteller/components/ActionToast'
import QuestionCard from '@/domains/storyteller/components/QuestionCard'
import { Bot, User, Sparkles, Brain, Lightbulb, Scale, Eye, Pen } from 'lucide-react'

// Define Storyteller Agent Config - Minimalist
const STORYTELLER_AGENT_CONFIG: AgentConfigMap = {
  Showrunner: {
    color: 'text-blue-400',
    icon: <Brain className="w-4 h-4" />,
  },
  PlotArchitect: {
    color: 'text-blue-400/80',
    icon: <Lightbulb className="w-4 h-4" />,
  },
  CharacterPsychology: {
    color: 'text-purple-400/80',
    icon: <Brain className="w-4 h-4" />,
  },
  ConsequenceTracker: {
    color: 'text-green-400/80',
    icon: <Bot className="w-4 h-4" />,
  },
  DevilsAdvocate: {
    color: 'text-red-400/80',
    icon: <Scale className="w-4 h-4" />,
  },
  VisualMoment: {
    color: 'text-cyan-400/80',
    icon: <Eye className="w-4 h-4" />,
  },
  Writer: {
    color: 'text-orange-400/80',
    icon: <Pen className="w-4 h-4" />,
  },
  User: {
    color: 'text-primary',
    icon: <User className="w-4 h-4" />,
  },
}

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
import { posterGenerationService } from '@/domains/storyteller/services/PosterGenerationService'
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
  Check,
  Activity,
  Palette,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DomainSidebar,
  SidebarSection,
  SidebarEmptyState,
} from '@/components/ui/domain-sidebar'
import { regenerateText } from '@/domains/storyteller/services/script-operations'
import { StoryPlan, StorySequence } from '@/domains/storyteller/schemas/agent-schemas'

import { useProjectFromUrl } from '@/hooks/useProjectFromUrl'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import { LocalStorageKeys } from '@/constants/localStorage'
import { moodboardGenerationService } from '@/domains/storyteller/services/MoodboardGenerationService'
import { TOUR_STEP_IDS } from '@/lib/tour-constants'

const MAX_ROUNDS = 15 // Hard stop after this many rounds

// Get model config from localStorage for API requests
function getModelConfigFromStorage() {
  if (typeof window === 'undefined') return { provider: 'openai' as const }

  const provider = localStorage.getItem(LocalStorageKeys.PREFERRED_MODEL_PROVIDER)
  const anthropicApiKey = localStorage.getItem(LocalStorageKeys.ANTHROPIC_API_KEY)

  // Get Gemini API key from existing AI_CONFIG_GEMINI structure
  let geminiApiKey: string | undefined
  let geminiModelId: string | undefined
  const geminiConfig = localStorage.getItem(LocalStorageKeys.AI_CONFIG_GEMINI)
  if (geminiConfig) {
    try {
      const parsed = JSON.parse(geminiConfig)
      geminiApiKey = parsed.apiKey || undefined
      geminiModelId = parsed.modelId || undefined
    } catch {
      // ignore
    }
  }

  return {
    provider: (provider === 'anthropic' || provider === 'openai' || provider === 'gemini') ? provider : 'openai' as const,
    anthropicApiKey: anthropicApiKey || undefined,
    geminiApiKey: geminiApiKey || undefined,
    geminiModelId: geminiModelId,
  }
}

interface Beat {
  id: string
  sequence: number
  logline: string
  beatType: string
  status: string
  content?: string
  imagePrompt?: string
}

export default function StorytellerPage() {
  // Load project from URL
  useProjectFromUrl()
  const searchParams = useSearchParams()
  const params = useParams()
  const router = useRouter()

  const currentProject = useWorldStore(state => state.currentProject)

  // Initialize episode from URL param
  const episodeParam = searchParams.get('episodeId')
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(episodeParam)
  const [currentEpisodeTitle, setCurrentEpisodeTitle] = useState<string>('')

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
  const [lastEpisodeTab, setLastEpisodeTab] = useState<string>('plan') // Remember last non-bible tab

  // Bible State - Derived from URL
  const bibleParamValue = searchParams.get('bible')
  const isWorldBibleOpen = bibleParamValue === 'open'

  // Sync Episode ID from URL if it changes
  useEffect(() => {
    if (episodeParam !== currentEpisodeId) {
      setCurrentEpisodeId(episodeParam)
    }
  }, [episodeParam])

  // Note: We no longer auto-redirect to bible=open. 
  // The component will naturally show Bible as a fallback when no episode is selected.
  // This prevents the flash where Bible shows then gets replaced by episode.

  // Update active tab when bible param changes
  useEffect(() => {
    if (bibleParamValue === 'open') {
      // Save current tab before switching to bible (if not already bible)
      if (activeTab !== 'bible') {
        setLastEpisodeTab(activeTab)
      }
      setActiveTab('bible')
    } else if (activeTab === 'bible') {
      // Closing bible: restore last episode tab
      setActiveTab(lastEpisodeTab)
    }
  }, [bibleParamValue])

  // Listen for world bible toggle
  useEffect(() => {
    const handleToggle = () => {
      if (isWorldBibleOpen) {
        // Close: Remove param
        const params = new URLSearchParams(searchParams.toString())
        params.delete('bible')
        router.push(`?${params.toString()}`)
      } else {
        // Open: Add param
        const params = new URLSearchParams(searchParams.toString())
        params.set('bible', 'open')
        router.push(`?${params.toString()}`)
      }
    }
    window.addEventListener('toggle-world-bible', handleToggle)
    return () => window.removeEventListener('toggle-world-bible', handleToggle)
  }, [isWorldBibleOpen, searchParams, router])

  // Story Plan State (8-sequence structure)
  const [storyPlan, setStoryPlan] = useState<StoryPlan | null>(null)
  const [isPlanApproved, setIsPlanApproved] = useState(false)
  const [isFetchingPlan, setIsFetchingPlan] = useState(!!episodeParam)

  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false)
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false)
  const [primaryMoodboardUrl, setPrimaryMoodboardUrl] = useState<string | null>(null)
  const [isActivityPanelOpen, setIsActivityPanelOpen] = useState(false)

  // Story decisions that have been made (to prevent re-asking)
  const [storyDecisions, setStoryDecisions] = useState<Record<string, string>>({})

  // -- RESTORED STATE for Legacy UI compatibility --
  const [input, setInput] = useState('')
  const [pendingQuestions, setPendingQuestions] = useState<QuestionSession[]>([])
  const [answeredQuestions, setAnsweredQuestions] = useState<{ question: string; answer: string }[]>([])
  const [actionHistory, setActionHistory] = useState<ActionHistoryEntry[]>([])
  const [showToasts, setShowToasts] = useState<ActionHistoryEntry[]>([])
  const [generatingSection, setGeneratingSection] = useState<string | null>(null)

  // Re-add pendingActionsRef locally as executeAction uses it
  const pendingActionsRef = useRef<number>(0)

  // Polyfills
  const useEnhancedStreaming = true;
  const useStreaming = true;

  const addOperation = useGlobalStatusStore(state => state.addOperation)
  const removeOperation = useGlobalStatusStore(state => state.removeOperation)

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
      const beatsData = await beatsRes.json()
      if (beatsData.beats && beatsData.beats.length > 0) {
        const mappedBeats = beatsData.beats.map((b: any) => ({
          id: b.id,
          sequence: b.sequence,
          logline: b.logline || b.log_line || 'Untitled beat',
          beatType: b.beat_type || b.beatType || 'default',
          status: b.status || 'proposed',
          content: b.content || null,
          imagePrompt: b.image_prompt || b.imagePrompt || null
        }))
        setBeats(mappedBeats)
      }
    } catch (err) {
      console.error('❌ Failed to refresh beats:', err)
    }
  }, [])

  // Execute action via API
  const executeAction = useCallback(
    async (action: AgentAction) => {
      if (!currentProject?.id) return

      const episodeId = episodeIdRef.current
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

        const data = await res.json()
        if (data.success) {
          if (action.type === 'CREATE_BEAT' && episodeId) {
            await refreshBeats(episodeId)
          }

          if (
            data.result?.type === 'beat_created' ||
            data.result?.type === 'beat_updated' ||
            data.result?.type === 'beat_deleted'
          ) {
            if (episodeId) await refreshBeats(episodeId)
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

              if (bible.storyPlan) {
                setStoryPlan(bible.storyPlan)
              } else {
                setStoryPlan(prev => ({
                  ...prev,
                  ...bible
                }))
              }

              if (currentProject) {
                useWorldStore.getState().setCurrentProject({
                  ...currentProject,
                  series_bible: bible.storyPlan || {
                    ...(currentProject.series_bible as any),
                    ...bible
                  }
                })
              }
            }
          } else if (data.result?.type === 'script_updated') {
            if (data.result.script) {
              setScript(data.result.script)
            } else if (data.result.seriesBible?.script) {
              setScript(data.result.seriesBible.script)
            }
          } else if (data.result?.type === 'episode_updated') {
            if (data.result.storyPlan) {
              setStoryPlan(prev => ({
                ...prev,
                ...data.result.storyPlan,
                premise: data.result.storyPlan.premise || (prev as any)?.premise
              }) as any)
            }
          }
        }
      } catch (error) {
        console.error('❌ executeAction threw:', error)
      }
    },
    [currentProject, refreshBeats]
  )

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
    abortControllerRef
  } = useChatStream({
    initialMessages: [{
      sender: 'Showrunner',
      content: 'Welcome to the Writers Room! Select an episode to begin, then tell me about the story you want to create.',
      type: 'ai',
    }],
    onAction: async (action) => {
      await executeAction(action as any);
    },
    onQuestion: (questionSession) => {
      setPendingQuestions(prev => {
        const existingQuestionTexts = new Set(prev.map(p => p.question.question.toLowerCase().trim()));
        if (!existingQuestionTexts.has(questionSession.question.question.toLowerCase().trim())) {
          return [...prev, {
            ...questionSession,
            machineState: 'pending',
            createdAt: new Date()
          } as any];
        }
        return prev;
      });
    },
    onStreamingUpdate: (data) => {
      if (data.type === 'start') {
        useGlobalStatusStore.getState().addOperation({
          id: 'story-session',
          type: 'story-agent',
          label: 'Story Session',
          details: 'Writers Room',
          status: 'in-progress',
        });
      } else if (data.type === 'node_start' || (data.type === 'message' && data.node)) {
        useGlobalStatusStore.getState().updateOperation('story-session', {
          details: data.node || data.message?.node,
        });
      } else if (data.type === 'done' || data.type === 'terminated' || data.type === 'error') {
        useGlobalStatusStore.getState().removeOperation('story-session');
      }
    }
  });

  // Derived state
  const showThinking = !!thinkingAgent;
  const roundCount = 0; // Placeholder

  const handleSendMessage = useCallback(async (e?: React.FormEvent, msgOverride?: string) => {
    e?.preventDefault();
    const content = msgOverride || input;

    if (!content.trim()) return;

    setInput('');
    setMessages(prev => [...prev, { sender: 'User', content, type: 'human' }]);

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

    await sendMessage('/api/storyteller/chat/stream', {
      message: content,
      projectId: currentProject?.id,
      threadId: currentEpisodeId || 'general',
      episodeId: currentEpisodeId,
      currentPhase: effectivePhase,
      seriesBible: {
        ...((currentProject?.series_bible as any) || {}),
        masterPrompt: currentProject?.project_prompt || '',
        userDecisions: storyDecisions,
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
      streamMode: useEnhancedStreaming ? 'events' : 'nodes',
    });
  }, [input, currentProject, currentEpisodeId, currentPhase, storyDecisions, characters, sendMessage, isWorldBibleOpen, activeTab, useEnhancedStreaming]);

  const lastResumedProjectId = useRef<string | null>(null);

  // Resume pending poster generations on mount
  useEffect(() => {
    // Only run if we have a project ID and haven't resumed for this project yet
    if (currentProject?.id && lastResumedProjectId.current !== currentProject.id) {
      lastResumedProjectId.current = currentProject.id;

      posterGenerationService.resumePendingGenerations(currentProject.id, async (url, episodeId, type) => {
        if (episodeId === currentEpisodeId) {
          if (type === 'poster') {
            setIsGeneratingPoster(false);
            setStoryPlan(prev => prev ? ({ ...prev, posterUrl: url } as any) : null);
          } else {
            // type === 'storyboard' or undefined (legacy) will be treated as storyboard (Gemini)
            setIsGeneratingStoryboard(false);
            setStoryPlan(prev => prev ? ({ ...prev, storyboardUrl: url } as any) : null);
          }
        }

        // Also persist to DB to ensure it's saved even if not currently viewing the episode
        try {
          const payload = type === 'poster' ? { posterUrl: url } : { storyboardUrl: url };
          await fetch(`/api/storyteller/episodes/${episodeId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } catch (e) {
          console.error("Failed to save resumed generation:", e);
        }
      })
    }
  }, [currentProject?.id, currentEpisodeId])

  // Storyboard Trigger (Gemini)
  const handleStoryboardTrigger = useCallback(async (eventOrEpisodeId?: Event | string | React.MouseEvent) => {
    let episodeId: string | undefined;

    if (typeof eventOrEpisodeId === 'string') {
      episodeId = eventOrEpisodeId;
    } else if (eventOrEpisodeId && 'detail' in eventOrEpisodeId && (eventOrEpisodeId as unknown as CustomEvent).detail?.episodeId) {
      episodeId = (eventOrEpisodeId as unknown as CustomEvent).detail.episodeId;
    } else {
      episodeId = currentEpisodeId || undefined;
    }

    if (!episodeId || !currentProject?.id) return;

    if (isGeneratingStoryboard) return;

    setIsGeneratingStoryboard(true);

    const config = getModelConfigFromStorage();
    if (!config.geminiApiKey) {
      alert("Gemini API Key missing!");
      setIsGeneratingStoryboard(false);
      return;
    }

    try {
      const premise = (storyPlan as any)?.premise || storyPlan;
      const prompt = `A visual storyboard for an episode titled "${premise?.title || 'Unknown'}".`;

      const beatsPayload = beats.map((b: Beat) => ({
        logline: b.logline,
        visualHook: b.content,
        imagePrompt: b.imagePrompt
      }));

      await posterGenerationService.generateStoryboard(
        currentProject.id,
        episodeId,
        prompt,
        beatsPayload,
        { apiKey: config.geminiApiKey },
        async (url) => {
          setIsGeneratingStoryboard(false);
          setStoryPlan(prev => prev ? ({ ...prev, storyboardUrl: url } as any) : null);

          if (episodeId) {
            try {
              await fetch(`/api/storyteller/episodes/${episodeId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyboardUrl: url })
              });
            } catch (e) {
              console.error("Failed to save storyboard URL:", e);
            }
          }
        }
      );
    } catch (error) {
      console.error('Storyboard generation failed', error);
      setIsGeneratingStoryboard(false);
    }
  }, [currentProject?.id, currentEpisodeId, isGeneratingStoryboard, beats, storyPlan]);

  // Poster Trigger (Midjourney via Comet)
  const handlePosterTrigger = useCallback(async (eventOrEpisodeId?: Event | string | React.MouseEvent) => {
    let episodeId: string | undefined;

    if (typeof eventOrEpisodeId === 'string') {
      episodeId = eventOrEpisodeId;
    } else if (eventOrEpisodeId && 'detail' in eventOrEpisodeId && (eventOrEpisodeId as unknown as CustomEvent).detail?.episodeId) {
      episodeId = (eventOrEpisodeId as unknown as CustomEvent).detail.episodeId;
    } else {
      episodeId = currentEpisodeId || undefined;
    }

    if (!episodeId || !currentProject?.id) return;

    if (isGeneratingPoster) return;

    setIsGeneratingPoster(true);

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

    const config = getModelConfigFromStorage();

    try {
      const premise = (storyPlan as any)?.premise || storyPlan;
      const prompt = `Title: ${premise?.title || 'Unknown'}. Theme: ${premise?.thematicFocus || 'Cinematic'}. ${premise?.protagonistHook || ''}`;

      // Log action start
      setActionHistory(prev => [
        {
          id: `poster-${Date.now()}`,
          action: { type: 'GENERATE_POSTER', payload: { episodeId, prompt } },
          agentName: 'PosterAgent',
          status: ActionStatus.COMMITTED,
          timestamp: new Date()
        },
        ...prev
      ])

      await posterGenerationService.generatePoster(
        currentProject.id,
        episodeId,
        prompt,
        { apiKey },
        async (url) => {
          setIsGeneratingPoster(false);
          setStoryPlan(prev => prev ? ({ ...prev, posterUrl: url } as any) : null);

          if (episodeId) {
            try {
              await fetch(`/api/storyteller/episodes/${episodeId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ posterUrl: url })
              });
            } catch (e) {
              console.error("Failed to save poster URL:", e);
            }
          }

          // Log completion
          setActionHistory(prev => [
            {
              id: `poster-complete-${Date.now()}`,
              action: { type: 'GENERATE_POSTER', payload: { episodeId, prompt } },
              agentName: 'PosterAgent',
              status: ActionStatus.COMMITTED,
              timestamp: new Date()
            },
            ...prev
          ])
        }
      );
    } catch (error) {
      console.error('Poster generation failed', error);
      setIsGeneratingPoster(false);
      alert("Poster generation failed. Please check the API key configuration or try again.");

      // Log failure
      setActionHistory(prev => [
        {
          id: `poster-fail-${Date.now()}`,
          action: { type: 'GENERATE_POSTER', payload: { episodeId, prompt: "Failed" } },
          agentName: 'PosterAgent',
          status: ActionStatus.UNDONE,
          timestamp: new Date()
        },
        ...prev
      ])
    }
  }, [currentProject?.id, currentEpisodeId, isGeneratingPoster, storyPlan]);

  // Moodboard Generation Trigger
  const handleMoodboardTrigger = useCallback(async (event?: Event) => {
    const detail = (event as CustomEvent)?.detail;
    const projectId = detail?.projectId || currentProject?.id;

    if (!projectId) return;

    const config = getModelConfigFromStorage()
    // Call the moodboard generation service
    await moodboardGenerationService.generate(projectId, [], undefined, config, async () => {
      // Refetch project data when generation completes
      try {
        const response = await fetch(`/api/storyteller/projects/${projectId}`);
        if (response.ok) {
          const data = await response.json();
          const bible = data.seriesBible || data.series_bible;
          if (bible?.moodImages) {
            setStoryPlan(prev => prev ? { ...prev, moodImages: bible.moodImages } : prev);
            // Also update the store
            if (currentProject) {
              useWorldStore.getState().setCurrentProject({
                ...currentProject,
                series_bible: { ...(currentProject.series_bible as any || {}), moodImages: bible.moodImages }
              });
            }
          }
        }
      } catch (error) {
        console.error('Failed to refetch moodboard data:', error);
      }
    });
  }, [currentProject]);

  // Listeners
  useEffect(() => {
    const onStoryboard = (e: Event) => handleStoryboardTrigger(e);
    const onPoster = (e: Event) => handlePosterTrigger(e);
    const onMoodboard = (e: Event) => handleMoodboardTrigger(e);

    window.addEventListener('trigger-storyboard-generation', onStoryboard);
    window.addEventListener('generate-episode-poster', onPoster);
    window.addEventListener('trigger-moodboard-generation', onMoodboard);

    return () => {
      window.removeEventListener('trigger-storyboard-generation', onStoryboard);
      window.removeEventListener('generate-episode-poster', onPoster);
      window.removeEventListener('trigger-moodboard-generation', onMoodboard);
    }
  }, [handleStoryboardTrigger, handlePosterTrigger, handleMoodboardTrigger]);



  // Update StoryPlanBoard to pass isGeneratingPoster
  // ... (Wait, I need to check where StoryPlanBoard is rendered to pass the prop)


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

  const [isFetchingCharacters, setIsFetchingCharacters] = useState(false)

  // Fetch characters
  useEffect(() => {
    if (currentProject?.id) {
      setIsFetchingCharacters(true)
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
        .finally(() => setIsFetchingCharacters(false))
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
    // Stability Check: If we already have the right data for the current context, skip
    const isEpisodeContext = !!currentEpisodeId;
    const isGlobalContext = !currentEpisodeId && !!currentProject?.series_bible;

    // Skip if no context at all
    if (!currentEpisodeId && !currentProject?.series_bible) {
      console.log('❌ [Debug] No Episode selected and No Series Bible found.')
      setStoryPlan(null)
      return
    }

    console.log('🔍 [Debug] Plan Effect Triggered:', {
      episodeId: currentEpisodeId,
      projectId: currentProject?.id,
      hasBible: !!currentProject?.series_bible
    })

    if (currentEpisodeId) {
      console.log('🔍 [Debug] Fetching plan for episode:', currentEpisodeId)
      setIsFetchingPlan(true)
      fetch(`/api/storyteller/plan?episodeId=${currentEpisodeId}`)
        .then(res => res.json())
        .then(data => {
          console.log('📥 [Debug] Plan API Received:', data)
          // Fix TS errors by handling potentially loose types on currentProject
          const projectAny = currentProject as any;
          const hasProjectData = projectAny?.seriesBible || projectAny?.series_bible || projectAny?.storyPlan || projectAny?.story_plan;

          if (data.storyPlan || hasProjectData) {
            console.log('✅ [Debug] Setting storyPlan for Episode with Merged Context')

            // MERGE STRATEGY: 
            // 1. Series Bible (Global Truths: Factions, Rules, World Desc)
            // 2. Season Plan (Global Arc: Sequences, Summary)
            // 3. Episode Specifics (Overrides if any)

            const bible = (projectAny?.seriesBible || projectAny?.series_bible || {})
            const seasonPlan = (projectAny?.storyPlan || projectAny?.story_plan || {})
            const episodePlan = (data.storyPlan || {}) as any

            const newPlan = {
              ...bible,
              ...seasonPlan,
              ...episodePlan,
              // Explicitly ensure critical fields are not lost if they are missing in one layer
              sequences: episodePlan.sequences || seasonPlan.sequences || [],
              factions: episodePlan.factions || bible.factions || [],
              worldRules: episodePlan.worldRules || bible.worldRules || [],
              moodImages: episodePlan.moodImages || bible.moodImages || [],
              imagePrompts: episodePlan.imagePrompts || bible.imagePrompts || {},
              // Ensure we keep the project info
              projectId: currentProject?.id
            }

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
        .finally(() => setIsFetchingPlan(false))
    } else if (currentProject?.series_bible) {
      console.log('📖 [Debug] Loading Global Series Bible')
      // Load Series Bible if no episode selected
      setStoryPlan(currentProject.series_bible as StoryPlan)
    }
  }, [currentEpisodeId, currentProject?.id])

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

  // Confirmation dialog for going back in phases (will clear current phase data)
  const { confirm: confirmPhaseBack, ConfirmDialogComponent: PhaseBackConfirmDialog } = useConfirmDialog()

  const handlePreviousPhase = useCallback(async () => {
    const idx = PHASE_ORDER.indexOf(currentPhase)
    if (idx > 0) {
      // Show confirmation dialog - going back will erase current phase data
      const phaseNames: Record<string, string> = {
        premise: 'Premise',
        breaking: 'Story Beats',
        writing: 'Script',
        complete: 'Complete'
      }

      const confirmed = await confirmPhaseBack({
        title: 'Go Back to Previous Phase?',
        description: `Going back will erase all data from the current "${phaseNames[currentPhase]}" phase. This action cannot be undone.`,
        confirmLabel: 'Go Back',
        cancelLabel: 'Stay Here',
        variant: 'destructive'
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

  // Note: Forward navigation removed - use AI to advance phases naturally
  const canGoBack = PHASE_ORDER.indexOf(currentPhase) > 0

  // Track pending action executions to ensure cleanup waits for them - actually hook handles async actions if we await them in onAction!
  // But our executeAction is async. The hook awaits onAction. So we are good!


  // --- MENTIONS DATA ---
  const mentionItems: any[] = [
    ...characters.map(c => ({ id: c.id, name: c.name, type: 'character' as const })),
    ...(storyPlan?.worldRules || []).map((r: any, idx: number) => ({ id: `rule-${idx}`, name: r.rule, type: 'world_rule' as const })),
    ...(storyPlan?.factions || []).map((f: any, idx: number) => ({ id: `faction-${idx}`, name: f.name, type: 'faction' as const })),
  ]

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
          masterPrompt: currentProject?.project_prompt || '',
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
            masterPrompt: currentProject?.project_prompt || '',
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
      } else if (detail?.type === 'generate_episode_premise_section') {
        const sectionName = detail.section;
        setGeneratingSection(sectionName);
        const readableSection = sectionName === 'protagonistHook' ? 'Protagonist Hook' :
          sectionName === 'fatalFlaw' ? 'Fatal Flaw' :
            sectionName === 'inevitableConsequence' ? 'Inevitable Consequence' :
              sectionName;

        const userMsg: Message = {
          sender: 'User',
          content: `Please regenerate only the ${readableSection} of the episode premise.`,
          type: 'human'
        }
        setMessages(prev => [...prev, userMsg])
        setIsSending(true)

        const payload = {
          message: `Please regenerate ONLY the ${readableSection} (${sectionName}) for the episode premise. Return a JSON object containing ONLY this field. Do not include unchanged fields. Delegate to the Episode Premise Architect.`,
          projectId: currentProject?.id,
          threadId: currentEpisodeId || 'general',
          episodeId: currentEpisodeId,
          currentPhase: 'premise',
          seriesBible: {
            ...((currentProject?.series_bible as any) || {}),
            masterPrompt: currentProject?.project_prompt || '',
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
      } else if (detail?.type === 'generate_roadmap') {
        const userMsg: Message = {
          sender: 'User',
          content: "Please generate a detailed episode roadmap for the season.",
          type: 'human'
        }
        setMessages(prev => [...prev, userMsg])
        setIsSending(true)

        const payload = {
          message: "Generate a detailed episode roadmap for the season. Create distinct episodes with titles, summaries, key factions involved, and consequences. Delegate to the Story Architect.",
          projectId: currentProject?.id,
          threadId: 'general',
          episodeId: null,
          currentPhase: 'world_building',
          seriesBible: {
            ...((currentProject?.series_bible as any) || {}),
            masterPrompt: currentProject?.project_prompt || '',
          },
          characters: characters,
          modelConfig: getModelConfigFromStorage(),
          streamMode: 'events',
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
    const handleUpdateEpisodePremise = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;

      // 1. Optimistic Update
      setStoryPlan(prev => {
        if (!prev) return { premise: detail } as any;
        return {
          ...prev,
          premise: { ...(prev as any).premise, ...detail }
        } as any;
      });

      // 2. Update Title
      if (detail.title) {
        setCurrentEpisodeTitle(detail.title);
      }

      // 3. Persist
      if (currentEpisodeId) {
        try {
          await fetch(`/api/storyteller/episodes/${currentEpisodeId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              premise: detail,
              title: detail.title
            })
          });
        } catch (err) {
          console.error("Failed to persist premise update:", err);
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


  const handleUpdateGlobalBible = async (updates: Partial<StoryPlan>) => {
    if (!currentProject?.id) return

    // Use current project's series bible as base
    const currentBible = (currentProject.series_bible as StoryPlan) || {}
    const newBible = { ...currentBible, ...updates }

    // 1. Update Store immediately
    useWorldStore.getState().setCurrentProject({
      ...currentProject,
      series_bible: newBible
    })

    // If we are NOT in an episode context, also update the local storyPlan state 
    // to keep the UI consistent if it's relying on it.
    if (!currentEpisodeId) {
      setStoryPlan(newBible)
    }

    // 2. Persist to DB
    try {
      await fetch(`/api/storyteller/projects/${currentProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ series_bible: newBible })
      })
    } catch (e) {
      console.error("Failed to save global bible:", e)
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
                  initialPrompt={currentProject.project_prompt || ''}
                  onSave={async (prompt) => {
                    try {
                      await fetch(`/api/storyteller/projects/${currentProject.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ project_prompt: prompt }),
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
                    onEpisodeChange={(id) => {
                      const params = new URLSearchParams(searchParams.toString())
                      params.set('episodeId', id)
                      params.delete('bible') // Implicitly close bible if opening episode
                      router.push(`?${params.toString()}`)
                    }}
                    onEpisodeTitleChange={setCurrentEpisodeTitle}
                    isWorldBibleOpen={isWorldBibleOpen || !currentEpisodeId}
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
                  selectedBeatId={selectedBeatId}
                  episodeId={currentEpisodeId}
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
            <div className="flex-1 overflow-hidden px-6 pb-6 z-10 relative animate-in fade-in zoom-in-95 duration-200">
              <WorldBiblePanel storyPlan={(currentProject?.series_bible as StoryPlan) || {
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
                onUpdate={handleUpdateGlobalBible}
                onSendMessage={(msg) => handleSendMessage(undefined, msg)}
                isReadOnly={isSending}
                onConvertToCast={handleCreateCharacter}
                onClose={() => {
                  const params = new URLSearchParams(searchParams.toString())
                  params.delete('bible')
                  router.push(`?${params.toString()}`)
                }}
              />
            </div>
          ) : currentEpisodeId ? (
            <>
              {/* Header Bar */}
              <div className="shrink-0 border-b border-border flex items-center px-4 bg-card justify-between z-40 relative py-2 gap-4 flex-wrap min-h-[60px]">
                <div className="flex items-center gap-3 shrink-0">
                  <h1 className="text-sm font-bold whitespace-nowrap">
                    {currentEpisodeTitle || `Ep. ${currentEpisodeId?.slice(0, 6) || ''}...`}
                  </h1>

                  {/* Phase indicator with back button only */}
                  <div className="flex items-center gap-1 shrink-0 bg-background/50 p-1 rounded-lg border border-border/50">
                    <button
                      onClick={handlePreviousPhase}
                      disabled={!canGoBack || isSending}
                      className="p-1 rounded-md border border-border hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title={canGoBack ? "Go back (will erase current phase data)" : "Already at first phase"}
                    >
                      <ChevronLeft size={12} />
                    </button>

                    {/* Phase indicators - display only, not clickable */}
                    <div className="flex items-center">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-l-full border transition-colors select-none ${currentPhase === 'premise'
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                          : 'bg-muted/30 text-muted-foreground border-border'
                          }`}
                      >
                        PREMISE
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 border-y border-l transition-colors select-none ${currentPhase === 'breaking'
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          : 'bg-muted/30 text-muted-foreground border-border'
                          }`}
                      >
                        BREAK
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-r-full border transition-colors select-none ${currentPhase === 'writing'
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : 'bg-muted/30 text-muted-foreground border-border'
                          }`}
                      >
                        WRITE
                      </span>
                    </div>
                  </div>
                </div>

                {/* Plan/Beats/Script tabs - enabled/disabled based on current phase */}
                <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5 shrink-0">
                  {/* Plan tab - always available */}
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
                  {/* Beats tab */}
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
                  {/* Script tab */}
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
                    onApprove={() => setIsPlanApproved(true)}
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
                        beats={beats}
                        episodeId={currentEpisodeId || undefined}
                        onAddMessage={(msg) => setMessages(prev => [...prev, msg as any])}
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
            /* No episode selected - show World Bible as fallback */
            <div className="flex-1 overflow-hidden px-6 pb-6 z-10 relative">
              <WorldBiblePanel storyPlan={(currentProject?.series_bible as StoryPlan) || {
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
                onUpdate={handleUpdateGlobalBible}
                onSendMessage={(msg) => handleSendMessage(undefined, msg)}
                isReadOnly={isSending}
                onConvertToCast={handleCreateCharacter}
              />
            </div>
          )}
        </div>

        {/* Right Sidebar: Writers Room */}
        <DomainSidebar
          position="right"
          storageKey="writers-room"
          defaultWidth={384}
          rawContent
        >
          <div className="flex flex-col h-full">
            <ChatInterface
              title="Writers Room"
              isActivityPanelOpen={isActivityPanelOpen}
              onActivityToggle={() => setIsActivityPanelOpen(!isActivityPanelOpen)}
              messages={messages}
              agentConfig={STORYTELLER_AGENT_CONFIG}
              mentions={mentionItems}
              onSendMessage={(msg) => sendMessage('/api/storyteller/chat/stream', {
                message: msg,
                projectId: currentProject?.id,
                threadId: currentEpisodeId || 'general',
                episodeId: currentEpisodeId,
                currentPhase: currentPhase,
                seriesBible: {
                  ...((currentProject?.series_bible as any) || {}),
                  masterPrompt: currentProject?.project_prompt || '',
                  userDecisions: storyDecisions,
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
                streamMode: 'events',
              })}
              onStopStream={handleStopStream}
              onQuestionAnswer={handleQuestionAnswer}
              onQuestionSkip={handleQuestionSkip}
              isSending={isSending}
              showThinking={showThinking}
              ActionComponent={({ action, agentName, id }) => (
                <ActionCommitted
                  entry={{
                    id,
                    agentName,
                    action,
                    timestamp: new Date(),
                    status: ActionStatus.COMMITTED
                  }}
                  compact={true}
                />
              )}
              QuestionComponent={({ question, onAnswer, onSkip }) => (
                <QuestionCard
                  question={question as unknown as AgentQuestion}
                  onAnswer={onAnswer}
                  onSkip={onSkip}
                />
              )}
            >
              {/* Streaming Tokens Injection */}
              {isTokenStreaming && streamingTokens && (
                <div className="mb-4 ml-8 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 mb-1 text-primary">
                    <div className="p-1 rounded bg-primary/10 border-primary/30">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs uppercase tracking-wider">
                      {thinkingAgent || 'Writers Room'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border bg-primary/5 border-primary/20 text-foreground/90 font-mono text-sm leading-relaxed whitespace-pre-wrap shadow-sm">
                    {streamingTokens}
                    <span className="inline-block w-1.5 h-4 ml-1 bg-primary animate-pulse align-middle" />
                  </div>
                </div>
              )}

              {/* Streaming Sections Injection */}
              {streamingSections.length > 0 && (
                <div className="mb-4 ml-8 space-y-2">
                  {streamingSections.map((section) => (
                    <div key={section.key} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/30 border border-muted">
                      {section.status === 'streaming' && <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />}
                      {section.status === 'complete' && <Check className="w-3 h-3 text-green-500" />}
                      <span className="font-medium text-muted-foreground">Generating {section.name}...</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Smart Quick Actions & Propose Next Step */}
              {!isSending && !isTokenStreaming && (
                <div className="mt-4 border-t border-border/10 pt-4 px-4 pb-2">
                  <div className="flex items-center gap-2 mb-1.5 px-1">
                    <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-widest">Suggested</span>
                  </div>
                  <SmartQuickActions
                    currentPhase={currentPhase as any}
                    onSendMessage={(msg) => handleSendMessage(undefined, msg)}
                  />
                </div>
              )}
            </ChatInterface>
          </div>
        </DomainSidebar>
      </div>

      {/* Action Toasts */}
      < ActionToastContainer entries={showToasts} onDismiss={handleDismissToast} />

      {/* Timeline at Bottom */}
      < Timeline
        episodeId={currentEpisodeId}
        beats={beats}
        onBeatSelect={setSelectedBeatId}
        selectedBeatId={selectedBeatId}
        pendingQuestions={pendingQuestions}
      />

      {/* Phase Back Confirmation Dialog */}
      {PhaseBackConfirmDialog}
    </div >
  )
}
