'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { TOUR_STEP_IDS } from '@/lib/tour-constants'
import { useSearchParams, useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { CorkBoard } from '@/domains/storyteller/components/CorkBoard'
import { CharacterPanel } from '@/domains/storyteller/components/CharacterPanel'
// Consolidated Chat & Storyteller Imports
import { ActionHistoryEntry, AgentAction, AgentQuestion } from '@/domains/storyteller/actions/types'
import { ActionStatus, BibleSection } from '@/domains/storyteller/enums'
import {
  actionRequiresApproval,
  getSectionForActionType,
  applyUpdatesToStoryPlan,
} from '@/domains/storyteller/config/action-config'
import { QuestionSession } from '@/domains/storyteller/questions/types'
import { ChatInterface, SmartQuickActions } from '@/domains/chat/components'
import { useChatStream } from '@/domains/chat/hooks/useChatStream'
import { Message, AgentConfigMap } from '@/domains/chat/types'
import {
  getStorytellerMentionProviders,
  buildStorytellerProjectContext,
} from '@/domains/storyteller/mentions/providers'
import { getGameEntityProvider } from '@/domains/chat/mentions/game-entity-provider'
// Import action UI components to pass to ChatInterface
import { ActionCommitted, ActionSuggestion } from '@/domains/storyteller/components/ActionToast'
import { ActionApprovalModal } from '@/domains/storyteller/components/ActionApprovalModal'
import { QuestionCard } from '@/domains/storyteller/components/QuestionCard'
import {
  Bot,
  User,
  Sparkles,
  Brain,
  Lightbulb,
  Scale,
  Eye,
  Pen,
  Loader2,
  Lock,
  Network,
} from 'lucide-react'

// Define Storyteller Agent Config - Minimalist
const STORYTELLER_AGENT_CONFIG: AgentConfigMap = {
  Showrunner: {
    color: 'text-primary',
    bgColor: 'bg-primary/10 border-primary/30',
    icon: <Brain className="w-4 h-4" />,
  },
  PlotArchitect: {
    color: 'text-blue-400/80',
    bgColor: 'bg-blue-400/10 border-blue-400/20',
    icon: <Lightbulb className="w-4 h-4" />,
  },
  CharacterPsychology: {
    color: 'text-purple-400/80',
    bgColor: 'bg-purple-500/10 border-purple-500/30',
    icon: <Brain className="w-4 h-4" />,
  },
  ConsequenceTracker: {
    color: 'text-green-400/80',
    bgColor: 'bg-green-500/10 border-green-500/30',
    icon: <Bot className="w-4 h-4" />,
  },
  DevilsAdvocate: {
    color: 'text-red-400/80',
    bgColor: 'bg-red-500/10 border-red-500/30',
    icon: <Scale className="w-4 h-4" />,
  },
  VisualMoment: {
    color: 'text-cyan-400/80',
    bgColor: 'bg-cyan-500/10 border-cyan-500/30',
    icon: <Eye className="w-4 h-4" />,
  },
  Writer: {
    color: 'text-orange-400/80',
    bgColor: 'bg-orange-500/10 border-orange-500/30',
    icon: <Pen className="w-4 h-4" />,
  },
  User: {
    color: 'text-primary',
    bgColor: 'bg-primary/5 border-primary/20',
    icon: <User className="w-4 h-4" />,
  },
  // Fallback for agents not explicitly defined
  _fallback: {
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/10 border-border/20',
    icon: <Bot className="w-3.5 h-3.5" />,
  },
}

import { EpisodeManager } from '@/domains/storyteller/components/EpisodeManager'
import { MasterPromptEditor } from '@/domains/storyteller/components/MasterPromptEditor'
import { useLoadingStates } from '@/domains/storyteller/hooks/useLoadingStates'
import { PhaseNavigatorCompact } from '@/domains/storyteller/components/PhaseNavigator'
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
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { useGlobalStatusStore } from '@/store/useGlobalStatusStore'
import { posterGenerationService } from '@/domains/storyteller/services/PosterGenerationService'
import { FileText, Users, BookOpen, AlertCircle, Scroll, Film, Check, FilePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DomainSidebar,
  SidebarSection,
  SidebarEmptyState,
  SidebarHeader,
} from '@/components/ui/domain-sidebar'
// regenerateText moved to API call to fix client-side bundle issues
import { StoryPlan, StorySequence } from '@/domains/storyteller/schemas/agent-schemas'

// import { useProjectFromUrl } from '@/hooks/useProjectFromUrl'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'

import { LocalStorageKeys } from '@/constants/localStorage'
import { moodboardGenerationService } from '@/domains/storyteller/services/MoodboardGenerationService'
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

  // Load project from URL - REMOVED (Handled by ProjectLoader in layout)
  // useProjectFromUrl()
  const searchParams = useSearchParams()
  const params = useParams()
  const router = useRouter()

  const currentProject = useWorldStore(state => state.currentProject)
  const setCurrentProject = useWorldStore(state => state.setCurrentProject)

  // Hydrate state from project on load (fixes refresh issue)
  // Uses module-level Set to persist across component remounts and prevent infinite loops
  useEffect(() => {
    const projectId = currentProject?.id
    if (!projectId) {
      return
    }

    // Handle both snake_case (DB row) and camelCase (optimistic updates)
    const rawBible = (currentProject as any)?.series_bible || (currentProject as any)?.seriesBible
    // IMPORTANT: Also get storyPlan from the separate storyPlans table
    const rawStoryPlan = (currentProject as any)?.story_plan || (currentProject as any)?.storyPlan

    console.log('🔍 [StorytellerPage] Hydration Check:', {
      hasRawBible: !!rawBible,
      hasRawStoryPlan: !!rawStoryPlan,
      rawStoryPlanKeys: rawStoryPlan ? Object.keys(rawStoryPlan) : [],
      rawStoryPlanWorldRules: rawStoryPlan?.worldRules?.length || 0,
      rawBibleKeys: rawBible ? Object.keys(rawBible) : [],
      rawBibleUpdatedFieldsWorldRules: rawBible?.updatedFields?.worldRules?.length || 0,
    })

    if (rawBible || rawStoryPlan) {
      console.log('🔄 [StorytellerPage] Hydrating state from project...')
      // Hydration logic removed isHydratedRef
      const bible = (rawBible || {}) as any

      // 1. Sync Decisions
      if (bible.userDecisions) {
        setStoryDecisions(prev => ({ ...prev, ...bible.userDecisions }))
      }

      // 2. Sync StoryPlan
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
        'executiveSummary',
        'episodeRoadmap',
      ]

      // Start with storyPlan from the storyPlans table (PRIMARY source for worldRules etc)
      // FIX: rawStoryPlan (new table) must come LAST to overwrite any stale data in bible.storyPlan
      const initialPlan = { ...(bible.storyPlan || {}), ...(rawStoryPlan || {}) }

      // Merge top-level fields AND nested categories (General, Setting, etc.)
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

      // Helper to merge fields from a source object
      // onlyIfMissing: if true, only merge fields that don't already exist in initialPlan
      const mergeFromSource = (source: any, onlyIfMissing = false) => {
        if (!source) return
        for (const field of planFields) {
          if (source[field] !== undefined && source[field] !== null) {
            // If onlyIfMissing is true, skip fields that already exist
            if (onlyIfMissing && initialPlan[field] !== undefined && initialPlan[field] !== null) {
              continue
            }
            initialPlan[field] = source[field]
          }
        }

        // Alias mapping for characters
        const charAliases = ['characters', 'cast', 'keyPlayers', 'key_players']
        for (const alias of charAliases) {
          if (source[alias] && Array.isArray(source[alias]) && source[alias].length > 0) {
            // Only merge if keyCharacters is empty or we want to append
            initialPlan.keyCharacters = [...(initialPlan.keyCharacters || []), ...source[alias]]
          }
        }

        // Alias mapping for world rules
        if (source.rules && Array.isArray(source.rules)) {
          initialPlan.worldRules = [...(initialPlan.worldRules || []), ...source.rules]
        }
      }

      // 1. Merge from storyPlan table first (highest priority - this is where actions save)
      mergeFromSource(rawStoryPlan, false)

      // 2. Merge from bible categories (only if missing from storyPlan)
      for (const cat of categories) {
        mergeFromSource(bible[cat], true)
      }

      // 3. Merge from top-level bible (only if missing - for backward compat)
      mergeFromSource(bible, true)

      // Deduplicate key characters by name after merging all sources
      if (initialPlan.keyCharacters) {
        const unique = new Map()
        initialPlan.keyCharacters.forEach((c: any) => {
          if (c && c.name) unique.set(c.name, c)
        })
        initialPlan.keyCharacters = Array.from(unique.values())
      }

      // Deduplicate worldRules by rule text after merging all sources
      if (initialPlan.worldRules) {
        const unique = new Map()
        initialPlan.worldRules.forEach((r: any) => {
          if (r && r.rule) unique.set(r.rule, r)
        })
        initialPlan.worldRules = Array.from(unique.values())
      }

      setStoryPlan(initialPlan)
      console.log('✅ [StorytellerPage] Hydrated storyPlan keys:', Object.keys(initialPlan))
      console.log('✅ [StorytellerPage] worldRules count:', initialPlan.worldRules?.length || 0)
      console.log('✅ [StorytellerPage] worldRules:', initialPlan.worldRules)
      console.log(
        '✅ [StorytellerPage] worldDescription (first 100 chars):',
        initialPlan.worldDescription?.slice(0, 100)
      )
    }
  }, [
    currentProject?.id,
    (currentProject as any)?.story_plan?.worldDescription,
    (currentProject as any)?.story_plan?.worldRules?.length,
    (currentProject as any)?.series_bible?.worldDescription,
    (currentProject as any)?.storyPlan?.worldDescription,
    (currentProject as any)?.storyPlan?.worldRules?.length,
  ])

  // Initialize episode from URL param
  const episodeParam = searchParams.get('episodeId')
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(episodeParam)
  const [currentEpisodeTitle, setCurrentEpisodeTitle] = useState<string>('')
  const [currentEpisode, setCurrentEpisode] = useState<{
    id: string
    episode_prompt?: string
  } | null>(null)

  // Fetch current episode details when ID changes
  const [hasEpisodes, setHasEpisodes] = useState(false)
  const [overrideState, setOverrideState] = useState<string | null>(null)

  // Check for override
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const override = localStorage.getItem(LocalStorageKeys.FORCE_STORYTELLER_STATE)
      if (override) setOverrideState(override)
    }
  }, [])

  // Check for existing episodes to determine empty state
  useEffect(() => {
    let isMounted = true
    if (!currentProject?.id) return

    // Apply immediate override if possible
    if (overrideState === 'HAS_EPISODES') {
      setHasEpisodes(true)
      return
    } else if (overrideState === 'NO_EPISODES') {
      setHasEpisodes(false)
      return
    }

    cachedFetch(
      `episodes:${currentProject.id}`,
      async () => {
        const res = await fetch(`/api/storyteller/episodes?projectId=${currentProject.id}`)
        return res.json()
      },
      { ttlMs: 60_000 }
    )
      .then(data => {
        if (!isMounted) return

        // Re-check override in case it changed (though usually steady)
        if (overrideState === 'HAS_EPISODES') {
          setHasEpisodes(true)
        } else if (overrideState === 'NO_EPISODES') {
          setHasEpisodes(false)
        } else if (Array.isArray(data)) {
          setHasEpisodes(data.length > 0)
        }
      })
      .catch(() => {
        // ignore
      })

    return () => {
      isMounted = false
    }
  }, [currentProject?.id, overrideState])

  useEffect(() => {
    if (!currentEpisodeId) {
      setCurrentEpisode(null)
      return
    }

    const fetchEpisode = async () => {
      try {
        const res = await fetch(`/api/storyteller/episodes/${currentEpisodeId}`)
        if (res.ok) {
          const data = await res.json()
          setCurrentEpisode(data)
          if (data.title) setCurrentEpisodeTitle(data.title)
        }
      } catch (err) {
        console.error('Failed to fetch episode:', err)
      }
    }

    fetchEpisode()
  }, [currentEpisodeId])

  const [selectedBeatId, setSelectedBeatId] = useState<string | null>(null)

  // Bible State - Derived from URL
  const bibleParamValue = searchParams.get('bible')
  const isWorldBibleOpen = bibleParamValue === 'open'

  // Character State
  const [characters, setCharacters] = useState<Character[]>([])

  // Beats State
  const [beats, setBeats] = useState<Beat[]>([])

  // Script State
  const [script, setScript] = useState<string>('')
  const [isScriptLoading, setIsScriptLoading] = useState(false)
  const [currentPhase, setCurrentPhase] = useState<string>('premise')
  const [activeTab, setActiveTab] = useState<string>('plan')
  const [lastEpisodeTab, setLastEpisodeTab] = useState<string>('plan') // Remember last non-bible tab
  const [focusEntityId, setFocusEntityId] = useState<string | null>(null)

  // Listen for entity navigation events (from clicking entity references)
  useEffect(() => {
    const handleNavigateToEntity = (e: Event) => {
      const { refId } = (e as CustomEvent).detail || {}
      if (!refId) return

      console.log(`[StorytellerPage] Navigating to entity: ${refId}`)
      setFocusEntityId(refId)

      // Switch to relationships tab (in Bible panel if open, or workspace)
      if (isWorldBibleOpen) {
        // Bible panel has its own tab system - dispatch event to switch tab
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

  // Sync activeTab with currentPhase - ONE navigation, not two
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

  // Bible Lock State
  const [isBibleLocked, setIsBibleLocked] = useState(false)
  const [bibleLockedBy, setBibleLockedBy] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Fetch user email
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = (await import('@supabase/auth-helpers-nextjs')).createClientComponentClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUserEmail(user?.email || null)
    }
    fetchUser()
  }, [])

  // Fetch Bible lock status - using cachedFetch to prevent infinite loops on remount
  useEffect(() => {
    let isMounted = true
    const projectId = currentProject?.id
    if (!projectId) return

    cachedFetch(
      `bible-lock:${projectId}`,
      async () => {
        const response = await fetch(`/api/storyteller/bible/lock?projectId=${projectId}`)
        if (response.ok) {
          return response.json()
        }
        return { isLocked: false, lockedBy: null }
      },
      { ttlMs: 60_000 } // Cache for 1 minute
    )
      .then(data => {
        if (isMounted) {
          setIsBibleLocked(data.isLocked || false)
          setBibleLockedBy(data.lockedBy || null)
        }
      })
      .catch(() => {
        // Silently fail - table might not exist yet
        if (isMounted) {
          setIsBibleLocked(false)
          setBibleLockedBy(null)
        }
      })

    return () => {
      isMounted = false
    }
  }, [currentProject?.id])

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
      window.dispatchEvent(new CustomEvent('bible-opened'))
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

  // Undo state - stores previous storyPlan for undo functionality
  const [undoStack, setUndoStack] = useState<{ storyPlan: StoryPlan | null; actionId: string }[]>(
    []
  )

  // Review modal state
  const [reviewModalAction, setReviewModalAction] = useState<{
    action: AgentAction
    agentName: string
    messageIndex: number
    actionIndex: number
  } | null>(null)

  // Section pending actions - for blur overlay with accept/reject on Bible sections
  const [sectionPendingActions, setSectionPendingActions] = useState<
    Record<
      string,
      {
        section: string
        preview: any
        action: any
        onAccept: () => void
        onReject: () => void
        onReview?: () => void
      }
    >
  >({})

  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false)
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false)
  const [primaryMoodboardUrl, setPrimaryMoodboardUrl] = useState<string | null>(null)
  const [isActivityPanelOpen, setIsActivityPanelOpen] = useState(false)

  // Loading states for verbose "active" mode - tracks all concurrent operations
  const loadingStates = useLoadingStates()

  // Derive if project has a bible foundation
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

  // Story decisions that have been made (to prevent re-asking)
  const [storyDecisions, setStoryDecisions] = useState<Record<string, string>>({})

  // -- RESTORED STATE for Legacy UI compatibility --
  const [input, setInput] = useState('')
  const [pendingQuestions, setPendingQuestions] = useState<QuestionSession[]>([])
  const [answeredQuestions, setAnsweredQuestions] = useState<
    { question: string; answer: string }[]
  >([])
  const [actionHistory, setActionHistory] = useState<ActionHistoryEntry[]>([])

  // Load Action History from LocalStorage
  useEffect(() => {
    if (currentProject?.id) {
      try {
        const key = `actionHistory_${currentProject.id}`
        const saved = localStorage.getItem(key)
        if (saved) {
          setActionHistory(JSON.parse(saved))
        }
      } catch (e) {
        console.error('Failed to load action history:', e)
      }
    }
  }, [currentProject?.id])

  // Save Action History to LocalStorage
  useEffect(() => {
    if (currentProject?.id) {
      try {
        const key = `actionHistory_${currentProject.id}`
        localStorage.setItem(key, JSON.stringify(actionHistory))
      } catch (e) {
        console.error('Failed to save action history:', e)
      }
    }
  }, [actionHistory, currentProject?.id])
  const [showToasts, setShowToasts] = useState<ActionHistoryEntry[]>([])
  const [generatingSection, setGeneratingSection] = useState<string | null>(null)

  // Re-add pendingActionsRef locally as executeAction uses it
  const pendingActionsRef = useRef<number>(0)

  // Polyfills
  const useEnhancedStreaming = true
  const useStreaming = true

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
          imagePrompt: b.image_prompt || b.imagePrompt || null,
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
              console.log(
                '📚 [executeAction] Bible updated, applying to state:',
                Object.keys(bible)
              )

              setStoryDecisions(prev => ({
                ...prev,
                ...(bible.userDecisions || {}),
              }))

              setStoryPlan(prev => {
                // Merge storyPlan fields if present
                const storyPlanUpdates = bible.storyPlan || {}
                const directUpdates = { ...bible }
                delete directUpdates.storyPlan

                // Combine all updates
                const allUpdates = { ...storyPlanUpdates, ...directUpdates }

                // Use centralized utility for consistent merging
                const updated = applyUpdatesToStoryPlan(prev, allUpdates)

                console.log(
                  '📚 [executeAction] bible_updated - Applied fields:',
                  Object.keys(updated).filter(k => (updated as any)[k])
                )
                return updated
              })

              // If characters were synced to table, refetch CharacterPanel data
              if (data.result.characters_synced && currentProject?.id) {
                console.log('🔄 [executeAction] Characters synced - refetching from characters table')
                fetch(`/api/storyteller/characters?projectId=${currentProject.id}`)
                  .then(res => res.json())
                  .then(charData => {
                    if (Array.isArray(charData)) {
                      const mapped = charData.map((c: any) => ({
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
                  .catch(e => console.error('Failed to refetch characters after sync', e))
              }
            }
          } else if (action.type === 'UPDATE_SERIES_BIBLE' || action.type.startsWith('UPDATE_')) {
            // Handle all UPDATE_* action types by applying payload directly to state
            const payload = (action.payload || {}) as any
            const payloadFields = payload.updatedFields || payload

            console.log(
              `📚 [executeAction] Applying ${action.type} update to state:`,
              Object.keys(payloadFields)
            )

            setStoryDecisions(prev => ({
              ...prev,
              ...(payloadFields.userDecisions || {}),
            }))

            setStoryPlan(prev => {
              // Use centralized utility for consistent merging
              const updated = applyUpdatesToStoryPlan(prev, payloadFields)

              console.log(
                '📚 [executeAction] Updated storyPlan fields:',
                Object.keys(updated).filter(k => (updated as any)[k])
              )
              return updated
            })

            // Update local currentProject to stay in sync
            if (currentProject) {
              const mergedBible = {
                ...((currentProject.series_bible as any) || {}),
                ...payloadFields,
              }
              setCurrentProject({
                ...currentProject,
                series_bible: mergedBible,
              })
            }
          } else if (data.result?.type === 'script_updated') {
            if (data.result.script) {
              setScript(data.result.script)
            } else if (data.result.seriesBible?.script) {
              setScript(data.result.seriesBible.script)
            }
          } else if (data.result?.type === 'episode_updated') {
            console.log('📺 [executeAction] Episode updated, applying premise to state')
            if (data.result.storyPlan) {
              setStoryPlan(
                prev =>
                  ({
                    ...prev,
                    ...data.result.storyPlan,
                    premise: data.result.storyPlan.premise || (prev as any)?.premise,
                  }) as any
              )
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
    abortControllerRef,
    updateActionStatus,
    updateActionStatusById,
    loadingSections, // Section-specific loading states for granular shimmer
    setLoadingSections, // To set loading state immediately on button click
  } = useChatStream({
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
      console.log('[Action received]', action.type, action.payload)

        // Fire and forget - don't await to prevent blocking/crashing the stream
        ; (async () => {
          try {
            // Use centralized approval check
            const requiresApproval = actionRequiresApproval(action.type, action.status)

            if (requiresApproval) {
              console.log(`[Action received] ${action.type} - awaiting user approval`, {
                payload: action.payload ? Object.keys(action.payload) : 'no payload',
                status: action.status,
              })
              // Do NOT auto-apply to local state.
              // Wait for user to click "Approve" which will call handleApprove -> executeAction

              // Set section pending action for Bible sections (for blur overlay)
              const section = getSectionForActionType(action.type)
              console.log(`[Action] Mapped action type '${action.type}' to section '${section}'`)

              // For 'full' section or no section, we don't blur a specific Bible panel
              // but the action is still shown as a pending action in the chat interface
              if (section && section !== 'full') {
                console.log(`[Action] Setting section pending overlay for ${section}`)
                // Create handlers that will execute/reject the action
                const handleSectionAccept = async () => {
                  console.log(`[Section Accept] Approving ${action.type} for section ${section}`)
                  // Set processing state on both section overlay AND chat widget
                  if (action.id) {
                    updateActionStatusById(action.id, 'executing')
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
                    if (action.id) {
                      updateActionStatusById(action.id, 'committed')
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
                    if (action.id) {
                      updateActionStatusById(action.id, 'pending')
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
                  console.log(`[Section Reject] Rejecting ${action.type} for section ${section}`)
                  // Sync chat status using ID
                  if (action.id) {
                    updateActionStatusById(action.id, 'rejected')
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
              console.log('[Action committed]', action.type)
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

  // Map action types to Bible section names (using centralized config)
  const getActionSection = useCallback((actionType: string): BibleSection | null => {
    return getSectionForActionType(actionType)
  }, [])

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
        if (action.id) {
          updateActionStatusById(action.id, 'executing')
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

          if (action.id) {
            updateActionStatusById(action.id, 'committed')
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

          if (action.id) {
            updateActionStatusById(action.id, 'pending')
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
        if (action.id) {
          updateActionStatusById(action.id, 'rejected')
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
        if (
          action.type === 'create_character' ||
          (action.type === 'tool_use' && action.tool === 'create_character')
        ) {
          const charName = action.payload?.name || (action.payload as any)?.character?.name
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
        action.type === 'create_character' ||
        (action.type === 'tool_use' && action.tool === 'create_character')

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

  const handleSendMessage = useCallback(
    async (e?: React.FormEvent, msgOverride?: string, section?: string) => {
      e?.preventDefault()
      const content = msgOverride || input

      console.log(
        `[handleSendMessage] Called with section: ${section}, content: ${content?.slice(0, 50)}...`
      )

      if (!content.trim()) return

      // Guard against sending while already sending (prevents race conditions with quick actions)
      if (isSending) {
        console.warn('[Storyteller] Blocked send - already processing a message')
        return
      }

      // IMMEDIATE SHIMMER: Set loading state for section right away (no waiting for tool call)
      if (section) {
        console.log(`[Storyteller] ✨ Setting IMMEDIATE shimmer for section: ${section}`)
        setLoadingSections(prev => {
          console.log('[setLoadingSections] Previous state:', prev)
          const newState = {
            ...prev,
            [section]: { loading: true, message: 'Generating...' },
          }
          console.log('[setLoadingSections] New state:', newState)
          return newState
        })
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

      await sendMessage('/api/storyteller/chat/stream', {
        message: content,
        messages: messages.map(m => ({
          role: m.type === 'human' || m.sender === 'User' ? 'user' : 'assistant',
          content: m.content,
          name: m.sender,
        })),
        projectId: currentProject?.id,
        threadId: currentEpisodeId || 'general',
        episodeId: currentEpisodeId,
        currentPhase: effectivePhase,
        seriesBible: {
          ...((currentProject?.series_bible as any) || {}),
          masterPrompt: currentProject?.masterPrompt || currentProject?.master_prompt || '',
          userDecisions: storyDecisions,
        },
        characters: characters.map((c: any) => ({
          characterId: c.id,
          name: c.name,
          currentGoals: c.psychology?.goals || c.currentGoals || [],
          fears: c.psychology?.fears || c.fears || [],
          selfDelusion: c.psychology?.selfDelusion || c.selfDelusion || '',
          actualMotivation: c.psychology?.actualMotivation || c.actualMotivation || '',
          transformationProgress: c.transformation || 0,
          knowledgeState: c.knowledgeState || [],
          stressLevel: c.stress || c.stressLevel || 30,
        })),
        streamMode: useEnhancedStreaming ? 'events' : 'nodes',
      })
    },
    [
      input,
      messages,
      currentProject,
      currentEpisodeId,
      currentPhase,
      storyDecisions,
      characters,
      sendMessage,
      isWorldBibleOpen,
      activeTab,
      useEnhancedStreaming,
      isSending,
      setLoadingSections,
    ]
  )

  const lastResumedProjectId = useRef<string | null>(null)

  // Resume pending poster generations on mount
  useEffect(() => {
    // Only run if we have a project ID and haven't resumed for this project yet
    if (currentProject?.id && lastResumedProjectId.current !== currentProject.id) {
      lastResumedProjectId.current = currentProject.id

      posterGenerationService.resumePendingGenerations(
        currentProject.id,
        async (url, episodeId, type) => {
          if (episodeId === currentEpisodeId) {
            if (type === 'poster') {
              setIsGeneratingPoster(false)
              setStoryPlan(prev => (prev ? ({ ...prev, posterUrl: url } as any) : null))
            } else {
              // type === 'storyboard' or undefined (legacy) will be treated as storyboard (Gemini)
              setIsGeneratingStoryboard(false)
              setStoryPlan(prev => (prev ? ({ ...prev, storyboardUrl: url } as any) : null))
            }
          }

          // Also persist to DB to ensure it's saved even if not currently viewing the episode
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

        await posterGenerationService.generatePoster(
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

      // Call the moodboard generation service (provider config now read from env on server)
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
      moodboardGenerationService.resumePendingGenerations(projectId, async () => {
        // Refetch project data when generation completes
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
              sequences: episodePlan.sequences || seasonPlan.sequences || [],
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
        const params = new URLSearchParams(searchParams.toString())
        params.set('episodeId', newEpisode.id)
        router.push(`?${params.toString()}`)
        setCurrentEpisodeId(newEpisode.id)

        // Use a small timeout to ensure the state update is processed
        setTimeout(() => {
          handleSendMessage(
            undefined,
            "Let's draft the first episode. Start by generating a compelling premise for 'Episode 1: The Beginning'."
          )
        }, 100)
      }
    } catch (error) {
      console.error('Failed to draft first episode:', error)
      setIsSending(false)
    }
  }, [currentProject?.id, isSending, handleSendMessage, searchParams, router])

  const handleGenerateBible = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('bible', 'open')
    router.push(`?${params.toString()}`)

    // Give it a tiny bit of time for the panel to open before sending message
    setTimeout(() => {
      handleSendMessage(
        undefined,
        "Let's build the series foundation. Help me define the genre, tone, and core rules for this world."
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

  // --- MENTIONS SYSTEM ---
  // Includes domain-specific mentions + cross-domain game entities
  const mentionProviders = React.useMemo(
    () => [
      ...getStorytellerMentionProviders(),
      getGameEntityProvider(), // Cross-domain entities from all tools
    ],
    []
  )

  const projectContextForMentions = React.useMemo(
    () =>
      buildStorytellerProjectContext({
        projectId: currentProject?.id || '',
        characters,
        episodes: [], // Episode list not maintained in this component
        beats: beats,
        seriesBible: {
          ...storyPlan,
          worldRules: storyPlan?.worldRules || [],
          inspirations: storyPlan?.inspirations,
          soundtracks: storyPlan?.soundtracks || [],
          plotTwists: storyPlan?.plotTwists || [],
          factions: storyPlan?.factions || [],
        },
      }),
    [currentProject?.id, characters, beats, storyPlan]
  )

  // Legacy mentions for backwards compatibility
  // Use Array.isArray to handle cases where worldRules/factions might be non-array values
  const worldRulesArray = Array.isArray(storyPlan?.worldRules) ? storyPlan.worldRules : []
  const factionsArray = Array.isArray(storyPlan?.factions) ? storyPlan.factions : []

  const mentionItems = useMemo<any[]>(
    () => [
      ...characters.map(c => ({ id: c.id, name: c.name, type: 'character' as const })),
      ...worldRulesArray.map((r: any, idx: number) => ({
        id: `rule-${idx}`,
        name: r.rule,
        type: 'world_rule' as const,
      })),
      ...factionsArray.map((f: any, idx: number) => ({
        id: `faction-${idx}`,
        name: f.name,
        type: 'faction' as const,
      })),
    ],
    [characters, worldRulesArray, factionsArray]
  )

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
          message: `Please regenerate ONLY the ${readableSection} (${sectionName}) for the episode premise. Return a JSON object containing ONLY this field. Do not include unchanged fields. Delegate to the Episode Premise Architect.`,
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
        return {
          ...prev,
          premise: { ...(prev as any).premise, ...detail },
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

  // Dismiss action toast
  const handleDismissToast = useCallback((entryId: string) => {
    setShowToasts(prev => prev.filter(e => e.id !== entryId))
  }, [])

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
            masterPrompt: prompt,
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

        // Use current project's series bible as base
        const currentBible = (latestProject.series_bible as StoryPlan) || {}
        const newBible = { ...currentBible, ...updates }

        // 1. Update Store immediately
        useWorldStore.getState().setCurrentProject({
          ...latestProject,
          series_bible: newBible,
        })

        // If we are NOT in an episode context, also update the local storyPlan state
        // to keep the UI consistent if it's relying on it.
        if (!currentEpisodeId) {
          setStoryPlan(newBible)
        }

        // 2. Persist to DB
        await fetch(`/api/storyteller/projects/${latestProject.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ series_bible: newBible }),
        })
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
        body: JSON.stringify({ series_bible: newBible }),
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
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString())
                  if (isWorldBibleOpen) {
                    params.delete('bible')
                  } else {
                    params.set('bible', 'open')
                    // Dispatch event for tour
                    window.dispatchEvent(new Event('bible-opened'))
                  }
                  router.push(`?${params.toString()}`)
                }}
                disabled={isSending}
                className={cn(
                  'h-7 px-3 gap-1.5 text-[10px] font-black border-2 transition-all rounded-md uppercase tracking-widest relative overflow-hidden',
                  isWorldBibleOpen && isBibleLocked
                    ? 'bg-transparent text-white border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)] scale-105' // Locked & Open
                    : isWorldBibleOpen && !isBibleLocked
                      ? 'bg-transparent text-white border-yellow-300 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-105' // Open
                      : isBibleLocked
                        ? 'bg-transparent border-red-500/50 text-red-500 hover:border-red-500 shadow-[0_0_5px_rgba(239,68,68,0.2)]' // Locked & Closed
                        : 'bg-transparent border-amber-500/40 hover:border-amber-500 text-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.2)]', // Closed
                  isSending && 'opacity-50 cursor-not-allowed'
                )}
                title={
                  isSending
                    ? 'Bible unavailable while agents are working'
                    : isBibleLocked
                      ? `🔒 Bible Locked by ${bibleLockedBy || 'Admin'} - ${isWorldBibleOpen ? 'Close' : 'Open'} (Read-Only)`
                      : isWorldBibleOpen
                        ? 'Close World Bible'
                        : 'Open World Bible'
                }
                id={TOUR_STEP_IDS.STORYTELLER_BIBLE}
              >
                {/* Divine Shine Effect overlay */}
                {isWorldBibleOpen && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite] skew-x-12" />
                )}

                {isBibleLocked ? (
                  <Lock
                    className={cn(
                      'w-3.5 h-3.5',
                      isWorldBibleOpen ? 'text-white animate-pulse' : 'text-red-500'
                    )}
                  />
                ) : (
                  <BookOpen
                    className={cn(
                      'w-3.5 h-3.5',
                      isWorldBibleOpen ? 'text-yellow-100 animate-pulse' : 'text-amber-500'
                    )}
                  />
                )}
                <span className="relative z-10">BIBLE</span>

                {isWorldBibleOpen && (
                  <div
                    className={cn(
                      'absolute -top-1 -right-1 w-2 h-2 rounded-full animate-ping',
                      isBibleLocked
                        ? 'bg-red-400 shadow-[0_0_10px_#f87171]'
                        : 'bg-yellow-300 shadow-[0_0_10px_#fde047]'
                    )}
                  />
                )}
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
                    initialPrompt={currentProject.masterPrompt || currentProject.master_prompt || ''}
                    onSave={handleSaveProjectPrompt}
                  />
                </SidebarSection>
              </div>

              {/* 3. Episode Manager - disabled while agents working */}
              <div>
                <SidebarSection separator>
                  <div className={isSending ? 'opacity-50 pointer-events-none' : ''}>
                    <EpisodeManager
                      projectId={currentProject.id}
                      currentEpisodeId={currentEpisodeId}
                      onEpisodeChange={id => {
                        const params = new URLSearchParams(searchParams.toString())
                        params.set('episodeId', id)
                        params.delete('bible') // Implicitly close bible if opening episode
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

              {/* 5. Cast List - Characters displayed directly in sidebar */}
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
                  isDeleting={isDeletingCharacter}
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
                  opacity: 0.35,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/70 to-black" />
            </div>
          )}
          {isWorldBibleOpen ? (
            <div className="flex-1 overflow-hidden px-6 pb-6 z-10 relative animate-in fade-in zoom-in-95 duration-200">
              <WorldBiblePanel
                storyPlan={
                  storyPlan || {
                    title: currentProject?.name || 'Untitled',
                    genre: '', // Empty triggers placeholder in UI
                    tone: '', // Empty triggers placeholder in UI
                    centralQuestion: '', // Empty triggers placeholder in UI
                    themes: [],
                    worldRules: [],
                    factions: [],
                    keyCharacters: characters,
                    protagonist: null,
                    antagonist: null,
                  }
                }
                projectId={currentProject?.id || ''}
                onUpdate={handleUpdateGlobalBible}
                onSendMessage={handleBibleSendMessage}
                isReadOnly={isSending}
                onConvertToCast={handleCreateCharacter}
                isLoading={isFetchingPlan}
                loadingSections={loadingSections}
                pendingActions={sectionPendingActions}
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
                {activeTab === 'bible' && (
                  <div className="flex-1 overflow-y-auto w-full h-full p-6">
                    <WorldBiblePanel
                      storyPlan={
                        storyPlan || {
                          title: currentProject?.name || 'Untitled',
                          genre: '',
                          tone: '',
                          centralQuestion: '',
                          themes: [],
                          worldRules: [],
                          factions: [],
                          keyCharacters: characters,
                          protagonist: null,
                          antagonist: null,
                        }
                      }
                      projectId={currentProject?.id || ''}
                      onUpdate={handleUpdateBible}
                      onSendMessage={handleBibleSendMessage}
                      isReadOnly={isSending}
                      isLoading={isFetchingPlan}
                      loadingSections={loadingSections}
                      pendingActions={sectionPendingActions}
                      onConvertToCast={handleCreateCharacter}
                    />
                  </div>
                )}
                {activeTab === 'relationships' && (
                  <div className="flex-1 overflow-hidden relative h-full">
                    <CharacterWeb
                      projectId={currentProject?.id || (params?.projectId as string) || ''}
                      className="h-full"
                      focusEntityId={focusEntityId}
                      onNodeClick={(nodeId, type) => {
                        console.log('Character web node clicked:', nodeId, type)
                        setFocusEntityId(null) // Clear focus after manual click
                      }}
                      key={characterWebVersion}
                    />
                  </div>
                )}
              </div>
            </>
          ) : isWorldBibleOpen ? (
            /* No episode selected but Bible is open - show World Bible */
            <div className="flex-1 overflow-hidden px-6 pb-6 z-10 relative">
              <WorldBiblePanel
                storyPlan={
                  storyPlan || {
                    title: currentProject?.name || 'Untitled',
                    genre: '',
                    tone: '',
                    centralQuestion: '',
                    themes: [],
                    worldRules: [],
                    factions: [],
                    keyCharacters: characters,
                    protagonist: null,
                    antagonist: null,
                  }
                }
                projectId={currentProject?.id || ''}
                onUpdate={handleUpdateGlobalBible}
                onSendMessage={handleBibleSendMessage}
                isReadOnly={isSending}
                isLoading={isFetchingPlan}
                loadingSections={loadingSections}
                pendingActions={sectionPendingActions}
                onConvertToCast={handleCreateCharacter}
              />
            </div>
          ) : (
            /* No episode selected and Bible closed - Show create episode prompt */
            <div className="flex-1 overflow-hidden flex items-center justify-center p-12 z-10 relative">
              <div className="max-w-2xl w-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <div className="p-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/30 shadow-xl">
                      <Film className="w-12 h-12 text-primary" />
                    </div>
                  </div>
                  <h2 className="text-3xl font-bold text-foreground">
                    {hasBible
                      ? hasEpisodes
                        ? 'Select an Episode to Continue'
                        : 'Ready to Create Your First Episode?'
                      : "Let's Build Your World Bible First"}
                  </h2>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    {hasBible
                      ? hasEpisodes
                        ? 'Select an episode from the sidebar to continue writing, or create a new one.'
                        : 'Use the AI to draft your first episode, or manually create one in the sidebar.'
                      : "Before we dive into episodes, let's establish the foundation of your world—the rules, themes, and characters that make it unique."}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  {!hasBible ? (
                    <>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={handleGenerateBible}
                        disabled={isSending}
                        className="gap-2 text-base px-8 font-bold text-yellow-500 transition-all duration-300 rounded-lg overflow-hidden border border-yellow-500/50 hover:border-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20 backdrop-blur-sm hover:shadow-[0_0_20px_-5px_rgba(234,179,8,0.5)] hover:scale-[1.02]"
                      >
                        {isSending ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <BookOpen className="w-5 h-5" />
                        )}
                        Generate World Bible First
                      </Button>

                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => {
                          const params = new URLSearchParams(searchParams.toString())
                          params.set('bible', 'open')
                          router.push(`?${params.toString()}`)
                        }}
                        disabled={isSending}
                        className="gap-2 text-base px-8"
                      >
                        <FilePlus className="w-5 h-5" />
                        Create Manually
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        id={TOUR_STEP_IDS.STORYTELLER_AI_DRAFT}
                        size="lg"
                        variant="outline"
                        onClick={handleDraftFirstEpisode}
                        disabled={isSending}
                        className="gap-2 text-base px-8 font-bold text-primary transition-all duration-300 rounded-lg overflow-hidden border border-primary/50 hover:border-primary bg-primary/10 hover:bg-primary/20 backdrop-blur-sm hover:shadow-[0_0_20px_-5px_rgba(92,124,250,0.5)] hover:scale-[1.02]"
                      >
                        {isSending ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Sparkles className="w-5 h-5" />
                        )}
                        AI Draft First Episode
                      </Button>

                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => {
                          const params = new URLSearchParams(searchParams.toString())
                          params.set('bible', 'open')
                          router.push(`?${params.toString()}`)
                        }}
                        className="gap-2 text-base px-8 shadow-sm"
                      >
                        <BookOpen className="w-5 h-5" />
                        Open World Bible
                      </Button>
                    </>
                  )}
                </div>

                <div className="pt-8 text-xs text-muted-foreground/60 max-w-md mx-auto">
                  <div className="flex items-start gap-2 text-left">
                    <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500/50" />
                    <p>
                      <strong className="text-foreground/80">Tip:</strong>{' '}
                      {hasBible
                        ? 'Your World Bible is ready. Use it as a reference while drafting episodes to maintain consistency.'
                        : 'Starting with the World Bible helps the AI understand your vision and maintain consistency across episodes.'}
                    </p>
                  </div>
                </div>
              </div>
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
          <div className="flex flex-col h-full">
            <ChatInterface
              isActivityPanelOpen={isActivityPanelOpen}
              onActivityToggle={() => setIsActivityPanelOpen(!isActivityPanelOpen)}
              isAdmin={isAdminUser(userEmail)}
              messages={messages}
              agentConfig={STORYTELLER_AGENT_CONFIG}
              mentions={mentionItems}
              mentionProviders={mentionProviders}
              projectContext={projectContextForMentions}
              projectId={currentProject?.id}
              thinkingAgent={thinkingAgent}
              streamingTokens={streamingTokens}
              activeOperations={loadingStates.operations.map(op => ({
                id: op.id,
                type: op.section,
                label: op.label,
                startTime: op.startTime,
                tool: op.details,
              }))}
              onSendMessage={msg => handleSendMessage(undefined, msg)}
              onStopStream={handleStopStream}
              onQuestionAnswer={(id, answer) => handleQuestionAnswer(id, answer)}
              onQuestionSkip={id => handleQuestionSkip(id)}
              onApproveAllActions={handleApproveAllActions}
              isSending={isSending}
              showThinking={showThinking}
              currentPhase={currentPhase}
              ActionComponent={MemoizedActionComponent}
              QuestionComponent={StableQuestionComponent}
            >
              {/* Streaming Tokens Injection - ONLY when Activity ON */}
              {/* NOTE: When Activity OFF, AgentLog's bottom indicator handles the "Processing..." status */}
              {isActivityPanelOpen && isTokenStreaming && streamingTokens && (
                <div className="mb-4 ml-8 animate-in fade-in duration-300">
                  {/* Activity ON: Developer terminal view */}
                  <div className="rounded-lg overflow-hidden border border-zinc-700/50 shadow-xl">
                    {/* Terminal header */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border-b border-zinc-700/50">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                        <div className="w-3 h-3 rounded-full bg-green-500/80" />
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono ml-2">
                        {thinkingAgent === 'RunnableSequence'
                          ? 'agent'
                          : thinkingAgent || 'writers-room'}{' '}
                        — streaming
                      </span>
                      <span className="ml-auto flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        <span className="text-[9px] text-cyan-400 font-mono uppercase tracking-wider">
                          LIVE
                        </span>
                      </span>
                    </div>
                    {/* Terminal body */}
                    <div className="bg-zinc-950 p-3 max-h-[250px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                      <pre className="m-0 text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-words text-emerald-400/90">
                        {streamingTokens}
                        <span className="inline-block w-2 h-4 ml-0.5 bg-emerald-400 animate-pulse align-middle" />
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Streaming Sections Injection - Only show when Activity ON */}
              {isActivityPanelOpen && streamingSections.length > 0 && (
                <div className="mb-4 ml-8 space-y-2">
                  {streamingSections.map(section => (
                    <div
                      key={section.id}
                      className="flex items-center gap-2 text-sm p-2 rounded bg-muted/30 border border-muted"
                    >
                      {section.status === 'in_progress' && (
                        <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      )}
                      {section.status === 'completed' && (
                        <Check className="w-3 h-3 text-green-500" />
                      )}
                      <span className="font-medium text-muted-foreground">
                        Generating {section.label}...
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Smart Quick Actions & Propose Next Step */}
              {!isSending && !isTokenStreaming && (
                <div className="mt-2 border-t border-border/10 pt-2 px-2 pb-1">
                  <div className="flex items-center gap-2 mb-1.5 px-1">
                    <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-widest">
                      Suggested
                    </span>
                  </div>
                  <SmartQuickActions
                    currentPhase={currentPhase as any}
                    onSendMessage={msg => {
                      handleSendMessage(undefined, msg)
                    }}
                  />
                </div>
              )}
            </ChatInterface>
          </div>
        </DomainSidebar>
      </div>

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
      {reviewModalAction && (
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

            if (action.id) {
              updateActionStatusById(action.id, 'executing')
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
                    if (!prev) return prev
                    return {
                      ...prev,
                      sequences: roadmap.episodes || roadmap.sequences || prev.sequences,
                      seasonStructure: roadmap.seasonStructure || prev.seasonStructure,
                      executiveSummary: roadmap.executiveSummary || prev.executiveSummary,
                    }
                  })
                  toast.success('Roadmap updated')
                }
              }

              if (action.id) {
                updateActionStatusById(action.id, 'committed')
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
              if (action.id) {
                updateActionStatusById(action.id, 'pending')
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
            if (action.id) {
              updateActionStatusById(action.id, 'rejected')
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
      )}
    </div>
  )
}
