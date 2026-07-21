/** Project selection page copy and wire values. */

export const PROJECT_SELECTION_SUBTITLES = [
  'Play god. It\'s cheaper than therapy.',
  'Your reality is boring. Make a new one.',
  'Build a world before this one ends.',
  'No one will miss the old timeline.',
  'Architect your own escape.',
  'Simulation theory is real. You are the admin.',
  'Reality is a suggestion. Ignore it.',
  'The void is waiting for your input.',
  'Create something that outlives you.',
  'Sanity is optional here.',
] as const

export const PROJECT_SELECTION_TURBULENT_BG_CANVAS_ID = 'turbulent-bg-canvas'

export const PROJECT_SELECTION_DELETE_TITLE = 'Delete Project'
export const PROJECT_SELECTION_DELETE_DESCRIPTION =
  'Are you sure you want to delete this project? This action cannot be undone.'
export const PROJECT_SELECTION_DELETE_CONFIRM = 'Delete'
export const PROJECT_SELECTION_DELETE_CANCEL = 'Cancel'

export { PROJECT_SELECTOR_BIBLE_QUERY } from '@/components/shell/ProjectSelectorDropdown/constants/project-selector-dropdown'

export enum ProjectSelectionLiquidGlobal {
  Renderer = '__liquidGLRenderer__',
  UploadTexture = '_uploadTexture',
}
