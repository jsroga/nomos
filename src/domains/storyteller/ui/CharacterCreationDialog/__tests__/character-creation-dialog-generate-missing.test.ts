import { describe, expect, it } from 'vitest'
import { DEFAULT_CHARACTER_METRICS } from '@/domains/storyteller/core/character-missing-fields'
import { CharacterTextFieldKey } from '@/domains/storyteller/core/character-missing-fields'
import { StorytellerChatTool } from '@/domains/storyteller/core/storyteller-page-wire'
import { GenerationActivityPhase } from '@/domains/storyteller/state/utils/storyteller-ui-store'
import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import { CharacterDraftChatSection } from '../constants/character-creation-dialog'
import {
  applyAcceptedCharacterDraft,
  applyGeneratedFieldsToForm,
  attachCharacterArtifactPendingApply,
  buildGenerateMissingCharacterChatPrompt,
  draftStringFromPendingAction,
  filledCharacterDraftSummary,
  generateMissingDisableReason,
  generatedCharacterFieldsFromArtifactDraft,
  isCharacterDraftForTarget,
  isCharacterDraftOverlayGenerating,
  isCharacterSidebarGeneratingFields,
  seedFormBlanksFromSnapshot,
  type CharacterFormFieldSetters,
} from '../character-creation-dialog-generate-missing'
import {
  CharacterDialogFieldLabel,
  CharacterDialogGenerateMissingChat,
  CharacterDialogGenerateMissingDisable,
  CharacterDialogGenerateMissingJoin,
} from '../constants/character-creation-dialog'
import type { CharacterFormFields } from '../character-creation-dialog-helpers'

const VERA = 'Vera'
const VERA_DESC = 'Vera keeps the wardens at bay.'

function form(overrides: Partial<CharacterFormFields> = {}): CharacterFormFields {
  return {
    name: '',
    gender: '',
    role: '',
    description: '',
    mbti: '',
    portraitUrl: '',
    motivation: '',
    fatalFlaw: '',
    secrets: '',
    metrics: { ...DEFAULT_CHARACTER_METRICS },
    ...overrides,
  }
}

describe('buildGenerateMissingCharacterChatPrompt', () => {
  it('asks for propose_character_fields and lists missing plus filled', () => {
    const prompt = buildGenerateMissingCharacterChatPrompt(
      form({ name: VERA, description: VERA_DESC }),
    )
    expect(prompt).toContain(CharacterDialogGenerateMissingChat.Instruction)
    expect(prompt).toContain(StorytellerChatTool.ProposeCharacterFields)
    expect(prompt).toContain(CharacterTextFieldKey.Motivation)
    expect(prompt).toContain(CharacterTextFieldKey.Role)
    expect(prompt).toContain(CharacterTextFieldKey.Gender)
    expect(prompt).toContain(VERA)
    expect(prompt).toContain(VERA_DESC)
  })

  it('summarizes only filled text fields', () => {
    expect(filledCharacterDraftSummary(form({ name: VERA }))).toBe(
      `${CharacterTextFieldKey.Name}${CharacterDialogGenerateMissingJoin.Label}${VERA}`,
    )
  })
})

function disableInput(
  overrides: Partial<Parameters<typeof generateMissingDisableReason>[0]> = {},
) {
  return {
    projectId: VERA,
    isSaving: false,
    isGeneratingPortrait: false,
    isGeneratingMissing: false,
    isWritersRoomBusy: false,
    isAnyDraftPending: false,
    fields: form(),
    ...overrides,
  }
}

function captureSetters(live: CharacterFormFields): CharacterFormFieldSetters & {
  next: CharacterFormFields
} {
  const next = { ...live, metrics: { ...live.metrics } }
  return {
    next,
    setName: value => {
      next.name = value
    },
    setGender: value => {
      next.gender = value
    },
    setRole: value => {
      next.role = value
    },
    setDescription: value => {
      next.description = value
    },
    setMbti: value => {
      next.mbti = value
    },
    setMotivation: value => {
      next.motivation = value
    },
    setFatalFlaw: value => {
      next.fatalFlaw = value
    },
    setSecrets: value => {
      next.secrets = value
    },
    setMetrics: value => {
      next.metrics = value
    },
  }
}

describe('generateMissingDisableReason', () => {
  it('names Name and Description when both are empty', () => {
    expect(generateMissingDisableReason(disableInput({ fields: form() }))).toBe(
      `${CharacterDialogGenerateMissingDisable.FillPrefix}${CharacterDialogFieldLabel.Name}${CharacterDialogGenerateMissingDisable.Or}${CharacterDialogFieldLabel.Description}${CharacterDialogGenerateMissingDisable.FillSuffix}`,
    )
  })

  it('is null when name is set and fields are missing', () => {
    expect(
      generateMissingDisableReason(disableInput({ fields: form({ name: VERA }) })),
    ).toBeNull()
  })

  it('disables every character dialog while Writers Room is busy', () => {
    expect(
      generateMissingDisableReason(
        disableInput({ isWritersRoomBusy: true, fields: form({ name: VERA }) }),
      ),
    ).toBe(CharacterDialogGenerateMissingDisable.WritersRoomBusy)
  })

  it('disables every character dialog while any draft is pending', () => {
    expect(
      generateMissingDisableReason(
        disableInput({ isAnyDraftPending: true, fields: form({ name: VERA }) }),
      ),
    ).toBe(CharacterDialogGenerateMissingDisable.Pending)
  })
})

