export const worldKeys = {
  all: ['world'] as const,
  projects: () => [...worldKeys.all, 'projects'] as const,
  project: (projectId: string) => [...worldKeys.projects(), projectId] as const,
  tiles: (projectId: string) => [...worldKeys.project(projectId), 'tiles'] as const,
  assets: (projectId: string) => [...worldKeys.project(projectId), 'assets'] as const,
}
