import {
  Music,
  Book,
  Film,
  Gamepad2,
  Save,
  Edit2,
  X,
  Sparkles,
  Zap,
  Crown,
  Users,
  RefreshCw,
  Star,
  Plus,
  Trash2,
  UserPlus,
  ExternalLink,
  Globe,
  Palette,
  Lightbulb,
  Scale,
  Shuffle,
  Route,
  Lock,
  Unlock,
  Shield,
  Loader2,
} from 'lucide-react'
import { Liquid } from '@/domains/marketing/components/Liquid'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { cn } from '@/lib/utils'
import { useState, useEffect, useCallback } from 'react'
import { LocalStorageKeys } from '@/constants/localStorage'
import { useGlobalStatusStore } from '@/store/useGlobalStatusStore'
import { moodboardGenerationService } from '../services/MoodboardGenerationService'
import toast from 'react-hot-toast'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { isCentralUser, canEditBible, getBibleLockMessage } from '@/lib/bible-permissions'

import {
  StoryPlan,
  WorldRule,
  Faction,
  SoundtrackTrack,
  InspirationItem,
  KeyCharacter,
  StorySequence,
} from '../schemas/agent-schemas'
import { WorldRuleCard } from './WorldRuleCard'
import { FactionCard } from './FactionCard'
import { CharacterCreationDialog } from './CharacterCreationDialog'
import { EpisodeRoadmapCard } from './EpisodeRoadmapCard'
import { SeasonOverviewCard } from './SeasonOverviewCard'
import { StorytellerImage } from './StorytellerImage'
import { YouTubePlayer, YouTubeEmbedPlayer } from './YouTubePlayer'

// Helper to get provider config from localStorage
const getProviderConfig = () => {
  const provider = localStorage.getItem('MOODBOARD_PROVIDER') || 'midjourney'

  // Get Gemini API key (for Nano Banana)
  const geminiConfigStr = localStorage.getItem(LocalStorageKeys.AI_CONFIG_GEMINI)
  let geminiKey = ''
  try {
    if (geminiConfigStr) {
      const parsed = JSON.parse(geminiConfigStr)
      geminiKey = parsed.apiKey || ''
    }
  } catch {
    geminiKey = geminiConfigStr || ''
  }

  // Get LegNext key (for Midjourney)
  const legnextConfigStr = localStorage.getItem(LocalStorageKeys.AI_CONFIG_LEGNEXT)
  let legnextKey = ''
  try {
    legnextKey = legnextConfigStr ? JSON.parse(legnextConfigStr).apiKey : ''
  } catch {
    legnextKey = legnextConfigStr || ''
  }

  if (provider === 'nanobanana') {
    return {
      provider: 'nanobanana' as const,
      apiKey: geminiKey,
      modelId: localStorage.getItem('NANO_BANANA_MODEL_ID') || 'flux-pro',
    }
  } else {
    // Default to midjourney
    return {
      provider: 'midjourney' as const,
      apiKey: legnextKey,
      modelId: 'midjourney',
    }
  }
}

// Local KeyCharacter will be replaced by import

/**
 * Extracts YouTube video ID from various URL formats
 */
function extractVideoId(url: string): string | null {
  if (!url) return null

  // Handle youtu.be shorts
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
  if (shortMatch) return shortMatch[1]

  // Handle youtube.com/watch?v=
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
  if (watchMatch) return watchMatch[1]

  // Handle youtube.com/embed/
  const embedMatch = url.match(/embed\/([a-zA-Z0-9_-]{11})/)
  if (embedMatch) return embedMatch[1]

  return null
}

interface WorldBiblePanelProps {
  storyPlan: StoryPlan
  onUpdate?: (updates: Partial<StoryPlan>) => void
  isReadOnly?: boolean
  onSendMessage?: (msg: string) => void
  projectId?: string
  onConvertToCast?: (character: KeyCharacter) => void
  onClose?: () => void
}