describe('character draft overlay target', () => {
  const targetA = 'char-a'
  const targetB = 'char-b'

  it('overlays only the generating character', () => {
    expect(isCharacterDraftForTarget(targetA, targetA)).toBe(true)
    expect(isCharacterDraftForTarget(targetB, targetA)).toBe(false)
    expect(
      isCharacterDraftOverlayGenerating({
        isTarget: true,
        isPendingReview: false,
        phase: GenerationActivityPhase.Streaming,
      }),
    ).toBe(true)
    expect(
      isCharacterDraftOverlayGenerating({
        isTarget: false,
        isPendingReview: false,
        phase: GenerationActivityPhase.Streaming,
      }),
    ).toBe(false)
  })

  it('spins the sidebar row only while that character is generating', () => {
    expect(
      isCharacterSidebarGeneratingFields({
        characterId: targetA,
        targetId: targetA,
        isPendingReview: false,
        phase: GenerationActivityPhase.Streaming,
      }),
    ).toBe(true)
    expect(
      isCharacterSidebarGeneratingFields({
        characterId: targetB,
        targetId: targetA,
        isPendingReview: false,
        phase: GenerationActivityPhase.Streaming,
      }),
    ).toBe(false)
    expect(
      isCharacterSidebarGeneratingFields({
        characterId: targetA,
        targetId: targetA,
        isPendingReview: true,
        phase: GenerationActivityPhase.Idle,
      }),
    ).toBe(false)
  })

  it('restores snapshot name after the live form is emptied', () => {
    const live = form()
    const setters = captureSetters(live)
    seedFormBlanksFromSnapshot(live, {
      ...form({ name: VERA, description: VERA_DESC }),
      metrics: { ...DEFAULT_CHARACTER_METRICS },
    }, setters)
    expect(setters.next.name).toBe(VERA)
    expect(setters.next.description).toBe(VERA_DESC)
  })

  it('keeps snapshot name and description when generated repeats them', () => {
    const live = form()
    const setters = captureSetters(live)
    applyAcceptedCharacterDraft({
      snapshot: {
        ...form({ name: VERA, description: VERA_DESC }),
        metrics: { ...DEFAULT_CHARACTER_METRICS },
      },
      live,
      generated: {
        [CharacterTextFieldKey.Name]: 'Other',
        [CharacterTextFieldKey.Description]: 'Replaced',
        [CharacterTextFieldKey.Motivation]: 'Protect the ward',
      },
      setters,
    })
    expect(setters.next.name).toBe(VERA)
    expect(setters.next.description).toBe(VERA_DESC)
    expect(setters.next.motivation).toBe('Protect the ward')
  })
})

describe('generatedCharacterFieldsFromArtifactDraft', () => {
  it('reads nested psychology fields from an artifact-draft JSON body', () => {
    const fields = generatedCharacterFieldsFromArtifactDraft(
      JSON.stringify({
        [CharacterTextFieldKey.Name]: VERA,
        [CharacterTextFieldKey.Description]: VERA_DESC,
        psychology: {
          actualMotivation: 'Hold the ward',
          [CharacterTextFieldKey.FatalFlaw]: 'Pride',
          [CharacterTextFieldKey.Secrets]: 'The ledger',
        },
      }),
    )
    expect(fields.name).toBe(VERA)
    expect(fields.motivation).toBe('Hold the ward')
    expect(fields.fatalFlaw).toBe('Pride')
    expect(fields.secrets).toBe('The ledger')
  })

  it('unwraps a resume envelope whose draft is a JSON character body', () => {
    const description =
      'A brilliant political tactician with a sharp wit and a guarded heart, Vivienne maneuvers through court intrigue with precision. She stands tall with silver-streaked auburn hair and calculating green eyes.'
    const fields = generatedCharacterFieldsFromArtifactDraft(
      JSON.stringify({
        draft: JSON.stringify({
          [CharacterTextFieldKey.Name]: 'Vivienne Ardent',
          [CharacterTextFieldKey.Role]: 'Deuteragonist / Strategist',
          [CharacterTextFieldKey.Description]: description,
          [CharacterTextFieldKey.Mbti]: 'INTJ',
          metrics: { socialSafety: 62, moralAlignment: 45 },
        }),
        runId: '657a642d-6f34-4748-8b95-1337461d2287',
      }),
    )
    expect(fields.description).toBe(description)
    expect(fields.name).toBe('Vivienne Ardent')
    expect(fields.metrics?.moralAlignment).toBe(45)
  })
})

describe('attachCharacterArtifactPendingApply', () => {
  it('fills a blank description from payload.draft when Accept runs', async () => {
    const description = 'A brilliant political tactician with a sharp wit and a guarded heart.'
    const live = form({ name: VERA, description: '' })
    const setters = captureSetters(live)
    const draft = JSON.stringify({
      [CharacterTextFieldKey.Name]: 'Vivienne Ardent',
      [CharacterTextFieldKey.Description]: description,
    })
    const wrapped = attachCharacterArtifactPendingApply(
      {
        section: CharacterDraftChatSection.Form,
        preview: '',
        action: {
          type: 'UPDATE_CHARACTER',
          payload: { draft, runId: '657a642d-6f34-4748-8b95-1337461d2287' },
          status: ApprovalActionStatus.PENDING,
          id: '657a642d-6f34-4748-8b95-1337461d2287',
        },
        onAccept: () => undefined,
        onReject: () => undefined,
      },
      nextDraft => {
        applyGeneratedFieldsToForm(
          live,
          generatedCharacterFieldsFromArtifactDraft(nextDraft),
          setters,
        )
      },
    )
    expect(wrapped).not.toBeNull()
    if (!wrapped) return
    expect(draftStringFromPendingAction(wrapped)).toBe(draft)
    await wrapped.onAccept()
    expect(setters.next.name).toBe(VERA)
    expect(setters.next.description).toBe(description)
  })
})
