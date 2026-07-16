'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter, useParams, usePathname } from 'next/navigation'
import {
  type QuestionSession,
  useBibleState,
  useEpisodeData,
  useLoadingStates,
  useStorytellerActions,
  useStorytellerHydration,
} from '@/domains/storyteller'
import type { StoryPlan } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import { Phase, type PhaseId } from '@/domains/storyteller/core/types/enums'
import {
  StorytellerTab,
  StorytellerBibleTab,
  StorytellerOverrideState,
  StorytellerUnknownLabel,
  StorytellerQueryParam,
} from '@/domains/storyteller/core/storyteller-page-wire'
import type { BeatCard as Beat } from '@/domains/storyteller/core/types/story-types'
import type { StorytellerCharacter } from '@/domains/storyteller/core/entities/character-wire'
import { readString, stringRecordFromJson } from '@/shared/data/json-guards'
import type { ProjectLike } from '@/domains/storyteller/state/queries/useStorytellerActions'
import { useWorldStore } from '@/domains/storyteller/state/storyteller-world-seam'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { useStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'

export function useStorytellerPageBase() {
  const searchParams = useSearchParams()
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const routeProjectId = readString(params?.projectId)

  const currentProject = useWorldStore(state => state.currentProject)
  const setCurrentProjectInStore = useWorldStore(state => state.setCurrentProject)
  const setCurrentProjectForActions = useCallback(
    (project: ProjectLike) => {
      const current = useWorldStore.getState().currentProject
      if (!current) return
      setCurrentProjectInStore({
        ...current,
        ...project,
        series_bible: stringRecordFromJson(project.series_bible ?? current.series_bible),
        story_plan: stringRecordFromJson(project.story_plan ?? current.story_plan),
        master_prompt:
          typeof project.master_prompt === 'string'
            ? project.master_prompt
            : current.master_prompt,
        name: typeof project.name === 'string' ? project.name : current.name,
      })
    },
    [setCurrentProjectInStore]
  )

  const syncFactionsToWorldProject = useCallback((factions: unknown[]) => {
    const latest = useWorldStore.getState().currentProject
    if (!latest) return
    setCurrentProjectInStore({
      ...latest,
      series_bible: { ...latest.series_bible, factions },
    })
  }, [setCurrentProjectInStore])

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

  const [selectedBeatId, setSelectedBeatId] = useState<string | null>(null)
  const [characters, setCharacters] = useState<StorytellerCharacter[]>([])
  const [beats, setBeats] = useState<Beat[]>([])
  const [script, setScript] = useState<string>('')
  const [isScriptLoading, setIsScriptLoading] = useState(false)
  const [currentPhase, setCurrentPhase] = useState<PhaseId>(Phase.PREMISE)
  const [activeTab, setActiveTab] = useState<string>(StorytellerTab.Plan)
  const [focusEntityId, setFocusEntityId] = useState<string | null>(null)
  const [storyPlan, setStoryPlan] = useState<StoryPlan | null>(null)
  const [isPlanApproved, setIsPlanApproved] = useState(false)
  const episodeParam = searchParams?.get(StorytellerQueryParam.EpisodeId) ?? null
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

  useStorytellerHydration({
    currentProject,
    setStoryPlan,
    setStoryDecisions,
  })

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
    setCurrentProject: setCurrentProjectForActions,
  })

  const refreshBeats = useCallback(async (episodeId: string) => {
    const mapped = await refreshBeatsRaw(episodeId)
    if (mapped) setBeats(mapped)
  }, [refreshBeatsRaw])

  const entityNavigation = useStorytellerUiStore(state => state.entityNavigation)
  const clearEntityNavigation = useStorytellerUiStore(state => state.clearEntityNavigation)
  const requestBibleTab = useStorytellerUiStore(state => state.requestBibleTab)

  useEffect(() => {
    if (!entityNavigation?.refId) return
    if (isWorldBibleOpen) {
      requestBibleTab(StorytellerBibleTab.Relationships)
      return
    }
    setFocusEntityId(entityNavigation.refId)
    if (currentEpisodeId) {
      setActiveTab(StorytellerTab.Relationships)
    }
    clearEntityNavigation()
  }, [
    entityNavigation,
    isWorldBibleOpen,
    currentEpisodeId,
    clearEntityNavigation,
    requestBibleTab,
  ])

  useEffect(() => {
    const phaseToTab: Record<PhaseId, string> = {
      [Phase.PREMISE]: StorytellerTab.Plan,
      [Phase.BREAKING]: StorytellerTab.Board,
      [Phase.WRITING]: StorytellerTab.Script,
      [Phase.COMPLETE]: StorytellerTab.Script,
    }
    const newTab = phaseToTab[currentPhase] ?? StorytellerTab.Plan
    if (activeTab !== newTab) {
      setActiveTab(newTab)
    }
  }, [currentPhase, activeTab])

  const loadingStates = useLoadingStates()

  const hasBible = useMemo(() => {
    if (overrideState === StorytellerOverrideState.NoBible) return false
    if (
      overrideState === StorytellerOverrideState.NoEpisodes ||
      overrideState === StorytellerOverrideState.HasEpisodes
    )
      return true
    return !!(
      storyPlan?.worldDescription ||
      (storyPlan?.genre &&
        storyPlan.genre !== StorytellerUnknownLabel.Unknown &&
        storyPlan.genre !== '') ||
      (storyPlan?.tone &&
        storyPlan.tone !== StorytellerUnknownLabel.Unknown &&
        storyPlan.tone !== '') ||
      (storyPlan?.themes && storyPlan.themes.length > 0)
    )
  }, [storyPlan, overrideState])

  const useEnhancedStreaming = true

  const addOperation = useGlobalStatusStore(state => state.addOperation)
  const removeOperation = useGlobalStatusStore(state => state.removeOperation)

  return {
    searchParams,
    params,
    router,
    pathname,
    routeProjectId,
    currentProject,
    setCurrentProject: setCurrentProjectInStore,
    isWorldBibleOpen,
    isBibleLocked,
    bibleLockedBy,
    userEmail,
    setOptimisticBibleOpen,
    toggleBible,
    closeBible,
    currentEpisodeId,
    setCurrentEpisodeId,
    currentEpisodeTitle,
    setCurrentEpisodeTitle,
    currentEpisode,
    hasEpisodes,
    firstEpisodeId,
    overrideState,
    selectEpisode,
    selectedBeatId,
    setSelectedBeatId,
    characters,
    setCharacters,
    beats,
    setBeats,
    script,
    setScript,
    isScriptLoading,
    setIsScriptLoading,
    currentPhase,
    setCurrentPhase,
    activeTab,
    setActiveTab,
    focusEntityId,
    setFocusEntityId,
    storyPlan,
    setStoryPlan,
    isPlanApproved,
    setIsPlanApproved,
    isFetchingPlan,
    setIsFetchingPlan,
    isGeneratingPoster,
    setIsGeneratingPoster,
    isGeneratingStoryboard,
    setIsGeneratingStoryboard,
    primaryMoodboardUrl,
    setPrimaryMoodboardUrl,
    isActivityPanelOpen,
    setIsActivityPanelOpen,
    storyDecisions,
    setStoryDecisions,
    input,
    setInput,
    pendingQuestions,
    setPendingQuestions,
    answeredQuestions,
    setAnsweredQuestions,
    generatingSection,
    setGeneratingSection,
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
    executeAction,
    getActionSection,
    handleDismissToast,
    refreshBeats,
    syncFactionsToWorldProject,
    loadingStates,
    hasBible,
    useEnhancedStreaming,
    addOperation,
    removeOperation,
  }
}

export type StorytellerWorkspaceCore = ReturnType<typeof useStorytellerPageBase>
