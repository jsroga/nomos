import { HttpMethod } from '@/shared/data/constants/protocol'
import { BeatImageTriggerStatus } from '@/domains/storyteller/services/constants/beat-image-service'

export { HttpMethod as CharacterDialogHttpMethod, BeatImageTriggerStatus as CharacterDialogTriggerStatus }

export enum CharacterDialogMode {
  Create = 'create',
  Edit = 'edit',
}

export const CHARACTER_DIALOG_NEW_ID = 'new'
export const CHARACTER_DIALOG_DEFAULT_ROLE = 'Supporting'

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
export const CHARACTER_DIALOG_TOAST_METRICS_FAILED = 'Character metrics generation failed'

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
