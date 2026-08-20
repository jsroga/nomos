import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  fetchCharacterMetrics,
  saveCharacterPortraitVariant,
} from '@/domains/storyteller/core/io/character.api'
import {
  CHARACTER_DIALOG_ERROR_GENERATE_METRICS,
  CHARACTER_DIALOG_ERROR_SAVE_CHARACTER,
  CHARACTER_DIALOG_ERROR_SAVE_VARIANT,
  CHARACTER_DIALOG_LOG_INIT,
  CHARACTER_DIALOG_LOG_VARIANT_SAVED,
  CHARACTER_DIALOG_NEW_ID,
  CHARACTER_DIALOG_TOAST_METRICS_FAILED,
  CHARACTER_DIALOG_TOAST_DESCRIPTION_REQUIRED,
  CharacterDialogMode,
} from './constants/character-creation-dialog'
import {
  buildCharacterPayload,
  mergeCharacterMetrics,
  metricsFromInitialData,
  psychologyFieldsFromInitialData,
  resetFormFields,
} from './character-creation-dialog-helpers'
import { runCharacterPortraitGeneration } from './character-creation-dialog-portrait'
import { useGenerateMissingCharacterFields } from './useGenerateMissingCharacterFields'
import {
  EMPTY_PORTRAIT_GEN_STATE,
  InitialCharacterData,
  INITIAL_METRICS,
  type CharacterMetrics,
  type PortraitGenState,
} from './character-creation-dialog-types'

interface UseCharacterCreationDialogOptions {
  isOpen: boolean
  onClose: () => void
  onCreate: (character: Record<string, unknown>) => void | Promise<void>
  onUpdate?: (characterId: string, updates: Record<string, unknown>) => void | Promise<void>
  projectId?: string
  initialData?: InitialCharacterData
  mode: CharacterDialogMode
}

