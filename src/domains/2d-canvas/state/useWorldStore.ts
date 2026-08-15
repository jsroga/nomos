import { create } from 'zustand'
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/with-selector'
import { useWorkspaceProjectStore } from '@/shared/workspace/workspace-project-store'
import { worldApi } from '../core/io/world.api'
import {
  acceptTileUpscale,
  deleteProjectImage,
  saveProjectImage,
} from '../core/io/world-data.api'
import {
  type Asset,
  type Project,
  type Tile,
  tilesToMap,
  toLegacyAsset,
  toLegacyTile,
} from '../core/world-types'
import {
  WorldDataStoreLog,
  WORLD_DATA_STORE_KEYS,
} from './constants/world-data-store'
import {
  useWorldUiStore,
  type PendingFidelity,
  type PendingGeneration,
  type PendingUpscale,
  type SelectBox,
  type WorldUiState,
} from './useWorldUiStore'
import { omitRecordKey } from './utils/omit-record-key'
import { persistFirstTileStyleAnchor } from './utils/persist-style-anchor'

export type { Asset, Project, Tile, SelectBox, PendingUpscale, PendingGeneration, PendingFidelity }

function getCurrentProject(): Project | null {
  return useWorkspaceProjectStore.getState().currentProject
}

interface WorldDataState {
  tiles: Record<string, Tile>
  assets: Asset[]
  loadTilesForProject: (projectId: string) => Promise<void>
  clearTiles: () => void
  addTile: (x: number, y: number, prompt: string, imageData: string) => Promise<void>
  removeTile: (x: number, y: number) => Promise<void>
  getTile: (x: number, y: number) => Tile | undefined
  setAssets: (assets: Asset[]) => void
  addAsset: (asset: Asset) => void
  updateAsset: (id: string, updates: Partial<Asset>) => void
  removeAsset: (id: string) => void
  fetchAssets: () => Promise<void>
  acceptUpscale: (x: number, y: number) => Promise<void>
  acceptGeneration: (x: number, y: number, acceptedUrl?: string) => Promise<void>
  acceptFidelity: (x: number, y: number) => Promise<void>
}

export const useWorldDataStore = create<WorldDataState>((set, get) => ({
  tiles: {},
  assets: [],

  loadTilesForProject: async (projectId: string) => {
    try {
      const tiles = await worldApi.tiles.list(projectId)
      set({ tiles: tilesToMap(tiles) })
    } catch (err) {
      console.error(WorldDataStoreLog.FailedToLoadProjectViaApi, err)
    }
  },

  clearTiles: () => {
    set({ tiles: {}, assets: [] })
    useWorldUiStore.getState().clearSelection()
  },

  addTile: async (x: number, y: number, prompt: string, imageData: string) => {
    const currentProject = getCurrentProject()
    if (!currentProject) return

    const filename = `${x}_${y}_${Date.now()}.png`

    await saveProjectImage({
      projectId: currentProject.id,
      filename,
      imageData,
    })

    const tile = await worldApi.tiles.upsert({
      projectId: currentProject.id,
      x,
      y,
      tilePrompt: prompt,
      imageFilename: filename,
    })

    set(state => ({
      tiles: { ...state.tiles, [`${x},${y}`]: toLegacyTile(tile) },
    }))
  },

  removeTile: async (x: number, y: number) => {
    const currentProject = getCurrentProject()
    const { tiles } = get()
    if (!currentProject) return

    const tileKey = `${x},${y}`
    const tile = tiles[tileKey]
    if (!tile) return

    await worldApi.tiles.remove({ projectId: currentProject.id, x, y })

    if (tile.image_filename) {
      try {
        await deleteProjectImage({
          projectId: currentProject.id,
          filename: tile.image_filename,
        })
      } catch (err) {
        console.warn(WorldDataStoreLog.FailedToDeleteImageFile, err)
      }
    }

    set(state => ({
      tiles: omitRecordKey(state.tiles, tileKey),
    }))
    useWorldUiStore.getState().clearSelection()
  },

  getTile: (x, y) => get().tiles[`${x},${y}`],

  setAssets: assets => set({ assets }),
  addAsset: asset => set(state => ({ assets: [asset, ...state.assets] })),
  updateAsset: (id, updates) =>
    set(state => ({
      assets: state.assets.map(a => (a.id === id ? { ...a, ...updates } : a)),
    })),
  removeAsset: id => {
    set(state => ({
      assets: state.assets.filter(a => a.id !== id),
    }))
    if (useWorldUiStore.getState().previewAssetId === id) {
      useWorldUiStore.getState().setPreviewAssetId(null)
    }
  },
  fetchAssets: async () => {
    const currentProject = getCurrentProject()
    if (!currentProject) return

    try {
      const assets = await worldApi.assets.list(currentProject.id)
      set({ assets: assets.map(toLegacyAsset) })
    } catch (error) {
      console.error(WorldDataStoreLog.ErrorFetchingAssets, error)
    }
  },

  acceptUpscale: async (x, y) => {
    const currentProject = getCurrentProject()
    const pending = useWorldUiStore.getState().getPendingUpscale(x, y)
    if (!currentProject || !pending) return

    const tileKey = `${x},${y}`
    const { filename } = await acceptTileUpscale({
      projectId: currentProject.id,
      x,
      y,
      upscaledUrl: pending.upscaledUrl,
    })
    set(state => ({
      tiles: {
        ...state.tiles,
        [tileKey]: { ...state.tiles[tileKey], image_filename: filename },
      },
    }))
    useWorldUiStore.getState().rejectUpscale(x, y)
  },

  acceptGeneration: async (x, y, acceptedUrl) => {
    const currentProject = getCurrentProject()
    const pending = useWorldUiStore.getState().getPendingGeneration(x, y)
    if (!currentProject || !pending) return

    const tileKey = `${x},${y}`
    const imageUrl = acceptedUrl || pending.newUrl

    await persistFirstTileStyleAnchor(pending.isFirstTile, imageUrl)

    const tile = await worldApi.tiles.upsert({
      projectId: currentProject.id,
      x,
      y,
      tilePrompt: '',
      imageFilename: imageUrl,
    })

    set(state => ({
      tiles: {
        ...state.tiles,
        [tileKey]: toLegacyTile(tile),
      },
    }))
    useWorldUiStore.getState().rejectGeneration(x, y)
  },

  acceptFidelity: async (x, y) => {
    const currentProject = getCurrentProject()
    const pending = useWorldUiStore.getState().getPendingFidelity(x, y)
    if (!currentProject || !pending) return

    const tileKey = `${x},${y}`
    const imageUrl = pending.newUrl

    const tile = await worldApi.tiles.upsert({
      projectId: currentProject.id,
      x,
      y,
      tilePrompt: get().tiles[tileKey]?.tile_prompt ?? '',
      imageFilename: imageUrl,
    })

    set(state => ({
      tiles: {
        ...state.tiles,
        [tileKey]: toLegacyTile(tile),
      },
    }))
    useWorldUiStore.getState().rejectFidelity(x, y)
  },
}))

