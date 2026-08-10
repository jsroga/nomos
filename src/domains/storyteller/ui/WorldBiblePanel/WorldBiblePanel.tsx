import { useState, useEffect, useCallback, useMemo } from 'react'
import { useStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import { WorldBiblePanelBody } from './WorldBiblePanelBody'
import { WorldBiblePanelHeader } from './WorldBiblePanelHeader'
import { WorldBiblePanelLoading } from './WorldBiblePanelLoading'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import { browserStorage } from '@/shared/data/browser-storage'
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
  moodboardGenOperationPrefix,
  moodboardPrimaryStorageKey,
} from './constants/world-bible-panel'

import { StoryPlan } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import { fetchStorytellerProjectOptional } from '@/domains/storyteller/core/io/storyteller.api'
import { parseSeriesBibleRecord } from '@/domains/storyteller/core/io/project-jsonb'
import { stringArrayFromJson } from '@/shared/data/json-guards'
// CharacterCreationDialog removed - Cast is managed via CharacterPanel sidebar

import { BibleProvider, useBible } from '../WorldBible/components/BibleContext'

// Helper to get provider config from localStorage
const getProviderConfig = () => {
  const provider =
    browserStorage.getString(MoodboardStorageKey.Provider) || MoodboardProvider.Midjourney

  const geminiKey = browserStorage.getAiApiKey(LocalStorageKeys.AI_CONFIG_GEMINI)
  const midjourneyKey =
    browserStorage.getAiApiKey(LocalStorageKeys.AI_CONFIG_APIFRAME) ||
    browserStorage.getAiApiKey(LocalStorageKeys.AI_CONFIG_LEGNEXT)

  if (provider === MoodboardProvider.NanoBanana) {
    return {
      provider: MoodboardProvider.NanoBanana,
      apiKey: geminiKey,
      modelId: browserStorage.getString(MoodboardModelStorageKey) || MoodboardDefaultModelId,
    }
  }

  // Default to midjourney
  return {
    provider: MoodboardProvider.Midjourney,
    apiKey: midjourneyKey,
    modelId: WorldBiblePanelProviderModel.Midjourney,
  }
}

import { PendingAction } from '../WorldBible'

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

  const storyPlan = useMemo(
    () => ({ ...EMPTY_STORY_PLAN, ...props.storyPlan }),
    [props.storyPlan]
  )

  return (
    <BibleProvider
      {...props}
      storyPlan={storyPlan}
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
        const bible = parseSeriesBibleRecord(data.seriesBible ?? data.series_bible)
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
    return <WorldBiblePanelLoading />
  }

  // Save primary image selection
  const handleSetPrimaryImage = (index: number) => {
    const newIndex = primaryImageIndex === index ? null : index
    setPrimaryImageIndex(newIndex)
    if (typeof window !== 'undefined' && projectId) {
      if (newIndex !== null)
        browserStorage.setString(moodboardPrimaryStorageKey(projectId), newIndex.toString())
      else browserStorage.remove(moodboardPrimaryStorageKey(projectId))
      notifyMoodboardPrimaryChanged()
    }
  }

  return (
    <div className="h-full min-h-0 relative flex flex-col">
      <WorldBiblePanelHeader
        activeTab={activeTab}
        onSwitchTab={switchTab}
        isUserCentralUser={isUserCentralUser}
        isBibleLocked={isBibleLocked}
        lockedBy={lockedBy}
        lockedAt={lockedAt}
        isLockLoading={isLockLoading}
        onToggleLock={toggleLock}
        effectiveReadOnly={effectiveReadOnly}
        canUserEditBible={canUserEditBible}
        isEditing={isEditing}
        onStartEditing={() => setIsEditing(true)}
        onCancelEdit={cancelEdit}
        onSavePlan={savePlan}
        hasOnUpdate={Boolean(onUpdate)}
      />

      <WorldBiblePanelBody
        activeTab={activeTab}
        projectId={projectId}
        primaryImageIndex={primaryImageIndex}
        onSetPrimaryImage={handleSetPrimaryImage}
        onRefetchMoodboardData={refetchMoodboardData}
        focusEntityId={focusEntityId}
        onClearFocusEntity={() => setFocusEntityId(null)}
      />
    </div>
  )
}

export default WorldBiblePanel
