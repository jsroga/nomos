import toast from 'react-hot-toast'
import {
  applyGeneratedCharacterFields,
  CHARACTER_TEXT_FIELD_KEYS,
  CharacterTextFieldKey,
  generatedCharacterFieldsFromUnknown,
  hasMissingCharacterFields,
  hasUsableCharacterDraft,
  listMissingCharacterMetricKeys,
  listMissingCharacterTextFields,
  mergeNonBlankCharacterDraft,
  type CharacterFilledDraft,
  type GeneratedCharacterFields,
} from '@/domains/storyteller/core/character-missing-fields'
import {
  isConsistencyFixRunBusy,
} from '@/domains/storyteller/ui/FixInconsistencies/constants/fix-inconsistencies-dialog'
import {
  GenerationActivityPhase,
  isGenerationActivityBusy,
} from '@/domains/storyteller/state/constants/storyteller-ui-store'
import { getStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import {
  CHARACTER_DIALOG_GENERATE_MISSING_FILLED_CHARS,
  CHARACTER_DIALOG_TOAST_GENERATE_MISSING_BUSY,
  CHARACTER_DIALOG_TOAST_GENERATE_MISSING_NO_PROJECT,
  CHARACTER_DIALOG_TOAST_GENERATE_MISSING_NOTHING,
  CharacterDialogFieldLabel,
  CharacterDialogGenerateMissingChat,
  CharacterDialogGenerateMissingDisable,
  CharacterDialogGenerateMissingJoin,
  CharacterDraftChatSection,
} from './constants/character-creation-dialog'
import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import { ActionType } from '@/domains/storyteller/core/types/enums'
import { recordFromJson } from '@/shared/data/json-guards'
import type { PendingAction } from '@/domains/storyteller/ui/WorldBible/utils/bible-context-types'
import type { CharacterFormFields } from './character-creation-dialog-helpers'
import type { CharacterMetrics } from './character-creation-dialog-types'

export interface CharacterFormFieldSetters {
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

export function toFilledDraft(fields: CharacterFormFields): CharacterFilledDraft {
  return {
    name: fields.name,
    gender: fields.gender,
    role: fields.role,
    description: fields.description,
    mbti: fields.mbti,
    motivation: fields.motivation,
    fatalFlaw: fields.fatalFlaw,
    secrets: fields.secrets,
    metrics: fields.metrics,
  }
}

export function applyFormFields(fields: CharacterFormFields, setters: CharacterFormFieldSetters): void {
  setters.setName(fields.name)
  setters.setGender(fields.gender)
  setters.setRole(fields.role)
  setters.setDescription(fields.description)
  setters.setMbti(fields.mbti)
  setters.setMotivation(fields.motivation)
  setters.setFatalFlaw(fields.fatalFlaw)
  setters.setSecrets(fields.secrets)
  setters.setMetrics(fields.metrics)
}

export function applyGeneratedFieldsToForm(
  fields: CharacterFormFields,
  generated: GeneratedCharacterFields,
  setters: CharacterFormFieldSetters,
): void {
  applyFormFields(applyGeneratedCharacterFields(fields, generated), setters)
}

export function applyAcceptedCharacterDraft(input: {
  snapshot: CharacterFilledDraft | null
  live: CharacterFormFields
  generated: GeneratedCharacterFields
  setters: CharacterFormFieldSetters
}): void {
  const liveDraft = toFilledDraft(input.live)
  const snapshot = input.snapshot ?? liveDraft
  const merged = mergeNonBlankCharacterDraft(snapshot, liveDraft)
  applyGeneratedFieldsToForm(
    {
      ...input.live,
      name: merged.name,
      gender: merged.gender,
      role: merged.role,
      description: merged.description,
      mbti: merged.mbti,
      motivation: merged.motivation,
      fatalFlaw: merged.fatalFlaw,
      secrets: merged.secrets,
      metrics: merged.metrics,
    },
    input.generated,
    input.setters,
  )
}

export function seedFormBlanksFromSnapshot(
  live: CharacterFormFields,
  snapshot: CharacterFilledDraft,
  setters: CharacterFormFieldSetters,
): void {
  applyFormFields(
    {
      ...live,
      name: live.name.trim() ? live.name : snapshot.name,
      gender: live.gender.trim() ? live.gender : snapshot.gender,
      role: live.role.trim() ? live.role : snapshot.role,
      description: live.description.trim() ? live.description : snapshot.description,
      mbti: live.mbti.trim() ? live.mbti : snapshot.mbti,
      motivation: live.motivation.trim() ? live.motivation : snapshot.motivation,
      fatalFlaw: live.fatalFlaw.trim() ? live.fatalFlaw : snapshot.fatalFlaw,
      secrets: live.secrets.trim() ? live.secrets : snapshot.secrets,
      metrics: mergeNonBlankCharacterDraft(snapshot, toFilledDraft(live)).metrics,
    },
    setters,
  )
}

export function formHasMissingCharacterFields(fields: CharacterFormFields): boolean {
  return hasMissingCharacterFields(toFilledDraft(fields))
}

function clipFilled(value: string): string {
  if (value.length <= CHARACTER_DIALOG_GENERATE_MISSING_FILLED_CHARS) return value
  return value.slice(0, CHARACTER_DIALOG_GENERATE_MISSING_FILLED_CHARS)
}

export function filledCharacterDraftSummary(fields: CharacterFormFields): string {
  const lines = CHARACTER_TEXT_FIELD_KEYS.flatMap(key => {
    const value = fields[key].trim()
    if (value.length === 0) return []
    return [`${key}${CharacterDialogGenerateMissingJoin.Label}${clipFilled(value)}`]
  })
  return lines.join(CharacterDialogGenerateMissingJoin.Lines)
}

export function buildGenerateMissingCharacterChatPrompt(fields: CharacterFormFields): string {
  const draft = toFilledDraft(fields)
  const missingText = listMissingCharacterTextFields(draft)
  const missingMetrics = listMissingCharacterMetricKeys(draft.metrics)
  const missingTextLine = missingText.join(CharacterDialogGenerateMissingJoin.List) || CharacterDialogGenerateMissingChat.None
  const missingMetricsLine = missingMetrics.join(CharacterDialogGenerateMissingJoin.List) || CharacterDialogGenerateMissingChat.None
  const filledBody = filledCharacterDraftSummary(fields) || CharacterDialogGenerateMissingChat.None
  return [
    CharacterDialogGenerateMissingChat.Instruction,
    `${CharacterDialogGenerateMissingChat.MissingText}${CharacterDialogGenerateMissingJoin.Label}${missingTextLine}`,
    `${CharacterDialogGenerateMissingChat.MissingMetrics}${CharacterDialogGenerateMissingJoin.Label}${missingMetricsLine}`,
    `${CharacterDialogGenerateMissingChat.Filled}${CharacterDialogGenerateMissingJoin.Lines}${filledBody}`,
  ].join(CharacterDialogGenerateMissingJoin.Blocks)
}

export function requestGenerateMissingCharacterChat(input: {
  projectId: string | undefined
  targetId: string
  fields: CharacterFormFields
}): boolean {
  if (!input.projectId) {
    toast.error(CHARACTER_DIALOG_TOAST_GENERATE_MISSING_NO_PROJECT)
    return false
  }
  if (!formHasMissingCharacterFields(input.fields)) {
    toast.error(CHARACTER_DIALOG_TOAST_GENERATE_MISSING_NOTHING)
    return false
  }

  const store = getStorytellerUiStore()
  if (
    isGenerationActivityBusy(store.generationActivity.phase) ||
    isConsistencyFixRunBusy(store.consistencyFixRun.phase)
  ) {
    toast.error(CHARACTER_DIALOG_TOAST_GENERATE_MISSING_BUSY)
    return false
  }

  store.beginCharacterDraft(input.targetId, toFilledDraft(input.fields))
  const seqBefore = store.pendingChatPromptSeq
  store.requestChatPrompt(
    buildGenerateMissingCharacterChatPrompt(input.fields),
    CharacterDraftChatSection.Form,
  )
  if (getStorytellerUiStore().pendingChatPromptSeq === seqBefore) {
    store.clearCharacterDraft()
    toast.error(CHARACTER_DIALOG_TOAST_GENERATE_MISSING_BUSY)
    return false
  }
  return true
}

export function isGenerateMissingChatSettled(phase: GenerationActivityPhase): boolean {
  return phase === GenerationActivityPhase.Idle || phase === GenerationActivityPhase.Error
}

export function isCharacterDraftPending(input: {
  fields: GeneratedCharacterFields | null
  fieldsSeq: number
  resolvedSeq: number
}): boolean {
  return input.fields !== null && input.fieldsSeq > input.resolvedSeq
}

function groundingFieldsToFill(fields: CharacterFormFields): string[] {
  const labels: string[] = []
  if (fields.name.trim().length === 0) labels.push(CharacterDialogFieldLabel.Name)
  if (fields.description.trim().length === 0) labels.push(CharacterDialogFieldLabel.Description)
  return labels
}

export function isCharacterDraftForTarget(
  activeCharId: string,
  targetId: string | null,
): boolean {
  return targetId !== null && targetId === activeCharId
}

export function isCharacterDraftOverlayGenerating(input: {
  isTarget: boolean
  isPendingReview: boolean
  phase: GenerationActivityPhase
}): boolean {
  return (
    input.isTarget &&
    !input.isPendingReview &&
    !isGenerateMissingChatSettled(input.phase)
  )
}

export function isCharacterSidebarGeneratingFields(input: {
  characterId: string
  targetId: string | null
  isPendingReview: boolean
  phase: GenerationActivityPhase
}): boolean {
  return isCharacterDraftOverlayGenerating({
    isTarget: isCharacterDraftForTarget(input.characterId, input.targetId),
    isPendingReview: input.isPendingReview,
    phase: input.phase,
  })
}

export function generateMissingDisableReason(input: {
  projectId?: string
  isSaving: boolean
  isGeneratingPortrait: boolean
  isGeneratingMissing: boolean
  isWritersRoomBusy: boolean
  isAnyDraftPending: boolean
  fields: CharacterFormFields
}): string | null {
  if (input.isGeneratingMissing) return CharacterDialogGenerateMissingDisable.Generating
  if (input.isWritersRoomBusy) return CharacterDialogGenerateMissingDisable.WritersRoomBusy
  if (input.isAnyDraftPending) return CharacterDialogGenerateMissingDisable.Pending
  if (!input.projectId) return CharacterDialogGenerateMissingDisable.NoProject
  if (input.isSaving) return CharacterDialogGenerateMissingDisable.Saving
  if (input.isGeneratingPortrait) return CharacterDialogGenerateMissingDisable.Portrait
  const grounding = groundingFieldsToFill(input.fields)
  if (!hasUsableCharacterDraft(toFilledDraft(input.fields))) {
    return `${CharacterDialogGenerateMissingDisable.FillPrefix}${grounding.join(CharacterDialogGenerateMissingDisable.Or)}${CharacterDialogGenerateMissingDisable.FillSuffix}`
  }
  if (!formHasMissingCharacterFields(input.fields)) {
    return CharacterDialogGenerateMissingDisable.AllFilled
  }
  return null
}

enum CharacterArtifactPsychologyKey {
  Psychology = 'psychology',
  ActualMotivation = 'actualMotivation',
}

enum CharacterArtifactMetricsKey {
  Metrics = 'metrics',
}

function parseArtifactDraftJson(draft: string): unknown {
  try {
    return JSON.parse(draft)
  } catch {
    return { [CharacterTextFieldKey.Description]: draft }
  }
}

export function generatedCharacterFieldsFromArtifactDraft(draft: string): GeneratedCharacterFields {
  const rec = recordFromJson(parseArtifactDraftJson(draft))
  const psych = recordFromJson(rec[CharacterArtifactPsychologyKey.Psychology])
  return generatedCharacterFieldsFromUnknown({
    [CharacterTextFieldKey.Name]: rec[CharacterTextFieldKey.Name],
    [CharacterTextFieldKey.Gender]: rec[CharacterTextFieldKey.Gender],
    [CharacterTextFieldKey.Role]: rec[CharacterTextFieldKey.Role],
    [CharacterTextFieldKey.Description]: rec[CharacterTextFieldKey.Description],
    [CharacterTextFieldKey.Mbti]: rec[CharacterTextFieldKey.Mbti],
    [CharacterTextFieldKey.Motivation]:
      rec[CharacterTextFieldKey.Motivation] ??
      rec[CharacterArtifactPsychologyKey.ActualMotivation] ??
      psych[CharacterArtifactPsychologyKey.ActualMotivation],
    [CharacterTextFieldKey.FatalFlaw]:
      rec[CharacterTextFieldKey.FatalFlaw] ?? psych[CharacterTextFieldKey.FatalFlaw],
    [CharacterTextFieldKey.Secrets]: rec[CharacterTextFieldKey.Secrets] ?? psych[CharacterTextFieldKey.Secrets],
    [CharacterArtifactMetricsKey.Metrics]: rec[CharacterArtifactMetricsKey.Metrics],
  })
}

export function attachCharacterArtifactPendingApply(
  action: PendingAction | null,
  applyDraft: (draft: string) => void,
): PendingAction | null {
  if (!action || action.isProcessing) return action
  const draft = typeof action.preview === 'string' ? action.preview : ''
  const accept = action.onAccept
  return {
    ...action,
    onAccept: async () => {
      applyDraft(draft)
      await Promise.resolve(accept())
    },
  }
}

export function characterDraftPendingAction(input: {
  fields: GeneratedCharacterFields
  seq: number
}): Omit<PendingAction, 'onAccept' | 'onReject'> {
  return {
    section: CharacterDraftChatSection.Form,
    preview: input.fields,
    action: {
      type: ActionType.UPDATE_CHARACTER,
      payload: input.fields,
      status: ApprovalActionStatus.PENDING,
      id: `${CharacterDraftChatSection.Form}:${input.seq}`,
    },
  }
}
