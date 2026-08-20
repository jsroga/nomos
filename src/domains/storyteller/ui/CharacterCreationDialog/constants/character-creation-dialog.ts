import { HttpMethod } from '@/shared/data/constants/protocol'
import { BeatImageTriggerStatus } from '@/domains/storyteller/services/constants/beat-image-service'
import { CharacterDraftChatSection } from '@/domains/storyteller/state/constants/storyteller-ui-store'

export { HttpMethod as CharacterDialogHttpMethod, BeatImageTriggerStatus as CharacterDialogTriggerStatus }
export { CharacterDraftChatSection }

export enum CharacterDialogMode {
  Create = 'create',
  Edit = 'edit',
}

export const CHARACTER_DIALOG_NEW_ID = 'new'

export const CHARACTER_DIALOG_LOG_INIT = '[CharacterDialog] Initializing form with data for:'
export const CHARACTER_DIALOG_LOG_POLL_CANCELLED =
  '[CharacterDialog] Portrait generation polling cancelled for'
export const CHARACTER_DIALOG_LOG_VARIANT_SAVED = '[CharacterDialog] Variant saved, updating URL to:'

export const CHARACTER_DIALOG_ERROR_NO_HANDLE = 'No handleId returned:'
export const CHARACTER_DIALOG_ERROR_PORTRAIT_FAILED = 'Portrait generation failed:'
export const CHARACTER_DIALOG_ERROR_GENERATE_PORTRAIT = 'Failed to generate portrait:'
export const CHARACTER_DIALOG_ERROR_GENERATE_METRICS = 'Failed to generate metrics:'
export const CHARACTER_DIALOG_ERROR_SAVE_VARIANT = 'Failed to save variant to server:'
export const CHARACTER_DIALOG_ERROR_SAVE_CHARACTER = 'Failed to save character:'
export const CHARACTER_DIALOG_TOAST_PORTRAIT_FAILED = 'Portrait generation failed'
export const CHARACTER_DIALOG_TOAST_DESCRIPTION_REQUIRED =
  'Fill in the character description first'
export const CHARACTER_DIALOG_TOAST_METRICS_FAILED = 'Character metrics generation failed'
export const CHARACTER_DIALOG_GENERATE_MISSING = 'Generate missing fields'
export const CHARACTER_DIALOG_ERROR_GENERATE_MISSING = 'Failed to generate missing character fields:'
export const CHARACTER_DIALOG_TOAST_GENERATE_MISSING_FAILED =
  'Could not generate missing character fields'
export const CHARACTER_DIALOG_TOAST_GENERATE_MISSING_NOTHING = 'Nothing to generate'
export const CHARACTER_DIALOG_TOAST_GENERATE_MISSING_NO_PROJECT = 'Open a project first'
export const CHARACTER_DIALOG_TOAST_GENERATE_MISSING_BUSY =
  'Writers Room is busy — wait for the current reply, then try again'

export enum CharacterDialogFieldLabel {
  Name = 'Name',
  Gender = 'Gender',
  Role = 'Role',
  Description = 'Description',
  Mbti = 'MBTI',
  Motivation = 'Motivation',
  FatalFlaw = 'Fatal Flaw',
  Secrets = 'Secret',
}

export enum CharacterDialogSelectPlaceholder {
  Role = 'Select Role',
  Gender = 'Select Gender',
  Mbti = 'Select MBTI Type',
}

export enum CharacterDialogMbtiGroup {
  Analysts = 'Analysts',
  Diplomats = 'Diplomats',
  Sentinels = 'Sentinels',
  Explorers = 'Explorers',
}

export enum CharacterDialogMbtiOptionLabel {
  INTJ = 'INTJ - Architect',
  INTP = 'INTP - Logician',
  ENTJ = 'ENTJ - Commander',
  ENTP = 'ENTP - Debater',
  INFJ = 'INFJ - Advocate',
  INFP = 'INFP - Mediator',
  ENFJ = 'ENFJ - Protagonist',
  ENFP = 'ENFP - Campaigner',
  ISTJ = 'ISTJ - Logistician',
  ISFJ = 'ISFJ - Defender',
  ESTJ = 'ESTJ - Executive',
  ESFJ = 'ESFJ - Consul',
  ISTP = 'ISTP - Virtuoso',
  ISFP = 'ISFP - Adventurer',
  ESTP = 'ESTP - Entrepreneur',
  ESFP = 'ESFP - Entertainer',
}

