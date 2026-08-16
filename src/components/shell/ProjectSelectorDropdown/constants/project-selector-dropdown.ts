/** ProjectSelectorDropdown copy and route wire constants. */

export enum DefaultWorkspaceModule {
  Storyteller = 'storyteller',
}

export enum AppRouteSegment {
  App = 'app',
}

export const PROJECT_SELECTOR_EMPTY_LABEL = 'Select Project' as const

export const PROJECT_SELECTOR_NO_PROJECTS = 'No projects yet' as const

export const PROJECT_SELECTOR_CREATE_LABEL = 'Create New Project' as const

export const PROJECT_SELECTOR_DIALOG_TITLE = 'Create New Project' as const

export const PROJECT_SELECTOR_NAME_LABEL = 'Project Name' as const

export const PROJECT_SELECTOR_PROMPT_LABEL = 'Master Prompt (Optional)' as const

export const PROJECT_SELECTOR_NAME_PLACEHOLDER = 'My Fantasy World' as const

export const PROJECT_SELECTOR_PROMPT_PLACEHOLDER = 'Describe your world context...' as const

export const PROJECT_SELECTOR_CANCEL_LABEL = 'Cancel' as const

export const PROJECT_SELECTOR_CREATE_BUTTON = 'Create Project' as const

export const PROJECT_SELECTOR_LOAD_ERROR = 'Error loading projects:' as const

export enum ProjectsDbSelect {
  IdName = 'id, name',
}

export enum ProjectsDbOrder {
  CreatedAtDesc = 'created_at',
}
