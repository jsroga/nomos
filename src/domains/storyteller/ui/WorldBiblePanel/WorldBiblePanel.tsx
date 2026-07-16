import { Save, Edit2, X, Lock, Unlock, Shield, Loader2, Network, BookOpen } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/Tooltip'
import { Button } from '@/components/Button'
import { cn } from '@/shared/data/utils'
import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { useStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'

// Lazy load CharacterWeb since it's a heavy component
const CharacterWeb = lazy(() => import('../CharacterWeb').then(m => ({ default: m.CharacterWeb })))
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { isCentralUser, canEditBible } from '@/shared/auth/bible-permissions'
import {
  MoodboardDefaultModelId,
  MoodboardModelStorageKey,
  MoodboardProvider,
  MoodboardStorageKey,
  StorytellerBibleTab,
  StorytellerBibleUrlParam,
  StorytellerLogMessage,
  WorldBiblePanelProviderModel,
  WorldBiblePanelUiCopy,
  moodboardGenOperationPrefix,
  moodboardPrimaryStorageKey,
} from './constants/world-bible-panel'

import { StoryPlan } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import { fetchStorytellerProjectOptional } from '@/domains/storyteller/core/io/storyteller.api'
import { recordFromJson, stringArrayFromJson } from '@/shared/data/json-guards'
// CharacterCreationDialog removed - Cast is managed via CharacterPanel sidebar

import { BibleOverview } from '../WorldBible/BibleOverview'
import { BibleSoundtracks } from '../WorldBible/BibleSoundtracks'
import { BibleInspirations } from '../WorldBible/BibleInspirations'
import { BibleWorldLogic } from '../WorldBible/BibleWorldLogic'
import { BibleItems } from '../WorldBible/BibleItems'
import { BibleEvents } from '../WorldBible/BibleEvents'
import { BibleFactions } from '../WorldBible/BibleFactions'
// BibleCharacters (Key Players) removed - Cast is managed via CharacterPanel sidebar
import { BibleRoadmap } from '../WorldBible/BibleRoadmap'
import { BibleProvider, useBible } from '../WorldBible/BibleContext'

// Helper to get provider config from localStorage
const getProviderConfig = () => {
  const provider =
    localStorage.getItem(MoodboardStorageKey.Provider) || MoodboardProvider.Midjourney

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

  if (provider === MoodboardProvider.Nanobanana) {
    return {
      provider: MoodboardProvider.Nanobanana,
      apiKey: geminiKey,
      modelId: localStorage.getItem(MoodboardModelStorageKey) || MoodboardDefaultModelId,
    }
  }

  // Default to midjourney
  return {
    provider: MoodboardProvider.Midjourney,
    apiKey: legnextKey,
    modelId: WorldBiblePanelProviderModel.Midjourney,
  }
}

import { PendingAction } from '../WorldBible/BibleContext'

/** BibleProvider requires a full StoryPlan; fill required keys when given a partial. */
const EMPTY_STORY_PLAN: StoryPlan = {
  title: '',
  genre: '',
  tone: '',
  centralQuestion: '',
  worldRules: [],
  factions: [],
  keyCharacters: [],
  executiveSummary: null,
  moodImages: [],
  themes: [],
}

export interface WorldBiblePanelProps {
  storyPlan: StoryPlan | Partial<StoryPlan>
  onUpdate?: (updates: Partial<StoryPlan>) => void | Promise<void>
  isReadOnly?: boolean
  onSendMessage?: (msg: string, section?: string) => void
  projectId?: string
  onClose?: () => void
  isLoading?: boolean
  /** Section-specific loading states for granular shimmer */
  loadingSections?: Record<string, { loading: boolean; message?: string }>
  /** Pending actions per section (for blur overlay with accept/reject) */
  pendingActions?: Record<string, PendingAction>
  onSetPendingAction?: (section: string, action: PendingAction | null) => void
}

const WorldBiblePanel: React.FC<WorldBiblePanelProps> = props => {
  const projectId =
    props.projectId ||
    (typeof window !== 'undefined'
      ? window.location.pathname.split('/')[1]
      : '')

  return (
    <BibleProvider
      {...props}
      storyPlan={{ ...EMPTY_STORY_PLAN, ...props.storyPlan }}
      projectId={projectId}
      getProviderConfig={getProviderConfig}
      loadingSections={props.loadingSections}
      pendingActions={props.pendingActions}
      onSetPendingAction={props.onSetPendingAction}
    >
      <WorldBiblePanelContent {...props} projectId={projectId} />
    </BibleProvider>
  )
}

const WorldBiblePanelContent: React.FC<WorldBiblePanelProps> = ({
  onUpdate,
  projectId,
  isLoading,
}) => {
  // All hooks must come before any conditional returns
  const {
    isEditing,
    setIsEditing,
    savePlan,
    cancelEdit,
    toggleLock,
    isLocked: isBibleLocked,
    lockedBy,
    lockedAt,
    userEmail,
    isLockLoading,
    isReadOnly: effectiveReadOnly,
  } = useBible()

  const [primaryImageIndex, setPrimaryImageIndex] = useState<number | null>(null)
  const [focusEntityId, setFocusEntityId] = useState<string | null>(null)
  const entityNavigation = useStorytellerUiStore(state => state.entityNavigation)
  const clearEntityNavigation = useStorytellerUiStore(state => state.clearEntityNavigation)
  const bibleTabRequest = useStorytellerUiStore(state => state.bibleTabRequest)
  const clearBibleTabRequest = useStorytellerUiStore(state => state.clearBibleTabRequest)
  const moodboardCompleteVersion = useStorytellerUiStore(state => state.moodboardCompleteVersion)
  const notifyMoodboardPrimaryChanged = useStorytellerUiStore(
    state => state.notifyMoodboardPrimaryChanged
  )

  // Read initial tab from URL
  const [activeTab, setActiveTab] = useState<StorytellerBibleTab>(() => {
    if (typeof window === 'undefined') return StorytellerBibleTab.Content
    const params = new URLSearchParams(window.location.search)
    return params.get(StorytellerBibleUrlParam.BibleTab) === StorytellerBibleTab.Relationships
      ? StorytellerBibleTab.Relationships
      : StorytellerBibleTab.Content
  })

  // Persist tab in URL
  const switchTab = useCallback((tab: StorytellerBibleTab) => {
    setActiveTab(tab)
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (tab === StorytellerBibleTab.Relationships) {
      url.searchParams.set(StorytellerBibleUrlParam.BibleTab, StorytellerBibleTab.Relationships)
    } else {
      url.searchParams.delete(StorytellerBibleUrlParam.BibleTab)
    }
    window.history.replaceState({}, '', url.toString())
  }, [])

  // React to cross-panel navigation signals
  useEffect(() => {
    if (bibleTabRequest === StorytellerBibleTab.Relationships) {
      switchTab(StorytellerBibleTab.Relationships)
      clearBibleTabRequest()
    }
  }, [bibleTabRequest, switchTab, clearBibleTabRequest])

  useEffect(() => {
    if (!entityNavigation?.refId) return
    setFocusEntityId(entityNavigation.refId)
    switchTab(StorytellerBibleTab.Relationships)
    clearEntityNavigation()
  }, [entityNavigation, switchTab, clearEntityNavigation])

  const isUserCentralUser = isCentralUser(userEmail)
  const canUserEditBible = canEditBible(userEmail, isBibleLocked)

  // Derive generating state from global operations
  const operations = useGlobalStatusStore(state => state.operations)
  const generatingIndices = new Set<number>()
  const prefix = moodboardGenOperationPrefix(projectId ?? '')

  operations.forEach(op => {
    if (op.id === prefix) {
      generatingIndices.add(0)
      generatingIndices.add(1)
      generatingIndices.add(2)
      generatingIndices.add(3)
    } else if (op.id.startsWith(prefix + '-')) {
      const idx = parseInt(op.id.replace(prefix + '-', ''))
      if (!isNaN(idx)) generatingIndices.add(idx)
    }
  })
  // Refetch project data
  const refetchMoodboardData = useCallback(async () => {
    if (!projectId) return
    try {
      const data = await fetchStorytellerProjectOptional(projectId)
      if (data) {
        const bible = recordFromJson(data.seriesBible ?? data.series_bible)
        const moodImages = stringArrayFromJson(bible.moodImages)
        if (moodImages.length > 0 && onUpdate) {
          onUpdate({ moodImages })
        }
      }
    } catch (error) {
      console.error(StorytellerLogMessage.FailedRefetchMoodboard, error)
    }
  }, [projectId, onUpdate])

  useEffect(() => {
    if (!projectId) return
    refetchMoodboardData()

    // Resume any pending generations for this project
    import('@/domains/storyteller/services/moodboard-generation-service').then(({ moodboardGenerationService }) => {
      moodboardGenerationService.resumePendingGenerations(projectId, refetchMoodboardData)
    })
  }, [projectId, refetchMoodboardData, moodboardCompleteVersion])

  // Shimmer State - check after all hooks
  if (isLoading) {
    return (
      <div className="h-full flex flex-col relative animate-pulse">
        {/* Header Shimmer */}
        <div
          className="bg-background/80 border-b border-border/40 h-[60px] flex items-center justify-between rounded-lg"
          style={{
            marginLeft: -25,
            marginRight: -25,
            paddingLeft: 25,
            paddingRight: 25,
          }}
        >
          <div className="h-7 w-32 bg-muted/40 rounded"></div>
          <div className="flex gap-2">
            <div className="h-8 w-8 bg-muted/40 rounded"></div>
            <div className="h-8 w-16 bg-muted/40 rounded"></div>
          </div>
        </div>

        {/* Content Shimmer */}
        <div className="flex-1 overflow-y-auto pr-2 pt-6 space-y-8">
          {/* Overview Section */}
          <div className="space-y-4">
            <div className="h-6 w-40 bg-muted/40 rounded"></div>
            <div className="grid grid-cols-4 gap-4 h-48">
              <div className="col-span-1 bg-muted/20 rounded-lg"></div>
              <div className="col-span-3 bg-muted/10 rounded-lg"></div>
            </div>
          </div>
          {/* Other sections */}
          <div className="space-y-4">
            <div className="h-6 w-32 bg-muted/40 rounded"></div>
            <div className="h-32 bg-muted/10 rounded-lg"></div>
          </div>
          <div className="space-y-4">
            <div className="h-6 w-32 bg-muted/40 rounded"></div>
            <div className="h-32 bg-muted/10 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  // Save primary image selection
  const handleSetPrimaryImage = (index: number) => {
    const newIndex = primaryImageIndex === index ? null : index
    setPrimaryImageIndex(newIndex)
    if (typeof window !== 'undefined' && projectId) {
      if (newIndex !== null)
        localStorage.setItem(moodboardPrimaryStorageKey(projectId), newIndex.toString())
      else localStorage.removeItem(moodboardPrimaryStorageKey(projectId))
      notifyMoodboardPrimaryChanged()
    }
  }

  return (
    <div className="h-full min-h-0 relative flex flex-col">
      <div
        className="bg-background/80 backdrop-blur-xl border-b border-border/40 h-[60px] flex items-center justify-between rounded-lg"
        style={{
          marginLeft: -25,
          marginRight: -25,
          paddingLeft: 25,
          paddingRight: 25,
        }}
      >
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold font-syne text-primary">{WorldBiblePanelUiCopy.StorybibleTitle}</h2>

          {/* Tab buttons */}
          <div className="flex gap-1 p-1 bg-muted/30 rounded-lg">
            <button
              onClick={() => switchTab(StorytellerBibleTab.Content)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                activeTab === StorytellerBibleTab.Content
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <BookOpen className="w-3.5 h-3.5" />
              {WorldBiblePanelUiCopy.ContentTab}
            </button>
            <button
              onClick={() => switchTab(StorytellerBibleTab.Relationships)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                activeTab === StorytellerBibleTab.Relationships
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Network className="w-3.5 h-3.5" />
              {WorldBiblePanelUiCopy.RelationshipsTab}
            </button>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={isUserCentralUser ? toggleLock : undefined}
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
                  {isBibleLocked ? '🔒 Storybible is locked' : '🔓 Storybible is unlocked'}
                </p>
                {isBibleLocked && lockedBy && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Locked by <span className="font-medium text-amber-400">{lockedBy}</span>
                  </p>
                )}
                {isBibleLocked && lockedAt && (
                  <p className="text-xs text-muted-foreground">
                    {lockedAt.toLocaleDateString()} at{' '}
                    {lockedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

          {!effectiveReadOnly &&
            onUpdate &&
            canUserEditBible &&
            !isEditing &&
            activeTab === StorytellerBibleTab.Content && (
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

          {!effectiveReadOnly && onUpdate && canUserEditBible && isEditing && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelEdit}
                className="gap-2 h-8 border-muted-foreground/30 text-muted-foreground hover:bg-muted/50 hover:border-muted-foreground/50 transition-colors"
              >
                <X className="w-4 h-4" />
                <span className="text-xs">Cancel</span>
              </Button>
              <Button
                onClick={savePlan}
                size="sm"
                className="gap-2 h-8 border border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500 transition-colors bg-transparent"
              >
                <Save className="w-4 h-4" />
                <span className="text-xs">Save</span>
              </Button>
            </>
          )}

          {isBibleLocked && !canUserEditBible && !isUserCentralUser && (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 px-3 py-1 bg-muted/20 border border-amber-500/30 rounded-md cursor-help">
                    <Shield className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs text-amber-500 font-medium tracking-tight">
                      Read Only
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs font-medium tracking-tight">
                    🔒 Storybible is locked (Admin Only)
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {activeTab === StorytellerBibleTab.Content ? (
        <div className="flex-1 min-h-0 overflow-y-auto pr-2 pt-6">
          <div className="space-y-8 pb-20">
            <BibleOverview
              primaryImageIndex={primaryImageIndex}
              onSetPrimaryImage={handleSetPrimaryImage}
              onRefetchMoodboardData={refetchMoodboardData}
            />

            <BibleSoundtracks />

            <BibleInspirations />

            <BibleWorldLogic />

            <BibleItems />

            <BibleEvents />

            <BibleFactions />

            <BibleRoadmap />
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-hidden pt-4">
          <Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              </div>
            }
          >
            <CharacterWeb
              projectId={projectId || ''}
              className="h-full"
              focusEntityId={focusEntityId}
              onNodeClick={(nodeId, nodeData) => {
                console.log('Character web node clicked:', nodeId, nodeData?.name)
                setFocusEntityId(null) // Clear focus after manual click
              }}
            />
          </Suspense>
        </div>
      )}
    </div>
  )
}

export default WorldBiblePanel
