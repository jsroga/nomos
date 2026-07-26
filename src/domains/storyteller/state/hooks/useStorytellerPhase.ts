'use client'

import { useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { StorySequence } from '@/domains/storyteller/core/types/story-plan-types'
import { Phase, type PhaseId } from '@/domains/storyteller/core/types/enums'
import { readString } from '@/shared/data/json-guards'
import {
  saveStorytellerPlan,
  patchStorytellerPlan,
  createStorytellerEpisode,
} from '@/domains/storyteller/core/io/storyteller.api'
import {
  StorytellerTab,
  StorytellerMessageRole,
  StorytellerMessageType,
  StorytellerLogMessage,
  StorytellerPhaseLabel,
  StorytellerPlanApprovalMessage,
  StorytellerEpisodeSeed,
  StorytellerUserPrompt,
  StorytellerQueryParam,
  StorytellerBibleQuery,
  StorytellerConfirmVariant,
  StorytellerConfirmCopy,
  StorytellerAnswerSeparator,
} from '@/domains/storyteller/core/storyteller-page-wire'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import type { StorytellerWorkspaceCore } from './useStorytellerPageBase'
import type { useStorytellerChat } from './useStorytellerChat'

type ChatSlice = ReturnType<typeof useStorytellerChat>

export function useStorytellerPhase(core: StorytellerWorkspaceCore) {
  const {
    currentEpisodeId,
    currentPhase,
    setCurrentPhase,
    setActiveTab,
    storyPlan,
    setStoryPlan,
    setIsPlanApproved,
    setBeats,
    setScript,
    currentProject,
    setCurrentEpisodeId,
    beats,
    isSending,
    setIsSending,
  } = core

  const searchParams = useSearchParams()
  const router = useRouter()

  // Save phase to DB when it changes
  const savePhaseToDb = useCallback(
    async (phase: PhaseId) => {
      if (!currentEpisodeId) return
      try {
        await saveStorytellerPlan({
          episodeId: currentEpisodeId,
          currentPhase: phase,
        })
      } catch (error) {
        console.error(StorytellerLogMessage.FailedSavePhase, error)
      }
    },
    [currentEpisodeId]
  )

  // Sync phase based on data state (beats exist = at least breaking phase)
  useEffect(() => {
    // Only sync if we have beats but phase is still 'premise' - this is a mismatch
    if (beats.length > 0 && currentPhase === Phase.PREMISE && currentEpisodeId) {
      console.log(StorytellerLogMessage.PhaseSyncPremiseToBreaking)
      setCurrentPhase(Phase.BREAKING)
      savePhaseToDb(Phase.BREAKING)
    }
  }, [beats.length, currentPhase, currentEpisodeId, savePhaseToDb])
  // Story Plan Handlers
  const handleApprovePlan = useCallback(async () => {
    if (!storyPlan || !currentProject?.id) return

    try {
      // Save approved plan to database with approved flag AND phase change
      await saveStorytellerPlan({
        projectId: currentProject.id,
        episodeId: currentEpisodeId,
        storyPlan,
        approved: true,
        currentPhase: Phase.BREAKING,
      })

      setIsPlanApproved(true)
      setCurrentPhase(Phase.BREAKING)
      setActiveTab(StorytellerTab.Board)
    } catch (error) {
      console.error(StorytellerLogMessage.FailedSavePlan, error)
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
          await patchStorytellerPlan({
            episodeId: currentEpisodeId,
            sequenceId,
            updates,
          })
        } catch (error) {
          console.error(StorytellerLogMessage.FailedSaveSequenceUpdate, error)
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
      const newEpisode = await createStorytellerEpisode({
        projectId: currentProject.id,
        title: StorytellerEpisodeSeed.FirstTitle,
        sequence: 1,
      })

      const episodeId = readString(newEpisode.id)
      if (episodeId) {
        // 2. Select it (Update URL and state)
        const params = new URLSearchParams(searchParams?.toString() || '')
        params.set(StorytellerQueryParam.EpisodeId, episodeId)
        router.push(`?${params.toString()}`)
        setCurrentEpisodeId(episodeId)
      }
      setIsSending(false)
    } catch (error) {
      console.error(StorytellerLogMessage.FailedDraftFirstEpisode, error)
      setIsSending(false)
    }
  }, [currentProject?.id, isSending, setIsSending, searchParams, router, setCurrentEpisodeId])

  const handleGenerateBible = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set(StorytellerQueryParam.Bible, StorytellerBibleQuery.Open)
    router.push(`?${params.toString()}`)
  }, [searchParams, router])

  // Phase Navigation Handlers
  const PHASE_ORDER: PhaseId[] = [Phase.PREMISE, Phase.BREAKING, Phase.WRITING, Phase.COMPLETE]

  const phaseDisplayName: Record<PhaseId, string> = {
    [Phase.PREMISE]: StorytellerPhaseLabel.Premise,
    [Phase.BREAKING]: StorytellerPhaseLabel.StoryBeats,
    [Phase.WRITING]: StorytellerPhaseLabel.Script,
    [Phase.COMPLETE]: StorytellerPhaseLabel.Complete,
  }

  const tabForPhase = (phase: PhaseId): StorytellerTab => {
    if (phase === Phase.PREMISE) return StorytellerTab.Plan
    if (phase === Phase.WRITING) return StorytellerTab.Script
    return StorytellerTab.Board
  }

  // Confirmation dialog for going back in phases (will clear current phase data)
  const { confirm: confirmPhaseBack, ConfirmDialogComponent: PhaseBackConfirmDialog } =
    useConfirmDialog()

  const handlePreviousPhase = useCallback(async () => {
    const idx = PHASE_ORDER.indexOf(currentPhase)
    if (idx > 0) {
      // Show confirmation dialog - going back will erase current phase data
      const phaseNames = phaseDisplayName

      const confirmed = await confirmPhaseBack({
        title: StorytellerConfirmCopy.GoBackTitle,
        description: `Going back will erase all data from the current "${phaseNames[currentPhase]}" phase. This action cannot be undone.`,
        confirmLabel: StorytellerConfirmCopy.GoBackLabel,
        cancelLabel: StorytellerConfirmCopy.StayHereLabel,
        variant: StorytellerConfirmVariant.Destructive,
      })

      if (!confirmed) return

      // Clear current phase data
      if (currentPhase === Phase.WRITING) {
        setScript('')
        // TODO: Clear script from DB
      } else if (currentPhase === Phase.BREAKING) {
        setBeats([])
        // TODO: Clear beats from DB
      }
      // Note: premise phase data is kept as it's the foundation

      const prevPhase = PHASE_ORDER[idx - 1]
      setCurrentPhase(prevPhase)
      setActiveTab(tabForPhase(prevPhase))

      // Save to DB
      await savePhaseToDb(prevPhase)
    }
  }, [currentPhase, savePhaseToDb, confirmPhaseBack])

  // Direct phase navigation - allows clicking on any previous phase
  const handlePhaseChange = useCallback(
    async (targetPhase: PhaseId) => {
      const currentIdx = PHASE_ORDER.indexOf(currentPhase)
      const targetIdx = PHASE_ORDER.indexOf(targetPhase)

      // Only allow going to previous phases or staying on current
      if (targetIdx >= currentIdx) return

      const phaseNames = phaseDisplayName

      // Confirm if we're skipping phases (e.g., writing -> premise)
      const phasesToClear = PHASE_ORDER.slice(targetIdx + 1, currentIdx + 1)
      const clearingMultiple = phasesToClear.length > 1

      const confirmed = await confirmPhaseBack({
        title: `Go to ${phaseNames[targetPhase]}?`,
        description: clearingMultiple
          ? `This will clear data from: ${phasesToClear.map(p => phaseNames[p]).join(StorytellerAnswerSeparator.CommaSpace)}. This cannot be undone.`
          : `Going back will clear "${phaseNames[currentPhase]}" phase data. This cannot be undone.`,
        confirmLabel: `Go to ${phaseNames[targetPhase]}`,
        cancelLabel: StorytellerConfirmCopy.CancelLabel,
        variant: StorytellerConfirmVariant.Destructive,
      })

      if (!confirmed) return

      // Clear phases between target and current
      for (const phase of phasesToClear) {
        if (phase === Phase.WRITING) {
          setScript('')
        } else if (phase === Phase.BREAKING) {
          setBeats([])
        }
      }

      setCurrentPhase(targetPhase)
      setActiveTab(tabForPhase(targetPhase))

      await savePhaseToDb(targetPhase)
    },
    [currentPhase, savePhaseToDb, confirmPhaseBack]
  )

  // Note: Forward navigation removed - use AI to advance phases naturally
  const canGoBack = PHASE_ORDER.indexOf(currentPhase) > 0

  return {
    savePhaseToDb,
    handleApprovePlan,
    handleUpdateSequence,
    handleDraftFirstEpisode,
    handleGenerateBible,
    handlePreviousPhase,
    handlePhaseChange,
    canGoBack,
    PhaseBackConfirmDialog,
  }
}
