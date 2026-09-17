import { useCallback, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { useStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import {
  CharacterDraftResolution,
  GenerationActivityPhase,
  isGenerationActivityBusy,
} from '@/domains/storyteller/state/utils/storyteller-ui-store'
import { isConsistencyFixRunBusy } from '@/domains/storyteller/ui/FixInconsistencies/utils/fix-inconsistencies-dialog'
import type { PendingAction } from '@/domains/storyteller/ui/WorldBible/utils/bible-context-types'
import type { CharacterFormFields } from './character-creation-dialog-helpers'
import type { CharacterMetrics } from './character-creation-dialog-types'
import { CharacterTextFieldKey } from '@/domains/storyteller/core/character-missing-fields'
import {
  applyAcceptedCharacterDraft,
  characterDraftPendingAction,
  generateMissingDisableReason,
  isCharacterDraftForTarget,
  isCharacterDraftOverlayGenerating,
  isCharacterDraftPending,
  regenerateFieldDisableReason,
  requestGenerateMissingCharacterChat,
  requestRegenerateCharacterFieldChat,
  seedFormBlanksFromSnapshot,
} from './character-creation-dialog-generate-missing'
import { CHARACTER_DIALOG_TOAST_GENERATE_MISSING_FAILED } from './constants/character-creation-dialog'

interface UseGenerateMissingCharacterFieldsInput extends CharacterFormFields {
  projectId?: string
  activeCharId: string
  isOpen: boolean
  isSaving: boolean
  isGeneratingPortrait: boolean
  setName: (value: string) => void
  setGender: (value: string) => void
  setRole: (value: string) => void
  setDescription: (value: string) => void
  setMbti: (value: string) => void
  setMotivation: (value: string) => void
  setFatalFlaw: (value: string) => void
  setSecrets: (value: string) => void
  setMetrics: (value: CharacterMetrics) => void
}

function formFieldsFromInput(input: UseGenerateMissingCharacterFieldsInput): CharacterFormFields {
  return {
    name: input.name,
    gender: input.gender,
    role: input.role,
    description: input.description,
    mbti: input.mbti,
    portraitUrl: input.portraitUrl,
    motivation: input.motivation,
    fatalFlaw: input.fatalFlaw,
    secrets: input.secrets,
    metrics: input.metrics,
  }
}

export function useGenerateMissingCharacterFields(input: UseGenerateMissingCharacterFieldsInput) {
  const inputRef = useRef(input)
  const seededTargetRef = useRef<string | null>(null)
  const toastedErrorRef = useRef(false)
  const overwriteKeyRef = useRef<CharacterTextFieldKey | null>(null)

  const characterDraftFields = useStorytellerUiStore(state => state.characterDraftFields)
  const characterDraftFieldsSeq = useStorytellerUiStore(state => state.characterDraftFieldsSeq)
  const characterDraftResolvedSeq = useStorytellerUiStore(state => state.characterDraftResolvedSeq)
  const characterDraftTargetId = useStorytellerUiStore(state => state.characterDraftTargetId)
  const characterDraftFilledSnapshot = useStorytellerUiStore(state => state.characterDraftFilledSnapshot)
  const characterDraftResolution = useStorytellerUiStore(state => state.characterDraftResolution)
  const rejectCharacterDraftFields = useStorytellerUiStore(state => state.rejectCharacterDraftFields)
  const acceptCharacterDraftFields = useStorytellerUiStore(state => state.acceptCharacterDraftFields)
  const clearCharacterDraft = useStorytellerUiStore(state => state.clearCharacterDraft)
  const generationPhase = useStorytellerUiStore(state => state.generationActivity.phase)
  const consistencyFixPhase = useStorytellerUiStore(state => state.consistencyFixRun.phase)

  useEffect(() => {
    inputRef.current = input
  })

  const isTarget = isCharacterDraftForTarget(input.activeCharId, characterDraftTargetId)
  const isAnyDraftPending = isCharacterDraftPending({
    fields: characterDraftFields,
    fieldsSeq: characterDraftFieldsSeq,
    resolvedSeq: characterDraftResolvedSeq,
  })
  const isPendingReview = isTarget && isAnyDraftPending
  const isWritersRoomBusy =
    isGenerationActivityBusy(generationPhase) || isConsistencyFixRunBusy(consistencyFixPhase)
  const isQueuedForWritersRoom =
    isTarget &&
    !isPendingReview &&
    characterDraftFilledSnapshot !== null &&
    generationPhase === GenerationActivityPhase.Idle
  const isGeneratingMissing =
    isQueuedForWritersRoom ||
    isCharacterDraftOverlayGenerating({
      isTarget,
      isPendingReview,
      phase: generationPhase,
    })

  useEffect(() => {
    if (!input.isOpen || !isTarget || !characterDraftFilledSnapshot) {
      seededTargetRef.current = null
      return
    }
    if (seededTargetRef.current === input.activeCharId) return
    seededTargetRef.current = input.activeCharId
    seedFormBlanksFromSnapshot(
      formFieldsFromInput(inputRef.current),
      characterDraftFilledSnapshot,
      inputRef.current,
    )
  }, [characterDraftFilledSnapshot, input.activeCharId, input.isOpen, isTarget])

  useEffect(() => {
    if (!isTarget) {
      toastedErrorRef.current = false
      return
    }
    if (generationPhase !== GenerationActivityPhase.Error) return
    if (isPendingReview) return
    if (toastedErrorRef.current) return
    toastedErrorRef.current = true
    toast.error(CHARACTER_DIALOG_TOAST_GENERATE_MISSING_FAILED)
    clearCharacterDraft()
  }, [clearCharacterDraft, generationPhase, isPendingReview, isTarget])

  useEffect(() => {
    if (characterDraftResolution !== CharacterDraftResolution.Accepted) return
    if (!input.isOpen || !isTarget || !characterDraftFields) return
    applyAcceptedCharacterDraft({
      snapshot: characterDraftFilledSnapshot,
      live: formFieldsFromInput(inputRef.current),
      generated: characterDraftFields,
      setters: inputRef.current,
      overwriteKey: overwriteKeyRef.current ?? undefined,
    })
    overwriteKeyRef.current = null
    clearCharacterDraft()
  }, [
    characterDraftFields,
    characterDraftFilledSnapshot,
    characterDraftResolution,
    clearCharacterDraft,
    input.isOpen,
    isTarget,
  ])

  const handleAccept = useCallback(() => {
    acceptCharacterDraftFields()
  }, [acceptCharacterDraftFields])

  const pendingAction: PendingAction | null =
    input.isOpen && isPendingReview && characterDraftFields
      ? {
          ...characterDraftPendingAction({
            fields: characterDraftFields,
            seq: characterDraftFieldsSeq,
          }),
          onAccept: handleAccept,
          onReject: rejectCharacterDraftFields,
        }
      : null

  const disableReason = generateMissingDisableReason({
    projectId: input.projectId,
    isSaving: input.isSaving,
    isGeneratingPortrait: input.isGeneratingPortrait,
    isGeneratingMissing,
    isWritersRoomBusy,
    isAnyDraftPending,
    fields: formFieldsFromInput(input),
  })
  const canGenerateMissing = disableReason === null
  const regenerateDisableReason = regenerateFieldDisableReason({
    projectId: input.projectId,
    isSaving: input.isSaving,
    isGeneratingPortrait: input.isGeneratingPortrait,
    isGeneratingMissing,
    isWritersRoomBusy,
    isAnyDraftPending,
  })
  const canRegenerateField = regenerateDisableReason === null

  const handleGenerateMissingFields = useCallback(() => {
    overwriteKeyRef.current = null
    const current = inputRef.current
    requestGenerateMissingCharacterChat({
      projectId: current.projectId,
      targetId: current.activeCharId,
      fields: formFieldsFromInput(current),
    })
  }, [])

  const handleRegenerateField = useCallback((key: CharacterTextFieldKey) => {
    overwriteKeyRef.current = key
    const current = inputRef.current
    const started = requestRegenerateCharacterFieldChat({
      projectId: current.projectId,
      targetId: current.activeCharId,
      fields: formFieldsFromInput(current),
      key,
    })
    if (!started) overwriteKeyRef.current = null
  }, [])

  return {
    isGeneratingMissing,
    canGenerateMissing,
    disableReason,
    canRegenerateField,
    regenerateDisableReason,
    handleGenerateMissingFields,
    handleRegenerateField,
    pendingAction,
  }
}