export enum CharacterDialogGenerateMissingDisable {
  FillPrefix = 'Fill ',
  FillSuffix = ' to enable generate',
  AllFilled = 'All fields are already filled',
  NoProject = 'Open a project first',
  Saving = 'Wait until save finishes',
  Portrait = 'Wait until portrait generation finishes',
  Pending = 'Accept or reject the pending fields',
  Generating = 'Generating missing fields',
  WritersRoomBusy = 'Writers Room is busy',
  WaitingForWritersRoom = 'Waiting for Writers Room',
  Or = ' or ',
}

export enum CharacterDialogGenerateMissingChat {
  Instruction = 'Fill the unsaved character create/edit form. Call propose_character_fields with ONLY the missing fields listed below. Do not call manage_character. Do not call update_world_bible. Do not write worldDescription or any bible section. Do not save. Ground in the series bible and episodes (read_world_bible / list_episodes / list_characters as needed). Never overwrite ALREADY FILLED values.',
  MissingText = 'MISSING TEXT FIELDS',
  MissingMetrics = 'MISSING METRICS',
  Filled = 'ALREADY FILLED (do not change)',
  None = '(none)',
}

export enum CharacterDialogGenerateMissingJoin {
  List = ', ',
  Blocks = '\n\n',
  Lines = '\n',
  Label = ': ',
}

export const CHARACTER_DIALOG_GENERATE_MISSING_FILLED_CHARS = 400

export const CHARACTER_DIALOG_TITLE_EDIT = 'Edit Character'
export const CHARACTER_DIALOG_TITLE_CONVERT = 'Convert to Cast'
export const CHARACTER_DIALOG_TITLE_CREATE = 'Create New Character'

export const CHARACTER_DIALOG_SUBMIT_SAVE = 'Save Changes'
export const CHARACTER_DIALOG_SUBMIT_CONVERT = 'Convert to Cast'
export const CHARACTER_DIALOG_SUBMIT_CREATE = 'Create Character'

export const CHARACTER_DIALOG_FIELD_BORDER_INVALID =
  'border-destructive focus:ring-2 focus:ring-destructive'
export const CHARACTER_DIALOG_FIELD_BORDER_VALID =
  'border-input focus:ring-2 focus:ring-primary'

export const CHARACTER_DIALOG_PORTRAIT_DATA_URL_PREFIX = 'data:'

export const CHARACTER_DIALOG_PORTRAIT_STATUS_PICK =
  'Hover image & click "Pick Variant" to choose'
export const CHARACTER_DIALOG_PORTRAIT_STATUS_SELECTED = 'Variant selected'
export const CHARACTER_DIALOG_PORTRAIT_STATUS_POWERED_BY = 'Powered by Midjourney'

export enum CharacterDialogMetricsCopy {
  Heading = 'Baseline Psychological Metrics',
  AutoSet = 'Auto-set from Description',
}

export enum CharacterDialogMetricLabel {
  Valence = 'Valence',
  Arousal = 'Arousal',
  PerceivedStakes = 'Perceived Stakes',
  MoralAlignment = 'Moral Alignment',
}

export enum CharacterDialogMetricTitle {
  Valence = 'Emotional tone from very negative to very positive',
  Arousal = 'Energy and activation level',
  PerceivedStakes = 'How much they believe is on the line',
  MoralAlignment = 'Alignment between actions and values',
}

export enum CharacterDialogMetricBoundLabel {
  Negative = 'Negative',
  Positive = 'Positive',
  Lethargic = 'Lethargic',
  Energized = 'Energized',
  Low = 'Low',
  Critical = 'Critical',
  Compromised = 'Compromised',
  Aligned = 'Aligned',
}

export const CHARACTER_DIALOG_VALENCE_SLIDER_OFFSET = 100
export const CHARACTER_DIALOG_VALENCE_SLIDER_MAX = 200
export const CHARACTER_DIALOG_METRIC_SLIDER_MAX = 100
export const CHARACTER_DIALOG_METRIC_SLIDER_STEP = 1
