import { useState, useEffect, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import { useStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import { WorldBiblePanelBody } from './WorldBiblePanelBody'
import { WorldBiblePanelHeader } from './WorldBiblePanelHeader'
import { WorldBiblePanelLoading } from './WorldBiblePanelLoading'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import { browserStorage } from '@/shared/data/browser-storage'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import {
  MoodboardDefaultModelId,
  MoodboardModelStorageKey,
  MoodboardProvider,
  MoodboardStorageKey,
  StorytellerBibleTab,
  StorytellerLogMessage,
  WorldBiblePanelProviderModel,
  moodboardGenOperationPrefix,
  moodboardPrimaryStorageKey,
} from './constants/world-bible-panel'
import { MoodboardUserToast } from '@/domains/storyteller/services/constants/moodboard-generation-service'

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
  const midjourneyKey = browserStorage.getAiApiKey(LocalStorageKeys.AI_CONFIG_APIFRAME)

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
    isReadOnly: effectiveReadOnly,
  } = useBible()
  const setBibleEditing = useStorytellerUiStore(state => state.setBibleEditing)

  useEffect(() => {
    setBibleEditing(isEditing)
    return () => setBibleEditing(false)
  }, [isEditing, setBibleEditing])

  const [primaryImageIndex, setPrimaryImageIndex] = useState<number | null>(null)
  const [focusEntityId, setFocusEntityId] = useState<string | null>(null)
  const entityNavigation = useStorytellerUiStore(state => state.entityNavigation)
  const clearEntityNavigation = useStorytellerUiStore(state => state.clearEntityNavigation)
  const activeTab = useStorytellerUiStore(state => state.bibleTab)
  const setBibleTab = useStorytellerUiStore(state => state.setBibleTab)
  const moodboardCompleteVersion = useStorytellerUiStore(state => state.moodboardCompleteVersion)
  const notifyMoodboardPrimaryChanged = useStorytellerUiStore(
    state => state.notifyMoodboardPrimaryChanged
  )

  useEffect(() => {
    if (!entityNavigation?.refId) return
    setFocusEntityId(entityNavigation.refId)
    setBibleTab(StorytellerBibleTab.Relationships)
    clearEntityNavigation()
  }, [entityNavigation, setBibleTab, clearEntityNavigation])

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
      moodboardGenerationService.resumePendingGenerations(projectId, refetchMoodboardData, error => {
        if (error instanceof Error && error.message.trim().length > 0) {
          toast.error(error.message)
          return
        }
        toast.error(MoodboardUserToast.GenerationFailed)
      })
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
        onSwitchTab={setBibleTab}
        effectiveReadOnly={effectiveReadOnly}
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