export function useCharacterCreationDialog({
  isOpen,
  onClose,
  onCreate,
  onUpdate,
  projectId,
  initialData,
  mode,
}: UseCharacterCreationDialogOptions) {
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [role, setRole] = useState('')
  const [description, setDescription] = useState('')
  const [mbti, setMbti] = useState('')
  const [portraitUrl, setPortraitUrl] = useState('')
  const [motivation, setMotivation] = useState('')
  const [fatalFlaw, setFatalFlaw] = useState('')
  const [secrets, setSecrets] = useState('')
  const [metrics, setMetrics] = useState<CharacterMetrics>(INITIAL_METRICS)

  const [isGeneratingMetrics, setIsGeneratingMetrics] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showVariantPicker, setShowVariantPicker] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const hasInitializedRef = useRef<string | null>(null)

  const [genStates, setGenStates] = useState<Record<string, PortraitGenState>>({})
  const generationIdsRef = useRef<Record<string, number>>({})

  const activeCharId = initialData?.id ?? CHARACTER_DIALOG_NEW_ID
  const activeGenState = genStates[activeCharId] ?? EMPTY_PORTRAIT_GEN_STATE

  const updateGenState = useCallback((charId: string, updates: Partial<PortraitGenState>) => {
    setGenStates(prev => ({
      ...prev,
      [charId]: { ...(prev[charId] ?? EMPTY_PORTRAIT_GEN_STATE), ...updates },
    }))
  }, [])

  useEffect(() => {
    if (!isOpen) hasInitializedRef.current = null
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !initialData) return

    const charId = initialData.id ?? CHARACTER_DIALOG_NEW_ID
    if (hasInitializedRef.current === charId) return

    console.log(CHARACTER_DIALOG_LOG_INIT, charId)
    if (initialData.name) setName(initialData.name)
    if (initialData.description) setDescription(initialData.description)
    if (initialData.role) setRole(initialData.role)
    if (initialData.gender) setGender(initialData.gender)
    if (initialData.mbti) setMbti(initialData.mbti)
    const completedPortrait =
      genStates[charId]?.completedPortraitUrl ?? genStates[charId]?.portraitUrlOverride
    setPortraitUrl(initialData.portraitUrl || completedPortrait || '')

    const psychology = psychologyFieldsFromInitialData(initialData)
    setMotivation(psychology.motivation)
    setFatalFlaw(psychology.fatalFlaw)
    setSecrets(psychology.secrets)

    hasInitializedRef.current = charId
    setMetrics((prev: CharacterMetrics) => metricsFromInitialData(initialData, prev))
  }, [genStates, initialData, isOpen])

  useEffect(() => {
    if (!activeGenState.portraitUrlOverride) return
    setPortraitUrl(activeGenState.portraitUrlOverride)
    updateGenState(activeCharId, { portraitUrlOverride: null })
  }, [activeCharId, activeGenState.portraitUrlOverride, updateGenState])

  useEffect(() => {
    if (!activeGenState.needsVariantPick || !portraitUrl || activeGenState.isGenerating) return
    setShowVariantPicker(true)
    updateGenState(activeCharId, { needsVariantPick: false })
  }, [
    activeCharId,
    activeGenState.isGenerating,
    activeGenState.needsVariantPick,
    portraitUrl,
    updateGenState,
  ])

  const resetForm = useCallback(() => {
    const fields = resetFormFields()
    setName(fields.name)
    setGender(fields.gender)
    setRole(fields.role)
    setDescription(fields.description)
    setMbti(fields.mbti)
    setPortraitUrl(fields.portraitUrl)
    setMotivation(fields.motivation)
    setFatalFlaw(fields.fatalFlaw)
    setSecrets(fields.secrets)
    setMetrics(fields.metrics)
    setShowVariantPicker(false)
    setTouched({})
  }, [])

  const handleClose = useCallback(() => {
    resetForm()
    onClose()
  }, [onClose, resetForm])

  const handleGeneratePortrait = useCallback(async () => {
    if (!description.trim()) {
      toast.error(CHARACTER_DIALOG_TOAST_DESCRIPTION_REQUIRED)
      return
    }

    const targetCharId = activeCharId
    updateGenState(targetCharId, {
      isGenerating: true,
      gridImageUrl: null,
      needsVariantPick: false,
      portraitUrlOverride: null,
    })

    generationIdsRef.current[targetCharId] = (generationIdsRef.current[targetCharId] ?? 0) + 1
    await runCharacterPortraitGeneration({
      description,
      projectId,
      targetCharId,
      mbti,
      motivation,
      currentGenId: generationIdsRef.current[targetCharId],
      generationIds: generationIdsRef.current,
      updateGenState,
      onPortraitReady: onUpdate
        ? (characterId, url) => {
            void onUpdate(characterId, { portraitUrl: url })
          }
        : undefined,
    })
  }, [activeCharId, description, mbti, motivation, onUpdate, projectId, updateGenState])

  const handleGenerateMetrics = useCallback(async () => {
    if (!description) return
    setIsGeneratingMetrics(true)
    try {
      const generated = await fetchCharacterMetrics(description)
      setMetrics((prev: CharacterMetrics) => mergeCharacterMetrics(prev, generated))
    } catch (error: unknown) {
      console.error(CHARACTER_DIALOG_ERROR_GENERATE_METRICS, error)
      toast.error(CHARACTER_DIALOG_TOAST_METRICS_FAILED)
    } finally {
      setIsGeneratingMetrics(false)
    }
  }, [description])

  const missingFields = useGenerateMissingCharacterFields({
    name,
    gender,
    role,
    description,
    mbti,
    portraitUrl,
    motivation,
    fatalFlaw,
    secrets,
    metrics,
    projectId,
    activeCharId,
    isOpen,
    isSaving,
    isGeneratingPortrait: activeGenState.isGenerating,
    setName,
    setGender,
    setRole,
    setDescription,
    setMbti,
    setMotivation,
    setFatalFlaw,
    setSecrets,
    setMetrics,
  })

  const handleVariantSelect = useCallback(
    async (croppedDataUrl: string, variantIndex: number) => {
      setShowVariantPicker(false)
      updateGenState(activeCharId, { gridImageUrl: null })
      setPortraitUrl(croppedDataUrl)

      if (!initialData?.id || !projectId) return

      try {
        const { portraitUrl: savedUrl } = await saveCharacterPortraitVariant({
          characterId: initialData.id,
          projectId,
          croppedImageDataUrl: croppedDataUrl,
          variantIndex,
        })

        if (savedUrl) {
          console.log(CHARACTER_DIALOG_LOG_VARIANT_SAVED, savedUrl)
          setPortraitUrl(savedUrl)
        }
      } catch (error: unknown) {
        console.error(CHARACTER_DIALOG_ERROR_SAVE_VARIANT, error)
      }
    },
    [activeCharId, initialData?.id, projectId, updateGenState]
  )

  const handleSubmit = useCallback(async () => {
    if (!name || !gender || !role || !description || !mbti) {
      setTouched({ name: true, gender: true, role: true, description: true, mbti: true })
      return
    }

    const characterData = buildCharacterPayload({
      name,
      gender,
      role,
      description,
      mbti,
      portraitUrl,
      motivation,
      fatalFlaw,
      secrets,
      metrics,
    })

    setIsSaving(true)
    try {
      if (mode === CharacterDialogMode.Edit && initialData?.id && onUpdate) {
        await onUpdate(initialData.id, characterData)
      } else {
        await onCreate(characterData)
      }
      handleClose()
    } catch (error: unknown) {
      console.error(CHARACTER_DIALOG_ERROR_SAVE_CHARACTER, error)
    } finally {
      setIsSaving(false)
    }
  }, [
    description,
    fatalFlaw,
    gender,
    handleClose,
    initialData?.id,
    mbti,
    metrics,
    mode,
    motivation,
    name,
    onCreate,
    onUpdate,
    portraitUrl,
    role,
    secrets,
  ])

  const markTouched = useCallback((field: string) => {
    setTouched((prev: Record<string, boolean>) => ({ ...prev, [field]: true }))
  }, [])

  return {
    form: {
      name,
      setName,
      gender,
      setGender,
      role,
      setRole,
      description,
      setDescription,
      mbti,
      setMbti,
      portraitUrl,
      motivation,
      setMotivation,
      fatalFlaw,
      setFatalFlaw,
      secrets,
      setSecrets,
      metrics,
      setMetrics,
    },
    touched,
    markTouched,
    isGeneratingMetrics,
    isGeneratingMissing: missingFields.isGeneratingMissing,
    canGenerateMissing: missingFields.canGenerateMissing,
    generateDisabledReason: missingFields.disableReason,
    isSaving,
    showVariantPicker,
    setShowVariantPicker,
    activeCharId,
    activeGenState,
    updateGenState,
    handleClose,
    handleGeneratePortrait,
    handleGenerateMetrics,
    handleGenerateMissingFields: missingFields.handleGenerateMissingFields,
    pendingAction: missingFields.pendingAction,
    handleVariantSelect,
    handleSubmit,
  }
}