export const WorldBiblePanel: React.FC<WorldBiblePanelProps> = ({
  storyPlan,
  onUpdate,
  isReadOnly = false,
  onSendMessage,
  projectId: propProjectId,
  onConvertToCast,
  onClose,
}) => {
  const rules = storyPlan.worldRules || []
  const factions = storyPlan.factions || []

  // Bible lock state
  const [isBibleLocked, setIsBibleLocked] = useState(false)
  const [lockedBy, setLockedBy] = useState<string | null>(null)
  const [lockedAt, setLockedAt] = useState<Date | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isLockLoading, setIsLockLoading] = useState(false)

  // Check if current user is central user
  const isUserCentralUser = isCentralUser(userEmail)
  const canUserEditBible = canEditBible(userEmail, isBibleLocked)

  // Effective read-only state: original isReadOnly OR locked for non-central users
  const effectiveReadOnly = isReadOnly || !canUserEditBible

  const characters = storyPlan.keyCharacters || []

  const [isEditing, setIsEditing] = useState(false)
  const [localPlan, setLocalPlan] = useState<Partial<StoryPlan>>({})
  const [primaryImageIndex, setPrimaryImageIndex] = useState<number | null>(null)

  // Convert to Cast dialog state
  const [convertDialogOpen, setConvertDialogOpen] = useState(false)
  const [convertingCharacter, setConvertingCharacter] = useState<KeyCharacter | null>(null)

  // Soundtrack player state
  const [playingTrackIndex, setPlayingTrackIndex] = useState<number | null>(null)
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null)

  // Get projectId from prop or URL
  const projectId =
    propProjectId || (typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : '')

  // Derive generating state from global operations (same pattern as TileGenerationService)
  const operations = useGlobalStatusStore(state => state.operations)
  const generatingIndices = new Set<number>()
  const prefix = `moodboard-gen-${projectId}`

  operations.forEach(op => {
    if (op.id === prefix) {
      // Full moodboard generation (all images)
      generatingIndices.add(0)
      generatingIndices.add(1)
      generatingIndices.add(2)
      generatingIndices.add(3)
    } else if (op.id.startsWith(prefix + '-')) {
      const suffix = op.id.replace(prefix + '-', '')
      const idx = parseInt(suffix)
      if (!isNaN(idx)) generatingIndices.add(idx)
    }
  })

  const isGenerating = generatingIndices.size > 0

  // Load primary image selection from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && projectId) {
      const savedPrimary = localStorage.getItem(`moodboard-primary-${projectId}`)
      if (savedPrimary !== null) {
        const idx = parseInt(savedPrimary)
        if (!isNaN(idx)) setPrimaryImageIndex(idx)
      }
    }
  }, [projectId])

  useEffect(() => {
    setLocalPlan(storyPlan)
  }, [storyPlan])

  // Refetch project data and update moodboard images
  const refetchMoodboardData = useCallback(async () => {
    if (!projectId) return
    try {
      const response = await fetch(`/api/storyteller/projects/${projectId}`)
      if (!response.ok) return
      const data = await response.json()
      // API returns seriesBible (camelCase)
      const bible = data.seriesBible || data.series_bible
      if (bible?.moodImages && onUpdate) {
        console.log('📥 Refetched moodImages:', bible.moodImages)
        onUpdate({ moodImages: bible.moodImages })
      }
    } catch (error) {
      console.error('Failed to refetch moodboard data:', error)
    }
  }, [projectId, onUpdate])

  // Listen for moodboard generation completion events
  useEffect(() => {
    const handleMoodboardComplete = (event: CustomEvent) => {
      if (event.detail?.projectId === projectId) {
        console.log('🖼️ Moodboard generation complete, refetching data...')
        refetchMoodboardData()
      }
    }

    window.addEventListener(
      'moodboard-generation-complete',
      handleMoodboardComplete as EventListener
    )
    return () => {
      window.removeEventListener(
        'moodboard-generation-complete',
        handleMoodboardComplete as EventListener
      )
    }
  }, [projectId, refetchMoodboardData])

  // Save primary image selection to localStorage
  const handleSetPrimaryImage = (index: number) => {
    const newIndex = primaryImageIndex === index ? null : index
    setPrimaryImageIndex(newIndex)
    if (typeof window !== 'undefined' && projectId) {
      if (newIndex !== null) {
        localStorage.setItem(`moodboard-primary-${projectId}`, newIndex.toString())
      } else {
        localStorage.removeItem(`moodboard-primary-${projectId}`)
      }
      // Dispatch event to update background in parent
      window.dispatchEvent(new CustomEvent('moodboard-primary-changed'))
    }
  }

  // Fetch user email on mount
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClientComponentClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUserEmail(user?.email || null)
    }
    fetchUser()
  }, [])

  // Fetch Bible lock status (with error handling to prevent infinite loops)
  useEffect(() => {
    let isMounted = true

    const fetchLockStatus = async () => {
      if (!projectId) return

      try {
        const response = await fetch(`/api/storyteller/bible/lock?projectId=${projectId}`)
        if (response.ok && isMounted) {
          const data = await response.json()
          setIsBibleLocked(data.isLocked || false)
          setLockedBy(data.lockedBy || null)
          setLockedAt(data.lockedAt ? new Date(data.lockedAt) : null)
        }
        // Silently fail if not ok (table might not exist yet)
      } catch (error) {
        console.warn('[Bible Lock] Failed to fetch lock status (non-critical):', error)
        // Set defaults on error to prevent retries
        if (isMounted) {
          setIsBibleLocked(false)
          setLockedBy(null)
          setLockedAt(null)
        }
      }
    }
    fetchLockStatus()

    return () => {
      isMounted = false
    }
  }, [projectId])

  // Handle lock/unlock
  const handleToggleLock = async () => {
    if (!projectId || !userEmail) return

    setIsLockLoading(true)

    try {
      const action = isBibleLocked ? 'unlock' : 'lock'
      const response = await fetch('/api/storyteller/bible/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, action, userEmail }),
      })

      if (response.ok) {
        const data = await response.json()
        setIsBibleLocked(data.action === 'lock')
        setLockedBy(data.lockedBy)
        setLockedAt(data.lockedAt ? new Date(data.lockedAt) : null)

        toast.success(
          data.action === 'lock'
            ? '🔒 Bible locked - only central users can edit'
            : '🔓 Bible unlocked - all users can edit'
        )
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update lock status')
      }
    } catch (error) {
      console.error('Failed to toggle Bible lock:', error)
      toast.error('Failed to update lock status')
    } finally {
      setIsLockLoading(false)
    }
  }

  // Get primary image URL for background
  const primaryImageUrl =
    primaryImageIndex !== null && storyPlan.moodImages?.[primaryImageIndex]
      ? `/projects/${projectId}/${storyPlan.moodImages[primaryImageIndex]}`
      : null

  const handleSave = () => {
    // Check permissions before saving
    if (!canUserEditBible) {
      toast.error('Cannot edit locked Bible - you need admin permissions')
      return
    }

    if (onUpdate) {
      onUpdate(localPlan)
    }
    setIsEditing(false)
  }

  const handleChange = <K extends keyof StoryPlan>(field: K, value: StoryPlan[K]) => {
    // Check permissions before changing
    if (!canUserEditBible) {
      toast.error('Cannot edit locked Bible')
      return
    }

    setLocalPlan(prev => ({ ...prev, [field]: value }))
  }

  const handleInspirationChange = (category: 'books' | 'movies' | 'games', value: string) => {
    const current = localPlan.inspirations || { books: [], movies: [], games: [] }
    const list = value
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
    setLocalPlan(prev => ({
      ...prev,
      inspirations: {
        ...current,
        [category]: list,
      },
    }))
  }

  // World Rules handlers
  const handleWorldRuleChange = <K extends keyof WorldRule>(
    index: number,
    field: K,
    value: WorldRule[K]
  ) => {
    const rules = [...(localPlan.worldRules || [])]
    if (rules[index]) {
      rules[index] = { ...rules[index], [field]: value }
      setLocalPlan(prev => ({ ...prev, worldRules: rules }))
    }
  }

  const handleAddWorldRule = () => {
    const rules = [...(localPlan.worldRules || [])]
    rules.push({ category: 'Physics', rule: '', consequence: '', exceptions: null })
    setLocalPlan(prev => ({ ...prev, worldRules: rules }))
  }

  const handleRemoveWorldRule = (index: number) => {
    const rules = [...(localPlan.worldRules || [])]
    rules.splice(index, 1)
    setLocalPlan(prev => ({ ...prev, worldRules: rules }))
  }

  // Factions handlers
  const handleFactionChange = <K extends keyof Faction>(
    index: number,
    field: K,
    value: Faction[K]
  ) => {
    const factions = [...(localPlan.factions || [])]
    if (factions[index]) {
      factions[index] = { ...factions[index], [field]: value }
      setLocalPlan(prev => ({ ...prev, factions }))
    }
  }

  const handleAddFaction = () => {
    const factions = [...(localPlan.factions || [])]
    factions.push({
      id: `faction-${Date.now()}`,
      name: '',
      ideology: '',
      goals: [],
      resources: '',
      weaknesses: null,
      rivals: null,
    })
    setLocalPlan(prev => ({ ...prev, factions }))
  }

  const handleRemoveFaction = (index: number) => {
    const factions = [...(localPlan.factions || [])]
    factions.splice(index, 1)
    setLocalPlan(prev => ({ ...prev, factions }))
  }

  // Plot Twists handlers
  const handlePlotTwistChange = (index: number, value: string) => {
    const twists = [...(localPlan.plotTwists || [])]
    twists[index] = value
    setLocalPlan(prev => ({ ...prev, plotTwists: twists }))
  }

  const handleAddPlotTwist = () => {
    const twists = [...(localPlan.plotTwists || [])]
    twists.push('')
    setLocalPlan(prev => ({ ...prev, plotTwists: twists }))
  }

  const handleRemovePlotTwist = (index: number) => {
    const twists = [...(localPlan.plotTwists || [])]
    twists.splice(index, 1)
    setLocalPlan(prev => ({ ...prev, plotTwists: twists }))
  }

  // Sequences (Episode Roadmap) handlers
  const handleSequenceChange = <K extends keyof StorySequence>(
    index: number,
    field: K,
    value: StorySequence[K]
  ) => {
    const sequences = [...(localPlan.sequences || [])]
    if (sequences[index]) {
      sequences[index] = { ...sequences[index], [field]: value }
      setLocalPlan(prev => ({ ...prev, sequences }))
    }
  }

  const handleAddSequence = () => {
    const sequences = [...(localPlan.sequences || [])]
    const newId = sequences.length > 0 ? Math.max(...sequences.map(s => s.id)) + 1 : 1
    sequences.push({
      id: newId,
      name: '',
      description: '',
      keyFactionsInvolved: [],
      worldConsequence: '',
    })
    setLocalPlan(prev => ({ ...prev, sequences }))
  }

  const handleRemoveSequence = (index: number) => {
    const sequences = [...(localPlan.sequences || [])]
    sequences.splice(index, 1)
    setLocalPlan(prev => ({ ...prev, sequences }))
  }

  // Key Characters handlers
  const handleKeyCharacterChange = <K extends keyof KeyCharacter>(
    index: number,
    field: K,
    value: KeyCharacter[K]
  ) => {
    const chars = [...(localPlan.keyCharacters || [])]
    if (chars[index]) {
      chars[index] = { ...chars[index], [field]: value }
      setLocalPlan(prev => ({ ...prev, keyCharacters: chars }))
    }
  }

  const handleAddKeyCharacter = () => {
    const chars = [...(localPlan.keyCharacters || [])]
    chars.push({ name: '', role: '', archetype: '', motivation: '', factionId: null })
    setLocalPlan(prev => ({ ...prev, keyCharacters: chars }))
  }

  const handleRemoveKeyCharacter = (index: number) => {
    const chars = [...(localPlan.keyCharacters || [])]
    chars.splice(index, 1)
    setLocalPlan(prev => ({ ...prev, keyCharacters: chars }))
  }

  // Convert to Cast handlers
  const handleOpenConvertDialog = (char: KeyCharacter) => {
    setConvertingCharacter(char)
    setConvertDialogOpen(true)
  }

  const handleCloseConvertDialog = () => {
    setConvertDialogOpen(false)
    setConvertingCharacter(null)
  }

  const handleCreateFromConvert = (character: KeyCharacter) => {
    if (onConvertToCast) {
      onConvertToCast(character)
    }
    handleCloseConvertDialog()
  }

  // Build initial data for the dialog from the key player
  const convertInitialData = convertingCharacter
    ? {
      name: convertingCharacter.name,
      description: [
        convertingCharacter.archetype && `Archetype: ${convertingCharacter.archetype}`,
        convertingCharacter.motivation && `Motivation: ${convertingCharacter.motivation}`,
      ]
        .filter(Boolean)
        .join('. '),
      role: convertingCharacter.role,
    }
    : undefined

  // Derived characters list (handling backwards compatibility safely)
  const displayCharacters = [...(storyPlan.keyCharacters || [])]

  // Backwards compatibility for old "protagonist" field
  if (
    storyPlan.protagonist &&
    !displayCharacters.find(c => c.name === storyPlan.protagonist?.name)
  ) {
    displayCharacters.push({
      name: storyPlan.protagonist.name,
      role: 'Protagonist',
      archetype: 'Hero',
      motivation: storyPlan.protagonist.want,
    })
  }

  return (
    <div className="h-full relative flex flex-col">
      {/* Fixed Header at top */}
      <div
        className="bg-background/80 backdrop-blur-xl border-b border-border/40 pb-[10px] flex items-center justify-between rounded-lg"
        style={{
          marginLeft: -25,
          marginRight: -25,
          paddingLeft: 25,
          paddingRight: 25,
          paddingTop: 10,
        }}
      >
        <div>
          <h2 className="text-xl font-bold font-syne text-primary">World Bible</h2>
        </div>
        <div className="flex gap-2 items-center">
          {/* Lock/Unlock Button - Visible to ALL users, clickable only by admin */}
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={isUserCentralUser ? handleToggleLock : undefined}
                  disabled={isLockLoading || !isUserCentralUser}
                  className={cn(
                    'gap-2 h-8 border transition-colors',
                    isBibleLocked
                      ? 'border-amber-500/50 text-amber-500'
                      : 'border-muted-foreground/30 text-muted-foreground',
                    isUserCentralUser &&
                    isBibleLocked &&
                    'hover:bg-amber-500/10 hover:border-amber-500',
                    isUserCentralUser &&
                    !isBibleLocked &&
                    'hover:bg-muted/50 hover:border-muted-foreground/50',
                    !isUserCentralUser && 'cursor-default opacity-70'
                  )}
                >
                  {isLockLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isBibleLocked ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <Unlock className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[250px]">
                <p className="text-sm font-medium">
                  {isBibleLocked ? '🔒 Bible is locked' : '🔓 Bible is unlocked'}
                </p>
                {isBibleLocked && lockedBy && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Locked by <span className="font-medium text-amber-400">{lockedBy}</span>
                  </p>
                )}
                {isBibleLocked && lockedAt && (
                  <p className="text-xs text-muted-foreground">
                    {lockedAt.toLocaleDateString()} at {lockedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
                {isUserCentralUser && (
                  <p className="text-xs text-amber-400 mt-2">
                    Click to {isBibleLocked ? 'unlock' : 'lock'}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Edit Button - Clean outline style matching lock button */}
          {!isReadOnly && onUpdate && canUserEditBible && !isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="gap-2 h-8 border-muted-foreground/30 text-muted-foreground hover:bg-muted/50 hover:border-muted-foreground/50 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              <span className="text-xs">Edit</span>
            </Button>
          )}

          {!isReadOnly && onUpdate && canUserEditBible && isEditing && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsEditing(false)
                  setLocalPlan(storyPlan)
                }}
                className="gap-2 h-8 border-muted-foreground/30 text-muted-foreground hover:bg-muted/50 hover:border-muted-foreground/50 transition-colors"
              >
                <X className="w-4 h-4" />
                <span className="text-xs">Cancel</span>
              </Button>
              <Button
                onClick={handleSave}
                size="sm"
                className="gap-2 h-8 border border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500 transition-colors bg-transparent"
              >
                <Save className="w-4 h-4" />
                <span className="text-xs">Save</span>
              </Button>
            </>
          )}

          {/* Locked Info for Non-Central Users */}
          {isBibleLocked && !canUserEditBible && !isUserCentralUser && (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 px-3 py-1 bg-muted/20 border border-amber-500/30 rounded-md cursor-help">
                    <Shield className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs text-amber-500 font-medium">Read Only</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[250px]">
                  <p className="text-sm font-medium">🔒 Bible is locked</p>
                  {lockedBy && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Locked by <span className="font-medium text-amber-400">{lockedBy}</span>
                    </p>
                  )}
                  {lockedAt && (
                    <p className="text-xs text-muted-foreground">
                      {lockedAt.toLocaleDateString()} at {lockedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">Contact an admin to unlock</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pr-2 pt-6">
        <div className="space-y-8 pb-20">
          {/* WORLD DESCRIPTION */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary/70" />
                <h3 className="font-syne font-bold text-lg">Overview</h3>
              </div>
              {!isReadOnly && onSendMessage && (
                <IconButton
                  icon={<RefreshCw size={14} />}
                  onClick={() =>
                    onSendMessage(
                      'Generate a rich world description including setting, atmosphere, and key details.'
                    )
                  }
                  tooltip="Generate World Description"
                  size="sm"
                />
              )}
            </div>

            {/* High Level Meta Info (Title, Genre, Tone) */}
            {!isEditing &&
              (storyPlan.title || storyPlan.genre || storyPlan.tone || storyPlan.centralQuestion) ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Title, Genre, Tone Card */}
                {(storyPlan.title || storyPlan.genre || storyPlan.tone) && (
                  <div className="md:col-span-2 p-6 rounded-xl bg-muted/20 border border-border/50 flex flex-col justify-center">
                    {storyPlan.title && (
                      <h1 className="text-3xl font-bold font-syne text-foreground mb-4 tracking-tight leading-tight">
                        {storyPlan.title}
                      </h1>
                    )}
                    <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm font-mono text-muted-foreground">
                      {storyPlan.genre && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">
                            Genre
                          </span>
                          <span className="font-medium text-foreground/80">{storyPlan.genre}</span>
                        </div>
                      )}
                      {storyPlan.tone && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">
                            Tone
                          </span>
                          <span className="font-medium text-foreground/80 leading-snug max-w-md">
                            {storyPlan.tone}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Central Question Card */}
                {storyPlan.centralQuestion && (
                  <div className="md:col-span-1 p-6 rounded-xl bg-muted/10 border border-border/40 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-3.5 h-3.5 text-muted-foreground/60" />
                      <div className="text-[10px] font-bold font-mono text-muted-foreground/60 uppercase tracking-widest">
                        Central Question
                      </div>
                    </div>
                    <div className="text-lg font-syne italic text-foreground/90 leading-snug">
                      "{storyPlan.centralQuestion}"
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <div className="w-full mt-8">
              {isEditing ? (
                <textarea
                  className="w-full h-64 p-6 bg-background border border-border rounded-xl text-sm font-sans focus:ring-1 focus:ring-primary/30 outline-none resize-none shadow-sm"
                  value={localPlan.worldDescription || ''}
                  onChange={e => handleChange('worldDescription', e.target.value)}
                  placeholder="Describe the world..."
                />
              ) : (
                <div className="p-8 bg-muted/5 border border-border/20 rounded-2xl">
                  <div className="max-w-4xl mx-auto text-foreground/80 text-[15px] leading-relaxed font-sans whitespace-pre-wrap">
                    {storyPlan.worldDescription || (
                      <span className="text-muted-foreground italic">
                        No world description available.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* MOODBOARD SECTION */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-pink-400/80" />
                <h3 className="font-syne font-bold text-lg">Moodboard</h3>
              </div>
              {isEditing && (
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (isGenerating) return
                      if (!storyPlan.worldDescription) {
                        toast.error('Please add a world description first.')
                        return
                      }
                      const config = getProviderConfig()
                      if (!config.apiKey) {
                        toast.error(
                          `Missing API key for ${config.provider}. Please configure in Settings.`
                        )
                        return
                      }
                      try {
                        await moodboardGenerationService.generate(
                          projectId,
                          [], // Prompts are generated on backend
                          undefined, // Style ref handled on backend
                          config,
                          refetchMoodboardData
                        )
                      } catch (e) {
                        console.error(e)
                        toast.error('Error starting generation')
                      }
                    }}
                    disabled={isGenerating}
                    className={`p-1.5 rounded-md transition-colors ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
                    title="Generate Moodboard"
                  >
                    <RefreshCw size={14} className={isGenerating ? 'animate-spin' : ''} />
                  </button>
                </div>
              )}
            </div>

            {storyPlan.moodImages && storyPlan.moodImages.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {storyPlan.moodImages.map((img, i) => {
                  if (typeof img !== 'string') return null
                  const isPrimary = primaryImageIndex === i
                  const isFile = img.match(/\.(png|jpg|jpeg|webp)$/i) || img.startsWith('http')
                  const imageUrl = isFile
                    ? img.startsWith('http')
                      ? img
                      : `/projects/${projectId}/${img}`
                    : null

                  const isLoading = generatingIndices.has(i)

                  return (
                    <StorytellerImage
                      key={i}
                      src={imageUrl}
                      alt={`Mood ${i + 1}`}
                      isLoading={isLoading}
                      isPrimary={isPrimary}
                      className="group relative"
                      emptyLabel={!isFile ? img : 'No Image'}
                      overlay={
                        !isReadOnly && (
                          <div className="flex gap-2">
                            {/* Set as Primary Button */}
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                handleSetPrimaryImage(i)
                              }}
                              className={`p-2 rounded-full transition-colors ${isPrimary ? 'bg-yellow-400 text-black' : 'bg-white/20 hover:bg-yellow-400 text-white hover:text-black backdrop-blur-md'}`}
                              title={isPrimary ? 'Remove as primary' : 'Set as primary background'}
                            >
                              <Star size={16} className={isPrimary ? 'fill-current' : ''} />
                            </button>
                            {/* Regenerate Button */}
                            <button
                              onClick={async e => {
                                e.stopPropagation()
                                if (isLoading) return
                                const config = getProviderConfig()
                                if (!config.apiKey) {
                                  toast.error(
                                    `Missing API key for ${config.provider}. Please configure in Settings.`
                                  )
                                  return
                                }
                                try {
                                  await moodboardGenerationService.generate(
                                    projectId,
                                    [],
                                    undefined,
                                    config,
                                    refetchMoodboardData,
                                    i // promptIndex for single image regeneration
                                  )
                                } catch (err) {
                                  console.error(err)
                                  toast.error('Error starting regeneration')
                                }
                              }}
                              disabled={isLoading}
                              className={`p-2 rounded-full text-white transition-colors ${isLoading ? 'bg-pink-500/50 cursor-not-allowed' : 'bg-pink-500/80 hover:bg-pink-500 backdrop-blur-md'}`}
                              title="Regenerate"
                            >
                              <Sparkles size={16} className={isLoading ? 'animate-spin' : ''} />
                            </button>
                          </div>
                        )
                      }
                    >
                      {/* Primary indicator (always visible if primary) */}
                      {isPrimary && (
                        <div className="absolute top-1 left-1 z-20">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 drop-shadow-md" />
                        </div>
                      )}
                    </StorytellerImage>
                  )
                })}
              </div>
            ) : (
              <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic mb-4">
                No mood visuals generated yet.
              </div>
            )}

            {/* Image Prompts Display */}
            {storyPlan.imagePrompts && (
              <div className="mt-4 p-3 bg-pink-500/5 border border-pink-500/10 rounded-lg">
                <h4 className="text-xs font-bold text-pink-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Sparkles className="w-3 h-3" /> Visual Direction (Prompts)
                </h4>
                <div className="space-y-2">
                  {Object.entries(storyPlan.imagePrompts as Record<string, string>).map(
                    ([key, prompt], i) => (
                      <div key={i} className="text-xs text-muted-foreground/80">
                        <span className="font-mono text-pink-300 mr-2 uppercase text-[10px]">
                          {key}:
                        </span>
                        <span className="italic">"{prompt}"</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Music className="w-5 h-5 text-cyan-400/80" />
                <h3 className="font-syne font-bold text-lg">Soundtrack</h3>
              </div>
              {!isReadOnly && onSendMessage && (
                <button
                  onClick={() =>
                    onSendMessage(
                      'Suggest 3-5 real YouTube soundtrack recommendations for this world. For each track, provide the song title, artist name, and actual YouTube URL. Choose music that reinforces the tone and atmosphere.'
                    )
                  }
                  className="p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105"
                  title="Generate Soundtracks"
                >
                  <RefreshCw size={14} />
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  className="w-full p-2 bg-background border border-border rounded text-sm font-mono focus:ring-1 focus:ring-primary/50 outline-none"
                  value={localPlan.moodSoundtrack || ''}
                  onChange={e => handleChange('moodSoundtrack', e.target.value)}
                  placeholder="General mood/atmosphere description..."
                />
                <p className="text-xs text-muted-foreground font-mono">
                  Soundtracks generated via refresh button.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Legacy mood description */}
                {storyPlan.moodSoundtrack && (
                  <div className="p-3 bg-muted/10 border border-border rounded">
                    <span className="text-sm text-muted-foreground font-mono">
                      {storyPlan.moodSoundtrack}
                    </span>
                  </div>
                )}

                {/* YouTube Tracks */}
                {storyPlan.soundtracks && storyPlan.soundtracks.length > 0 ? (
                  <div className="space-y-1">
                    {storyPlan.soundtracks.map((track: SoundtrackTrack, i: number) => (
                      <YouTubePlayer
                        key={i}
                        title={track.title}
                        artist={track.artist}
                        youtubeUrl={track.youtubeUrl}
                        mood={track.mood}
                        isCurrentlyPlaying={playingTrackIndex === i}
                        onPlay={() => {
                          const videoId = extractVideoId(track.youtubeUrl)
                          if (videoId) {
                            setPlayingTrackIndex(i)
                            setPlayingVideoId(videoId)
                          }
                        }}
                        onStop={() => {
                          setPlayingTrackIndex(null)
                          setPlayingVideoId(null)
                        }}
                      />
                    ))}

                    {/* Floating YouTube Player */}
                    {playingVideoId && (
                      <YouTubeEmbedPlayer
                        videoId={playingVideoId}
                        onEnded={() => {
                          setPlayingTrackIndex(null)
                          setPlayingVideoId(null)
                        }}
                      />
                    )}
                  </div>
                ) : (
                  !storyPlan.moodSoundtrack && (
                    <div className="p-3 border border-dashed border-border rounded text-sm text-muted-foreground font-mono italic">
                      No soundtrack defined.
                    </div>
                  )
                )}
              </div>
            )}
          </section>

          {/* INSPIRATIONS */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-emerald-400/80" />
                <h3 className="font-syne font-bold text-lg">Inspirations</h3>
              </div>
              {!isReadOnly && onSendMessage && (
                <button
                  onClick={() =>
                    onSendMessage(
                      'Generate diverse inspirations for this world - include relevant books, movies, and games. For each, provide the exact title and 1-2 sentences describing what it is and why it\'s thematically relevant.'
                    )
                  }
                  className="p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105"
                  title="Generate Inspirations"
                >
                  <RefreshCw size={14} />
                </button>
              )}
            </div>
            <TooltipProvider>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* BOOKS */}
                <div className="p-4 bg-muted/5 border border-border/30 rounded-xl">
                  <div className="flex items-center gap-2 mb-3 text-emerald-400/70 font-mono text-[10px] uppercase tracking-widest">
                    <Book className="w-3.5 h-3.5" /> Books
                  </div>
                  {isEditing ? (
                    <textarea
                      className="w-full h-16 p-2 bg-background border border-border rounded text-xs font-mono resize-none"
                      placeholder="Comma separated..."
                      value={(localPlan.inspirations?.books || [])
                        .map((item: string | InspirationItem) => (typeof item === 'string' ? item : item.title))
                        .join(', ')}
                      onChange={e => handleInspirationChange('books', e.target.value)}
                    />
                  ) : (
                    <div className="space-y-1">
                      {storyPlan.inspirations?.books?.length ? (
                        storyPlan.inspirations.books.map((item: InspirationItem, i: number) => {
                          const title = typeof item === 'string' ? item : item.title
                          const description = typeof item === 'object' ? item.description : null
                          return description ? (
                            <Tooltip key={i}>
                              <TooltipTrigger asChild>
                                <a
                                  href={`https://www.google.com/search?q=${encodeURIComponent(title + ' book')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block text-xs text-muted-foreground/70 font-sans hover:text-foreground transition-colors"
                                >
                                  {title}
                                </a>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs font-sans text-xs">
                                <p>{description}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <a
                              key={i}
                              href={`https://www.google.com/search?q=${encodeURIComponent(title + ' book')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-xs text-muted-foreground/70 font-sans hover:text-foreground transition-colors"
                            >
                              {title}
                            </a>
                          )
                        })
                      ) : (
                        <div className="text-xs text-muted-foreground/40 font-sans italic">
                          None
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* MOVIES */}
                <div className="p-4 bg-muted/5 border border-border/30 rounded-xl">
                  <div className="flex items-center gap-2 mb-3 text-rose-400/70 font-mono text-[10px] uppercase tracking-widest">
                    <Film className="w-3.5 h-3.5" /> Movies
                  </div>
                  {isEditing ? (
                    <textarea
                      className="w-full h-16 p-2 bg-background border border-border rounded text-xs font-mono resize-none"
                      placeholder="Comma separated..."
                      value={(localPlan.inspirations?.movies || [])
                        .map((item: string | InspirationItem) => (typeof item === 'string' ? item : item.title))
                        .join(', ')}
                      onChange={e => handleInspirationChange('movies', e.target.value)}
                    />
                  ) : (
                    <div className="space-y-1">
                      {storyPlan.inspirations?.movies?.length ? (
                        storyPlan.inspirations.movies.map((item: InspirationItem, i: number) => {
                          const title = typeof item === 'string' ? item : item.title
                          const description = typeof item === 'object' ? item.description : null
                          return description ? (
                            <Tooltip key={i}>
                              <TooltipTrigger asChild>
                                <a
                                  href={`https://www.google.com/search?q=${encodeURIComponent(title + ' movie')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block text-xs text-muted-foreground/70 font-sans hover:text-foreground transition-colors"
                                >
                                  {title}
                                </a>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs font-sans text-xs">
                                <p>{description}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <a
                              key={i}
                              href={`https://www.google.com/search?q=${encodeURIComponent(title + ' movie')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-xs text-muted-foreground/70 font-sans hover:text-foreground transition-colors"
                            >
                              {title}
                            </a>
                          )
                        })
                      ) : (
                        <div className="text-xs text-muted-foreground/40 font-sans italic">
                          None
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* GAMES */}
                <div className="p-4 bg-muted/5 border border-border/30 rounded-xl">
                  <div className="flex items-center gap-2 mb-3 text-violet-400/70 font-mono text-[10px] uppercase tracking-widest">
                    <Gamepad2 className="w-3.5 h-3.5" /> Games
                  </div>
                  {isEditing ? (
                    <textarea
                      className="w-full h-16 p-2 bg-background border border-border rounded text-xs font-mono resize-none"
                      placeholder="Comma separated..."
                      value={(localPlan.inspirations?.games || [])
                        .map((item: string | InspirationItem) => (typeof item === 'string' ? item : item.title))
                        .join(', ')}
                      onChange={e => handleInspirationChange('games', e.target.value)}
                    />
                  ) : (
                    <div className="space-y-1">
                      {storyPlan.inspirations?.games?.length ? (
                        storyPlan.inspirations.games.map((item: InspirationItem, i: number) => {
                          const title = typeof item === 'string' ? item : item.title
                          const description = typeof item === 'object' ? item.description : null
                          return description ? (
                            <Tooltip key={i}>
                              <TooltipTrigger asChild>
                                <a
                                  href={`https://www.google.com/search?q=${encodeURIComponent(title + ' game')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block text-xs text-muted-foreground/70 font-sans hover:text-foreground transition-colors"
                                >
                                  {title}
                                </a>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs font-sans text-xs">
                                <p>{description}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <a
                              key={i}
                              href={`https://www.google.com/search?q=${encodeURIComponent(title + ' game')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-xs text-muted-foreground/70 font-sans hover:text-foreground transition-colors"
                            >
                              {title}
                            </a>
                          )
                        })
                      ) : (
                        <div className="text-xs text-muted-foreground/40 font-sans italic">
                          None
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </TooltipProvider>
          </section>

          {/* WORLD RULES SECTION */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-purple-400/80" />
                <h3 className="font-syne font-bold text-lg">World Logic</h3>
              </div>
              <div className="flex gap-2">
                {isEditing && (
                  <button
                    onClick={handleAddWorldRule}
                    className="p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105"
                    title="Add World Rule"
                  >
                    <Plus size={14} />
                  </button>
                )}
                {!isReadOnly && onSendMessage && (
                  <button
                    onClick={() =>
                      onSendMessage(
                        'Generate the fundamental laws and rules that govern this world - magic systems, physics, social contracts, etc. Mention examples of excellent world rules like in Death Note, Case of Golden Idol (game), Game of Thrones, Pluribus.'
                      )
                    }
                    className="p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105"
                    title="Generate World Rules"
                  >
                    <RefreshCw size={14} />
                  </button>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-4">
                {(localPlan.worldRules || []).length === 0 ? (
                  <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
                    No world rules defined. Click + to add one.
                  </div>
                ) : (
                  (localPlan.worldRules || []).map((rule, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-muted/10 border border-border rounded-lg space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <select
                          className="p-2 bg-background border border-border rounded text-sm"
                          value={rule.category}
                          onChange={e =>
                            handleWorldRuleChange(
                              idx,
                              'category',
                              e.target.value as WorldRule['category']
                            )
                          }
                        >
                          {[
                            'Physics',
                            'Magic',
                            'Technology',
                            'Society',
                            'Politics',
                            'Economics',
                          ].map(cat => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleRemoveWorldRule(idx)}
                          className="p-1.5 text-red-400 hover:bg-red-400/20 rounded"
                          title="Remove Rule"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <input
                        type="text"
                        className="w-full p-2 bg-background border border-border rounded text-sm"
                        placeholder="The rule..."
                        value={rule.rule || ''}
                        onChange={e => handleWorldRuleChange(idx, 'rule', e.target.value)}
                      />
                      <input
                        type="text"
                        className="w-full p-2 bg-background border border-border rounded text-sm"
                        placeholder="Consequence if broken..."
                        value={rule.consequence || ''}
                        onChange={e => handleWorldRuleChange(idx, 'consequence', e.target.value)}
                      />
                      <input
                        type="text"
                        className="w-full p-2 bg-background border border-border rounded text-sm"
                        placeholder="Exceptions (optional)..."
                        value={rule.exceptions || ''}
                        onChange={e =>
                          handleWorldRuleChange(idx, 'exceptions', e.target.value || null)
                        }
                      />
                    </div>
                  ))
                )}
              </div>
            ) : rules.length === 0 ? (
              <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
                No world rules defined yet. The laws of nature (or magic) are unspoken.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rules.map((rule, idx) => {
                  if (!rule) return null
                  return <WorldRuleCard key={idx} rule={rule as WorldRule} />
                })}
              </div>
            )}
          </section>

          {/* FACTIONS SECTION */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400/80" />
                <h3 className="font-syne font-bold text-lg">Factions</h3>
              </div>
              <div className="flex gap-2">
                {isEditing && (
                  <button
                    onClick={handleAddFaction}
                    className="p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105"
                    title="Add Faction"
                  >
                    <Plus size={14} />
                  </button>
                )}
                {!isReadOnly && onSendMessage && (
                  <button
                    onClick={() =>
                      onSendMessage(
                        'Generate the major factions, power structures, and political forces in this world.'
                      )
                    }
                    className="p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105"
                    title="Generate Factions"
                  >
                    <RefreshCw size={14} />
                  </button>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-4">
                {(localPlan.factions || []).length === 0 ? (
                  <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
                    No factions defined. Click + to add one.
                  </div>
                ) : (
                  (localPlan.factions || []).map((faction, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-muted/10 border border-border rounded-lg space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          className="flex-1 p-2 bg-background border border-border rounded text-sm font-bold"
                          placeholder="Faction Name..."
                          value={faction.name || ''}
                          onChange={e => handleFactionChange(idx, 'name', e.target.value)}
                        />
                        <button
                          onClick={() => handleRemoveFaction(idx)}
                          className="ml-2 p-1.5 text-red-400 hover:bg-red-400/20 rounded"
                          title="Remove Faction"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <textarea
                        className="w-full p-2 bg-background border border-border rounded text-sm resize-none h-16"
                        placeholder="Ideology / Core belief..."
                        value={faction.ideology || ''}
                        onChange={e => handleFactionChange(idx, 'ideology', e.target.value)}
                      />
                      <input
                        type="text"
                        className="w-full p-2 bg-background border border-border rounded text-sm"
                        placeholder="Goals (comma separated)..."
                        value={(faction.goals || []).join(', ')}
                        onChange={e =>
                          handleFactionChange(
                            idx,
                            'goals',
                            e.target.value
                              .split(',')
                              .map(s => s.trim())
                              .filter(Boolean)
                          )
                        }
                      />
                      <input
                        type="text"
                        className="w-full p-2 bg-background border border-border rounded text-sm"
                        placeholder="Resources / Power..."
                        value={faction.resources || ''}
                        onChange={e => handleFactionChange(idx, 'resources', e.target.value)}
                      />
                      <input
                        type="text"
                        className="w-full p-2 bg-background border border-border rounded text-sm"
                        placeholder="Weaknesses (optional)..."
                        value={faction.weaknesses || ''}
                        onChange={e =>
                          handleFactionChange(idx, 'weaknesses', e.target.value || null)
                        }
                      />
                      <input
                        type="text"
                        className="w-full p-2 bg-background border border-border rounded text-sm"
                        placeholder="Rivals (comma separated, optional)..."
                        value={(faction.rivals || []).join(', ')}
                        onChange={e =>
                          handleFactionChange(
                            idx,
                            'rivals',
                            e.target.value
                              ? e.target.value
                                .split(',')
                                .map(s => s.trim())
                                .filter(Boolean)
                              : null
                          )
                        }
                      />
                    </div>
                  ))
                )}
              </div>
            ) : factions.length === 0 ? (
              <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
                No factions defined. Power is a vacuum.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {factions.map((faction, idx) => {
                  if (!faction) return null
                  return <FactionCard key={idx} faction={faction as Faction} />
                })}
              </div>
            )}
          </section>

          {/* PLOT TWISTS SECTION */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shuffle className="w-5 h-5 text-red-400/80" />
                <h3 className="font-syne font-bold text-lg">Twists</h3>
              </div>
              <div className="flex gap-2">
                {isEditing && (
                  <button
                    onClick={handleAddPlotTwist}
                    className="p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105"
                    title="Add Plot Twist"
                  >
                    <Plus size={14} />
                  </button>
                )}
                {!isReadOnly && onSendMessage && (
                  <button
                    onClick={() => onSendMessage('Generate 3 major plot twists for this story.')}
                    className="p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105"
                    title="Generate Twists"
                  >
                    <RefreshCw size={14} />
                  </button>
                )}
              </div>
            </div>
            {isEditing ? (
              <div className="space-y-2">
                {(localPlan.plotTwists || []).length === 0 ? (
                  <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
                    No plot twists defined. Click + to add one.
                  </div>
                ) : (
                  (localPlan.plotTwists || []).map((twist, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">{i + 1}.</span>
                      <input
                        type="text"
                        className="flex-1 p-2 bg-background border border-border rounded text-sm"
                        placeholder="Describe the plot twist..."
                        value={twist}
                        onChange={e => handlePlotTwistChange(i, e.target.value)}
                      />
                      <button
                        onClick={() => handleRemovePlotTwist(i)}
                        className="p-1.5 text-red-400 hover:bg-red-400/20 rounded"
                        title="Remove Twist"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            ) : storyPlan.plotTwists && storyPlan.plotTwists.length > 0 ? (
              <ul className="list-disc pl-5 space-y-2">
                {storyPlan.plotTwists.map((twist, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    {twist}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
                No plot twists revealed yet.
              </div>
            )}
          </section>

          {/* EPISODE ROADMAP SECTION */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Route className="w-5 h-5 text-green-400/80" />
                <h3 className="font-syne font-bold text-lg">Roadmap</h3>
              </div>
              <div className="flex gap-2">
                {isEditing && (
                  <button
                    onClick={handleAddSequence}
                    className="p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105"
                    title="Add Episode"
                  >
                    <Plus size={14} />
                  </button>
                )}
                {!isReadOnly &&
                  onSendMessage &&
                  !storyPlan.executiveSummary &&
                  storyPlan.sequences?.length > 0 && (
                    <button
                      onClick={() =>
                        onSendMessage(
                          'Generate an executive summary for the episode roadmap - a 2-3 sentence pitch summarizing the entire season arc, the core conflict, the stakes, and what makes this story unique.'
                        )
                      }
                      className="p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105"
                      title="Generate Executive Summary"
                    >
                      <Sparkles size={14} />
                    </button>
                  )}
                {!isReadOnly && onSendMessage && (
                  <button
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent('trigger-agent-action', {
                          detail: { type: 'generate_roadmap' },
                        })
                      )
                    }
                    className="p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105"
                    title="Generate Roadmap"
                  >
                    <RefreshCw size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Executive Summary */}
            {isEditing ? (
              <div className="mb-4">
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Executive Summary (Season Pitch)
                </label>
                <textarea
                  className="w-full h-20 p-3 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                  value={localPlan.executiveSummary || ''}
                  onChange={e => handleChange('executiveSummary', e.target.value)}
                  placeholder="A 2-3 sentence pitch summarizing the entire season arc..."
                />
              </div>
            ) : storyPlan.executiveSummary ? (
              <div className="mb-4 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg">
                <p className="text-sm text-foreground/90 leading-relaxed italic">
                  "{storyPlan.executiveSummary}"
                </p>
              </div>
            ) : null}

            {/* Episode Cards */}
            {isEditing ? (
              <div className="space-y-4">
                {(localPlan.sequences || []).length === 0 ? (
                  <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
                    No episodes defined. Click + to add one.
                  </div>
                ) : (
                  (localPlan.sequences || []).map((seq, i) => (
                    <div
                      key={i}
                      className="p-4 bg-muted/10 border border-border rounded-lg space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-primary/70">Episode {i + 1}</span>
                        <button
                          onClick={() => handleRemoveSequence(i)}
                          className="p-1.5 text-red-400 hover:bg-red-400/20 rounded"
                          title="Remove Episode"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <input
                        type="text"
                        className="w-full p-2 bg-background border border-border rounded text-sm font-bold"
                        placeholder="Episode Name..."
                        value={seq.name || ''}
                        onChange={e => handleSequenceChange(i, 'name', e.target.value)}
                      />
                      <textarea
                        className="w-full p-2 bg-background border border-border rounded text-sm resize-none h-20"
                        placeholder="Episode description..."
                        value={seq.description || ''}
                        onChange={e => handleSequenceChange(i, 'description', e.target.value)}
                      />
                      <input
                        type="text"
                        className="w-full p-2 bg-background border border-border rounded text-sm"
                        placeholder="Key factions involved (comma separated)..."
                        value={(seq.keyFactionsInvolved || []).join(', ')}
                        onChange={e =>
                          handleSequenceChange(
                            i,
                            'keyFactionsInvolved',
                            e.target.value
                              .split(',')
                              .map(s => s.trim())
                              .filter(Boolean)
                          )
                        }
                      />
                      <input
                        type="text"
                        className="w-full p-2 bg-background border border-border rounded text-sm"
                        placeholder="World consequence (how the world changes after)..."
                        value={seq.worldConsequence || ''}
                        onChange={e => handleSequenceChange(i, 'worldConsequence', e.target.value)}
                      />
                    </div>
                  ))
                )}
              </div>
            ) : (
              <>
                {storyPlan.seasonStructure && (
                  <SeasonOverviewCard seasonStructure={storyPlan.seasonStructure} />
                )}
                {storyPlan.sequences && storyPlan.sequences.length > 0 ? (
                  <div className="relative">
                    {/* Timeline line removed for cleaner look */}

                    {/* Episode Cards */}
                    <div className="space-y-0">
                      {storyPlan.sequences.map((seq, i) => (
                        <EpisodeRoadmapCard
                          key={seq.id || i}
                          episode={seq}
                          index={i}
                          isLast={i === storyPlan.sequences!.length - 1}
                          factions={(factions || []).filter(f => f.id && f.name) as Faction[]}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  // Only show "No roadmap" if there is also no season structure?
                  // Or just show it if no episodes.
                  !storyPlan.seasonStructure && (
                    <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
                      No episode roadmap defined.
                    </div>
                  )
                )}
              </>
            )}
          </section>

          {/* CHARACTERS SECTION */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400/80" />
                <h3 className="font-syne font-bold text-lg">Characters</h3>
              </div>
              <div className="flex gap-2">
                {isEditing && (
                  <button
                    onClick={handleAddKeyCharacter}
                    className="p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105"
                    title="Add Character"
                  >
                    <Plus size={14} />
                  </button>
                )}
                {!isReadOnly && onSendMessage && (
                  <button
                    onClick={() =>
                      onSendMessage(
                        'Generate key characters for this story - protagonists, antagonists, and supporting cast with their motivations and roles.'
                      )
                    }
                    className="p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105"
                    title="Generate Key Players"
                  >
                    <RefreshCw size={14} />
                  </button>
                )}
              </div>
            </div>
            {isEditing ? (
              <div className="space-y-4">
                {(localPlan.keyCharacters || []).length === 0 ? (
                  <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
                    No key characters defined. Click + to add one.
                  </div>
                ) : (
                  (localPlan.keyCharacters || []).map((char, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-muted/10 border border-border rounded-lg space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          className="flex-1 p-2 bg-background border border-border rounded text-sm font-bold"
                          placeholder="Character Name..."
                          value={char.name || ''}
                          onChange={e => handleKeyCharacterChange(idx, 'name', e.target.value)}
                        />
                        <button
                          onClick={() => handleRemoveKeyCharacter(idx)}
                          className="p-1.5 text-red-400 hover:bg-red-400/20 rounded"
                          title="Remove Character"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          className="w-full p-2 bg-background border border-border rounded text-sm"
                          placeholder="Role (e.g. Protagonist, Antagonist)..."
                          value={char.role || ''}
                          onChange={e => handleKeyCharacterChange(idx, 'role', e.target.value)}
                        />
                        <input
                          type="text"
                          className="w-full p-2 bg-background border border-border rounded text-sm"
                          placeholder="Archetype (e.g. Hero, Trickster)..."
                          value={char.archetype || ''}
                          onChange={e => handleKeyCharacterChange(idx, 'archetype', e.target.value)}
                        />
                      </div>
                      <textarea
                        className="w-full p-2 bg-background border border-border rounded text-sm resize-none h-16"
                        placeholder="Motivation - what drives this character..."
                        value={char.motivation || ''}
                        onChange={e => handleKeyCharacterChange(idx, 'motivation', e.target.value)}
                      />
                      <select
                        className="w-full p-2 bg-background border border-border rounded text-sm"
                        value={char.factionId || ''}
                        onChange={e =>
                          handleKeyCharacterChange(idx, 'factionId', e.target.value || null)
                        }
                      >
                        <option value="">No faction alignment</option>
                        {(localPlan.factions || factions).map((f: Faction) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayCharacters.length === 0 ? (
                  <div className="col-span-full p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
                    No key characters defined yet.
                  </div>
                ) : (
                  displayCharacters.map((char, idx) => (
                    <div key={idx} className="p-4 rounded-lg bg-muted/20 border border-border">
                      <div className="font-bold mb-1 flex items-center justify-between">
                        {char.name}
                        <div className="flex items-center gap-2">
                          {onConvertToCast && (
                            <button
                              onClick={() => handleOpenConvertDialog(char as KeyCharacter)}
                              className="p-1.5 rounded bg-primary/10 hover:bg-primary/30 transition-colors border border-primary/20"
                              title="Convert to Cast"
                            >
                              <UserPlus className="w-4 h-4 text-primary" />
                            </button>
                          )}
                          <span className="text-[10px] uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            {char.role}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground italic mb-2">
                        "{char.archetype}"
                      </div>
                      <div className="text-xs">
                        <span className="font-semibold text-muted-foreground">Motivation: </span>
                        {char.motivation}
                      </div>
                      {char.factionId && (
                        <div className="mt-2 pt-2 border-t border-border/50 text-[10px] text-orange-400 flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          Aligned with{' '}
                          {factions.find((f: Faction) => f.id === char.factionId)?.name ||
                            'Unknown Faction'}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Convert to Cast Dialog */}
      <CharacterCreationDialog
        isOpen={convertDialogOpen}
        onClose={handleCloseConvertDialog}
        onCreate={handleCreateFromConvert}
        projectId={projectId}
        initialData={convertInitialData}
      />
    </div>
  )
}
