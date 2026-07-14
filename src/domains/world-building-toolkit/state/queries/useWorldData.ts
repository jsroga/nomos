import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { WorldQueryKey } from '../../io/constants/query-keys'
import { worldApi } from '../../io/world.api'
import { worldKeys } from '../../io/world.keys'
import type { CreateProjectRequest, UpsertTileRequest } from '../../io/world.dto'
import { tilesToMap, toLegacyAsset, toLegacyProject } from '../../core/world-types'

export function useWorldProjects() {
  return useQuery({
    queryKey: worldKeys.projects(),
    queryFn: async () => {
      const projects = await worldApi.projects.list()
      return projects.map(toLegacyProject)
    },
  })
}

export function useWorldTiles(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId
      ? worldKeys.tiles(projectId)
      : [WorldQueryKey.Root, WorldQueryKey.Tiles, WorldQueryKey.None],
    queryFn: async () => {
      if (!projectId) return {}
      const tiles = await worldApi.tiles.list(projectId)
      return tilesToMap(tiles)
    },
    enabled: Boolean(projectId),
  })
}

export function useWorldAssets(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId
      ? worldKeys.assets(projectId)
      : [WorldQueryKey.Root, WorldQueryKey.Assets, WorldQueryKey.None],
    queryFn: async () => {
      if (!projectId) return []
      const assets = await worldApi.assets.list(projectId)
      return assets.map(toLegacyAsset)
    },
    enabled: Boolean(projectId),
  })
}

export function useCreateWorldProjectMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateProjectRequest) => worldApi.projects.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: worldKeys.projects() })
    },
  })
}

export function useUpsertWorldTileMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertTileRequest) => worldApi.tiles.upsert(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: worldKeys.tiles(variables.projectId) })
    },
  })
}

export function useDeleteWorldTileMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { projectId: string; x: number; y: number }) =>
      worldApi.tiles.remove(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: worldKeys.tiles(variables.projectId) })
    },
  })
}
