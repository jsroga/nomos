import { WorldQueryKey } from '@/domains/world-building-toolkit/core/io/constants/query-keys'

export const worldKeys = {
  all: [WorldQueryKey.Root] as const,
  projects: () => [...worldKeys.all, WorldQueryKey.Projects] as const,
  project: (projectId: string) => [...worldKeys.projects(), projectId] as const,
  tiles: (projectId: string) => [...worldKeys.project(projectId), WorldQueryKey.Tiles] as const,
  assets: (projectId: string) => [...worldKeys.project(projectId), WorldQueryKey.Assets] as const,
}
