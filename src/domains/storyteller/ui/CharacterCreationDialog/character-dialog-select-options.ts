import {
  CharacterDialogGender,
  CharacterDialogMbti,
  CharacterDialogStoryRole,
} from '@/domains/storyteller/services/constants/generate-character-fields'
import {
  CharacterDialogMbtiGroup,
  CharacterDialogMbtiOptionLabel,
} from './constants/character-creation-dialog'
import type { CharacterDialogSelectGroup, CharacterDialogSelectOption } from './CharacterDialogSelect'

export const CHARACTER_DIALOG_ROLE_OPTIONS: readonly CharacterDialogSelectOption[] = [
  { value: CharacterDialogStoryRole.Protagonist, label: CharacterDialogStoryRole.Protagonist },
  { value: CharacterDialogStoryRole.Antagonist, label: CharacterDialogStoryRole.Antagonist },
  { value: CharacterDialogStoryRole.Supporting, label: CharacterDialogStoryRole.Supporting },
]

export const CHARACTER_DIALOG_GENDER_OPTIONS: readonly CharacterDialogSelectOption[] = [
  { value: CharacterDialogGender.Male, label: CharacterDialogGender.Male },
  { value: CharacterDialogGender.Female, label: CharacterDialogGender.Female },
  { value: CharacterDialogGender.NonBinary, label: CharacterDialogGender.NonBinary },
  { value: CharacterDialogGender.Other, label: CharacterDialogGender.Other },
]

export const CHARACTER_DIALOG_MBTI_GROUPS: readonly CharacterDialogSelectGroup[] = [
  {
    label: CharacterDialogMbtiGroup.Analysts,
    options: [
      { value: CharacterDialogMbti.INTJ, label: CharacterDialogMbtiOptionLabel.INTJ },
      { value: CharacterDialogMbti.INTP, label: CharacterDialogMbtiOptionLabel.INTP },
      { value: CharacterDialogMbti.ENTJ, label: CharacterDialogMbtiOptionLabel.ENTJ },
      { value: CharacterDialogMbti.ENTP, label: CharacterDialogMbtiOptionLabel.ENTP },
    ],
  },
  {
    label: CharacterDialogMbtiGroup.Diplomats,
    options: [
      { value: CharacterDialogMbti.INFJ, label: CharacterDialogMbtiOptionLabel.INFJ },
      { value: CharacterDialogMbti.INFP, label: CharacterDialogMbtiOptionLabel.INFP },
      { value: CharacterDialogMbti.ENFJ, label: CharacterDialogMbtiOptionLabel.ENFJ },
      { value: CharacterDialogMbti.ENFP, label: CharacterDialogMbtiOptionLabel.ENFP },
    ],
  },
  {
    label: CharacterDialogMbtiGroup.Sentinels,
    options: [
      { value: CharacterDialogMbti.ISTJ, label: CharacterDialogMbtiOptionLabel.ISTJ },
      { value: CharacterDialogMbti.ISFJ, label: CharacterDialogMbtiOptionLabel.ISFJ },
      { value: CharacterDialogMbti.ESTJ, label: CharacterDialogMbtiOptionLabel.ESTJ },
      { value: CharacterDialogMbti.ESFJ, label: CharacterDialogMbtiOptionLabel.ESFJ },
    ],
  },
  {
    label: CharacterDialogMbtiGroup.Explorers,
    options: [
      { value: CharacterDialogMbti.ISTP, label: CharacterDialogMbtiOptionLabel.ISTP },
      { value: CharacterDialogMbti.ISFP, label: CharacterDialogMbtiOptionLabel.ISFP },
      { value: CharacterDialogMbti.ESTP, label: CharacterDialogMbtiOptionLabel.ESTP },
      { value: CharacterDialogMbti.ESFP, label: CharacterDialogMbtiOptionLabel.ESFP },
    ],
  },
]