export type WorldState = WorldDataState & WorldUiState

function getCombinedState(): WorldState {
  return {
    ...useWorldDataStore.getState(),
    ...useWorldUiStore.getState(),
  }
}

function subscribeWorldStore(onStoreChange: () => void) {
  const unsubData = useWorldDataStore.subscribe(onStoreChange)
  const unsubUi = useWorldUiStore.subscribe(onStoreChange)
  return () => {
    unsubData()
    unsubUi()
  }
}

function selectFullWorldState(state: WorldState): WorldState {
  return state
}

/**
 * Combined world data + UI store. Selectors must be used — bare
 * `useWorldDataStore()` / `useWorldUiStore()` subscriptions were causing
 * every consumer to re-render on any field change (pan, poll, progress).
 */
export function useWorldStore(): WorldState
export function useWorldStore<T>(selector: (state: WorldState) => T): T
export function useWorldStore<T>(selector?: (state: WorldState) => T): T | WorldState {
  return useSyncExternalStoreWithSelector(
    subscribeWorldStore,
    getCombinedState,
    getCombinedState,
    selector ?? selectFullWorldState,
    Object.is
  )
}

useWorldStore.getState = getCombinedState

useWorldStore.setState = (partial: Partial<WorldState>) => {
  const dataKeys = new Set<string>(WORLD_DATA_STORE_KEYS)

  const dataPartial: Partial<WorldDataState> = {}
  const uiPartial: Partial<WorldUiState> = {}

  for (const [key, value] of Object.entries(partial)) {
    if (dataKeys.has(key)) {
      Object.assign(dataPartial, { [key]: value })
    } else {
      Object.assign(uiPartial, { [key]: value })
    }
  }

  if (Object.keys(dataPartial).length > 0) {
    useWorldDataStore.setState(dataPartial)
  }
  if (Object.keys(uiPartial).length > 0) {
    useWorldUiStore.setState(uiPartial)
  }
}

useWorldStore.subscribe = (listener: (state: WorldState, prevState: WorldState) => void) => {
  let prev = getCombinedState()
  return subscribeWorldStore(() => {
    const next = getCombinedState()
    const previous = prev
    prev = next
    listener(next, previous)
  })
}
