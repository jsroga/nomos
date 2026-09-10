export {
  MODEL_SETTING_DEFAULT_ROLE,
  MODEL_SETTING_ROLES,
  OPENROUTER_MODEL_OPTIONS,
  type ModelSettingRoleDef,
  type OpenRouterModelOption,
} from '../constants/model-settings'
import {
  MODEL_SETTING_ROLES,
  OPENROUTER_MODEL_OPTIONS,
} from '../constants/model-settings'

export const MODEL_SETTING_ROLE_IDS: readonly string[] = MODEL_SETTING_ROLES.map(role => role.role)

export const OPENROUTER_MODEL_OPTION_IDS: readonly string[] = OPENROUTER_MODEL_OPTIONS.map(
  option => option.id
)

const OPENROUTER_MODEL_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*(?:\/[a-zA-Z0-9._:-]+){1,2}$/

export const OPENROUTER_MODEL_ID_MAX_LENGTH = 120

export function isOpenRouterModelId(value: string): boolean {
  const trimmed = value.trim()
  return (
    trimmed.length > 0 &&
    trimmed.length <= OPENROUTER_MODEL_ID_MAX_LENGTH &&
    OPENROUTER_MODEL_ID_PATTERN.test(trimmed)
  )
}
