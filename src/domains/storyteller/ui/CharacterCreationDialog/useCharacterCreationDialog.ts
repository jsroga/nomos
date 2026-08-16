import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import { browserStorage } from '@/shared/data/browser-storage'
import { POLLING_INTERVALS } from '@/shared/data/constants/polling'
import { waitForTriggerRun, TriggerRunPollAbortedError } from '@/shared/data/polling/wait-for-trigger-run'
import {
  fetchCharacterMetrics,
  fetchCharacterPortraitRunStatus,
  saveCharacterPortraitVariant,
  startCharacterPortraitGeneration,
} from '@/domains/storyteller/core/io/character.api'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import {
  CHARACTER_DIALOG_ERROR_GENERATE_METRICS,
  CHARACTER_DIALOG_ERROR_GENERATE_PORTRAIT,
  CHARACTER_DIALOG_ERROR_NO_HANDLE,
  CHARACTER_DIALOG_ERROR_SAVE_CHARACTER,
  CHARACTER_DIALOG_ERROR_SAVE_VARIANT,
  CHARACTER_DIALOG_LOG_INIT,
  CHARACTER_DIALOG_LOG_POLL_CANCELLED,
  CHARACTER_DIALOG_LOG_VARIANT_SAVED,
  CHARACTER_DIALOG_NEW_ID,
  CHARACTER_DIALOG_TOAST_METRICS_FAILED,
  CHARACTER_DIALOG_TOAST_PORTRAIT_FAILED,
  CharacterDialogMode,
} from './constants/character-creation-dialog'
import {
  buildCharacterPayload,
  metricsFromInitialData,
  psychologyFieldsFromInitialData,
  resetFormFields,
} from './character-creation-dialog-helpers'
import {
  EMPTY_PORTRAIT_GEN_STATE,
  InitialCharacterData,
  INITIAL_METRICS,
  PortraitGenState,
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
  const [role, setRole] = useState(resetFormFields().role)
  const [description, setDescription] = useState('')
  const [mbti, setMbti] = useState('')
  const [portraitUrl, setPortraitUrl] = useState('')
  const [voiceSignature, setVoiceSignature] = useState('')
  const [archetype, setArchetype] = useState('')
  const [motivation, setMotivation] = useState('')
  const [fatalFlaw, setFatalFlaw] = useState('')
  const [secrets, setSecrets] = useState('')
  const [metrics, setMetrics] = useState(INITIAL_METRICS)

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
    if (initialData.portraitUrl) setPortraitUrl(initialData.portraitUrl)
    if (initialData.voiceSignature) setVoiceSignature(initialData.voiceSignature)

    const psychology = psychologyFieldsFromInitialData(initialData)
    setArchetype(psychology.archetype)
    setMotivation(psychology.motivation)
    setFatalFlaw(psychology.fatalFlaw)
    setSecrets(psychology.secrets)

    hasInitializedRef.current = charId
    setMetrics(prev => metricsFromInitialData(initialData, prev))
  }, [isOpen, initialData])

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
    setVoiceSignature(fields.voiceSignature)
    setArchetype(fields.archetype)
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
    if (!description && !name) return

    const targetCharId = activeCharId
    updateGenState(targetCharId, {
      isGenerating: true,
      gridImageUrl: null,
      needsVariantPick: false,
      portraitUrlOverride: null,
    })

    generationIdsRef.current[targetCharId] = (generationIdsRef.current[targetCharId] ?? 0) + 1
    const currentGenId = generationIdsRef.current[targetCharId]

    if (!projectId) {
      updateGenState(targetCharId, { isGenerating: false })
      return
    }

    try {
      const apiKey =
        browserStorage.getAiApiKey(LocalStorageKeys.AI_CONFIG_APIFRAME) || undefined
      const { handleId } = await startCharacterPortraitGeneration({
        prompt: description || `A portrait of ${name}, ${gender}`,
        projectId,
        ...(apiKey ? { apiKey } : {}),
      })

      if (!handleId) {
        console.error(CHARACTER_DIALOG_ERROR_NO_HANDLE)
        updateGenState(targetCharId, { isGenerating: false })
        toast.error(CHARACTER_DIALOG_TOAST_PORTRAIT_FAILED)
        return
      }

      const run = await waitForTriggerRun(
        async () => {
          const status = await fetchCharacterPortraitRunStatus(handleId)
          return {
            status: status.status,
            output: status.imageUrl ? { imageUrl: status.imageUrl } : {},
            error: status.error,
          }
        },
        {
          intervalMs: POLLING_INTERVALS.DEFAULT,
          maxPolls: 60,
          shouldAbort: () => currentGenId !== generationIdsRef.current[targetCharId],
        }
      )

      const imageUrl = readString(recordFromJson(run.output).imageUrl)
      const isVariantGrid = recordFromJson(run.output).isVariantGrid === true
      if (imageUrl) {
        updateGenState(targetCharId, {
          isGenerating: false,
          gridImageUrl: isVariantGrid ? imageUrl : null,
          needsVariantPick: isVariantGrid,
          portraitUrlOverride: imageUrl,
        })
      } else {
        updateGenState(targetCharId, { isGenerating: false })
        toast.error(CHARACTER_DIALOG_TOAST_PORTRAIT_FAILED)
      }
    } catch (error) {
      if (error instanceof TriggerRunPollAbortedError) {
        console.log(CHARACTER_DIALOG_LOG_POLL_CANCELLED, targetCharId)
        return
      }
      console.error(CHARACTER_DIALOG_ERROR_GENERATE_PORTRAIT, error)
      updateGenState(targetCharId, { isGenerating: false })
      toast.error(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : CHARACTER_DIALOG_TOAST_PORTRAIT_FAILED,
      )
    }
  }, [activeCharId, description, gender, name, projectId, updateGenState])

  const handleGenerateMetrics = useCallback(async () => {
    if (!description) return
    setIsGeneratingMetrics(true)
    try {
      const generated = await fetchCharacterMetrics(description)
      setMetrics(prev => ({ ...prev, ...generated }))
    } catch (error) {
      console.error(CHARACTER_DIALOG_ERROR_GENERATE_METRICS, error)
      toast.error(CHARACTER_DIALOG_TOAST_METRICS_FAILED)
    } finally {
      setIsGeneratingMetrics(false)
    }
  }, [description])

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
      } catch (error) {
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
      voiceSignature,
      archetype,
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
    } catch (error) {
      console.error(CHARACTER_DIALOG_ERROR_SAVE_CHARACTER, error)
    } finally {
      setIsSaving(false)
    }
  }, [
    archetype,
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
    voiceSignature,
  ])

  const markTouched = useCallback((field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
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
      voiceSignature,
      setVoiceSignature,
      archetype,
      setArchetype,
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
    isSaving,
    showVariantPicker,
    setShowVariantPicker,
    activeCharId,
    activeGenState,
    updateGenState,
    handleClose,
    handleGeneratePortrait,
    handleGenerateMetrics,
    handleVariantSelect,
    handleSubmit,
  }
}
