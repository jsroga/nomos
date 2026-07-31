/** UI strings and wire values for the admin model-settings panel (roadmap A1). */

export const MODEL_SETTINGS_API_PATH = '/api/admin/model-settings'
export const MODEL_SETTINGS_PROBE_API_PATH = '/api/admin/model-settings/probe'

/** Sentinel `<option>` value that swaps the select for a free-text OpenRouter id. */
export const MODEL_OPTION_CUSTOM = '__custom__'
export const MODEL_OPTION_UNSET = ''

export enum ModelSettingsCopy {
  Title = 'Model settings',
  Subtitle = 'Pick which model each agent uses. Everything runs on a single OpenRouter key.',
  InheritOption = '— inherit default —',
  CustomOption = 'Custom OpenRouter id…',
  AutoHint = 'Leave unset to inherit the Default slot (or openrouter/auto-beta).',
  CustomPlaceholder = 'provider/model',
  CustomHint = 'Any id OpenRouter serves, e.g. qwen/qwen3-max. Test before saving.',
  LoadError = 'Failed to load model settings.',
  Loading = 'Loading model settings…',
  TestButton = 'Test',
  TestingLabel = 'testing…',
  SaveButton = 'Save',
}

export enum ModelSaveState {
  Idle = 'idle',
  Saving = 'saving',
  Saved = 'saved',
  Error = 'error',
}

export enum ModelTestState {
  Idle = 'idle',
  Testing = 'testing',
  Pass = 'pass',
  Fail = 'fail',
}
