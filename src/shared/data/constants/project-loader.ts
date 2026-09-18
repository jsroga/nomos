export enum ProjectLoaderLog {
  StartingLoad = '🔄 [DEBUG] useProjectFromUrl: starting load for',
  LoadComplete = '✅ [DEBUG] useProjectFromUrl: load complete. Result:',
  ProjectNotFoundRedirect = '⚠️ [DEBUG] useProjectFromUrl: project not found, redirecting to base path',
  FailedLoadProject = 'Failed to load project:',
}

export enum ProjectLoaderMessage {
  ProjectNotFound = 'Project not found',
  FailedLoadProject = 'Failed to load project',
  NotFoundHint = 'The project you are trying to access does not exist or you do not have permission.',
  FailedLoadHint = 'Could not reach the project. Refresh the page to try again.',
}

export enum ProjectLoaderClass {
  Root = 'relative h-full w-full',
  Children = 'h-full w-full',
  Overlay = 'fixed inset-0 z-[150] flex items-center justify-center bg-background/80 backdrop-blur-sm',
}
