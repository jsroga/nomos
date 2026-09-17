'use client'

import { useEffect, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import type { StorySequence } from '@/domains/storyteller/core/types/story-plan-types'
import { Phase, type PhaseId } from '@/domains/storyteller/core/types/enums'
import { readString } from '@/shared/data/json-guards'
import {
  saveStorytellerPlan,
  patchStorytellerPlan,
  createStorytellerEpisode,
} from '@/domains/storyteller/core/io/storyteller.api'
import { storytellerKeys } from '@/domains/storyteller/core/io/storyteller.keys'
import {
  StorytellerTab,
  StorytellerLogMessage,
  StorytellerPhaseLabel,
  StorytellerEpisodeSeed,
  StorytellerQueryParam,
  StorytellerConfirmCopy,
} from '@/domains/storyteller/core/storyteller-page-wire'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { ConfirmDialogVariant } from '@/components/ConfirmDialog/constants/confirm-dialog-copy'
import { getStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import { storytellerSearchParams } from '@/domains/storyteller/state/utils/strip-bible-search-params'
import {
  resolveStorytellerPhaseClick,
  STORYTELLER_PHASE_ORDER,
  StorytellerPhaseClick,
} from '@/domains/storyteller/state/utils/resolve-storyteller-phase-click'
import type { StorytellerWorkspaceCore } from './useStorytellerPageBase'

const phaseDisplayName: Record<PhaseId, string> = {
  [Phase.PREMISE]: StorytellerPhaseLabel.Premise,
  [Phase.BREAKING]: StorytellerPhaseLabel.StoryBeats,
  [Phase.WRITING]: StorytellerPhaseLabel.Script,
  [Phase.COMPLETE]: StorytellerPhaseLabel.Complete,
}

function tabForPhase(phase: PhaseId): StorytellerTab {
  if (phase === Phase.PREMISE) return StorytellerTab.Plan
  if (phase === Phase.WRITING || phase === Phase.COMPLETE) return StorytellerTab.Script
  return StorytellerTab.Board
}

export function useStorytellerPhase(core: StorytellerWorkspaceCore) {
  const {
    currentEpisodeId,
    currentPhase,
    setCurrentPhase,
    setViewPhase,
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
  const pathname = usePathname()
  const queryClient = useQueryClient()

  const advanceProgress = useCallback(
    async (phase: PhaseId) => {
      setCurrentPhase(phase)
      setViewPhase(phase)
      setActiveTab(tabForPhase(phase))
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
    [currentEpisodeId, setCurrentPhase, setViewPhase, setActiveTab]
  )

  // Sync progress when beats exist but DB/progress still on premise (data mismatch only)
  useEffect(() => {
    if (beats.length > 0 && currentPhase === Phase.PREMISE && currentEpisodeId) {
      console.log(StorytellerLogMessage.PhaseSyncPremiseToBreaking)
      void advanceProgress(Phase.BREAKING)
    }
  }, [beats.length, currentPhase, currentEpisodeId, advanceProgress])

  const handleApprovePlan = useCallback(async () => {
    if (!storyPlan || !currentProject?.id) return

    try {
      await saveStorytellerPlan({
        projectId: currentProject.id,
        episodeId: currentEpisodeId,
        storyPlan,
        approved: true,
        currentPhase: Phase.BREAKING,
      })

      setIsPlanApproved(true)
      setCurrentPhase(Phase.BREAKING)
      setViewPhase(Phase.BREAKING)
      setActiveTab(StorytellerTab.Board)
    } catch (error) {
      console.error(StorytellerLogMessage.FailedSavePlan, error)
    }
  }, [
    storyPlan,
    currentProject?.id,
    currentEpisodeId,
    setIsPlanApproved,
    setCurrentPhase,
    setViewPhase,
    setActiveTab,
  ])

  const handleUpdateSequence = useCallback(
    async (sequenceId: number, updates: Partial<StorySequence>) => {
      if (!storyPlan) return

      setStoryPlan(prev => {
        if (!prev) return prev
        return {
          ...prev,
          sequences: (prev.sequences || []).map(seq =>
            seq.id === sequenceId ? { ...seq, ...updates } : seq
          ),
        }
      })

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
    [storyPlan, currentEpisodeId, setStoryPlan]
  )

  const handleDraftFirstEpisode = useCallback(async () => {
    const projectId = currentProject?.id
    if (!projectId || isSending) return

    try {
      setIsSending(true)
      const newEpisode = await createStorytellerEpisode({
        projectId,
        title: StorytellerEpisodeSeed.FirstTitle,
        sequence: 1,
      })

      const episodeId = readString(newEpisode.id)
      if (episodeId) {
        await queryClient.invalidateQueries({ queryKey: storytellerKeys.episodes(projectId) })
        await queryClient.invalidateQueries({ queryKey: storytellerKeys.episode(episodeId) })
        const params = storytellerSearchParams(searchParams)
        params.set(StorytellerQueryParam.EpisodeId, episodeId)
        router.push(`?${params.toString()}`)
        setCurrentEpisodeId(episodeId)
        getStorytellerUiStore().setWorldBibleOpen(false)
      }
    } catch (error) {
      console.error(StorytellerLogMessage.FailedDraftFirstEpisode, error)
    } finally {
      setIsSending(false)
    }
  }, [
    currentProject?.id,
    isSending,
    queryClient,
    setIsSending,
    searchParams,
    router,
    setCurrentEpisodeId,
  ])

  const handleGenerateBible = useCallback(() => {
    const params = storytellerSearchParams(searchParams)
    params.delete(StorytellerQueryParam.EpisodeId)
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [searchParams, router, pathname])

  const { confirm: confirmPhaseBack, ConfirmDialogComponent: PhaseBackConfirmDialog } =
    useConfirmDialog()

  /** Soft view navigation — unlocked phases only, no data wipe. */
  const handlePhaseChange = useCallback(
    (targetPhase: PhaseId) => {
      const click = resolveStorytellerPhaseClick({
        currentPhase,
        targetPhase,
        beatCount: beats.length,
      })
      if (click === StorytellerPhaseClick.Ignore) return
      if (click === StorytellerPhaseClick.Advance) {
        void advanceProgress(targetPhase)
        return
      }

      setViewPhase(targetPhase)
      setActiveTab(tabForPhase(targetPhase))
    },
    [advanceProgress, beats.length, currentPhase, setViewPhase, setActiveTab]
  )

  /** Explicit go-back that clears later-phase data (destructive). */
  const handlePreviousPhase = useCallback(async () => {
    const idx = STORYTELLER_PHASE_ORDER.indexOf(currentPhase)
    if (idx <= 0) return

    const confirmed = await confirmPhaseBack({
      title: StorytellerConfirmCopy.GoBackTitle,
      description: `Going back will erase all data from the current "${phaseDisplayName[currentPhase]}" phase. This action cannot be undone.`,
      confirmLabel: StorytellerConfirmCopy.GoBackLabel,
      cancelLabel: StorytellerConfirmCopy.StayHereLabel,
      variant: ConfirmDialogVariant.Destructive,
    })

    if (!confirmed) return

    if (currentPhase === Phase.WRITING) {
      setScript('')
    } else if (currentPhase === Phase.BREAKING) {
      setBeats([])
    }

    const prevPhase = STORYTELLER_PHASE_ORDER[idx - 1]
    await advanceProgress(prevPhase)
  }, [currentPhase, confirmPhaseBack, setScript, setBeats, advanceProgress])

  const canGoBack = STORYTELLER_PHASE_ORDER.indexOf(currentPhase) > 0

  return {
    savePhaseToDb: advanceProgress,
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
