export enum ProjectLoaderLog {
  StartingLoad = '🔄 [DEBUG] useProjectFromUrl: starting load for',
  LoadComplete = '✅ [DEBUG] useProjectFromUrl: load complete. Result:',
  ProjectNotFoundRedirect = '⚠️ [DEBUG] useProjectFromUrl: project not found, redirecting to base path',
  FailedLoadProject = 'Failed to load project:',
}

export enum ProjectLoaderMessage {
  ProjectNotFound = 'Project not found',
  FailedLoadProject = 'Failed to load project',
}
