export function shouldReloadWorkspaceProject(input: {
  projectId: string | undefined
  currentProjectId: string | undefined
  loadedProjectId: string | null
}): boolean {
  if (!input.projectId) return false
  if (input.currentProjectId === input.projectId && input.loadedProjectId === input.projectId) {
    return false
  }
  return true
}

export function isWorkspaceProjectReady(input: {
  urlProjectId: string | undefined
  currentProjectId: string | undefined
  isLoading: boolean
}): boolean {
  if (!input.urlProjectId) return false
  if (input.isLoading) return false
  return input.currentProjectId === input.urlProjectId
}

export function isProjectLoaderBlocking(input: {
  isLoading: boolean
  urlProjectId: string | undefined
  currentProjectId: string | undefined
}): boolean {
  return !isWorkspaceProjectReady({
    urlProjectId: input.urlProjectId,
    currentProjectId: input.currentProjectId,
    isLoading: input.isLoading,
  })
}
