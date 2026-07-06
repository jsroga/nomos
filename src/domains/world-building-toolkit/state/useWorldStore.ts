import { useMemo } from 'react'
import { create } from 'zustand'
import { useAuthStore } from '@/shared/auth/useAuthStore'
import { worldApi } from '../io/world.api'
import {
  type Asset,
  type Project,
  type Tile,
  tilesToMap,
  toLegacyAsset,
  toLegacyProject,
  toLegacyTile,
} from '../core/world-types'
import {
  useWorldUiStore,
  type PendingFidelity,
  type PendingGeneration,
  type PendingUpscale,
  type SelectBox,
  type WorldUiState,
} from './useWorldUiStore'

export type { Asset, Project, Tile, SelectBox, PendingUpscale, PendingGeneration, PendingFidelity }

interface WorldDataState {
  user: unknown | null
  currentProject: Project | null
  projects: Project[]
  tiles: Record<string, Tile>
  assets: Asset[]
  setUser: (user: unknown | null) => void
  loadProject: (projectId: string) => Promise<void>
  fetchAllProjects: () => Promise<void>
  createProject: (name: string, prompt: string) => Promise<string | null>
  deleteProject: (projectId: string) => Promise<void>
  switchProject: (projectId: string) => Promise<void>
  addTile: (x: number, y: number, prompt: string, imageData: string) => Promise<void>
  removeTile: (x: number, y: number) => Promise<void>
  getTile: (x: number, y: number) => Tile | undefined
  setAssets: (assets: Asset[]) => void
  addAsset: (asset: Asset) => void
  updateAsset: (id: string, updates: Partial<Asset>) => void
  removeAsset: (id: string) => void
  fetchAssets: () => Promise<void>
  setCurrentProject: (project: Project) => void
  acceptUpscale: (x: number, y: number) => Promise<void>
  acceptGeneration: (x: number, y: number, acceptedUrl?: string) => Promise<void>
  acceptFidelity: (x: number, y: number) => Promise<void>
}

export const useWorldDataStore = create<WorldDataState>((set, get) => ({
  user: null,
  currentProject: null,
  projects: [],
  tiles: {},
  assets: [],

  setUser: user => set({ user }),

  loadProject: async (projectId: string) => {
    try {
      const response = await fetch(`/api/storyteller/projects/${projectId}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      })
      if (!response.ok) {
        console.error('API error loading project:', response.statusText)
        return
      }

      const projectData = await response.json()
      const project = toLegacyProject({
        id: projectData.id,
        name: projectData.name,
        userId: projectData.userId ?? projectData.user_id,
        masterPrompt: projectData.masterPrompt ?? projectData.master_prompt ?? '',
        seriesBible: projectData.seriesBible ?? projectData.series_bible ?? {},
        storyPlan: projectData.storyPlan ?? projectData.story_plan ?? {},
        description: projectData.description,
        createdAt: projectData.createdAt ?? projectData.created_at,
      })

      const tiles = await worldApi.tiles.list(projectId)
      set({ currentProject: project, tiles: tilesToMap(tiles) })
    } catch (err) {
      console.error('Failed to load project via API:', err)
    }
  },

  fetchAllProjects: async () => {
    try {
      const projects = await worldApi.projects.list()
      set({ projects: projects.map(toLegacyProject) })
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  },

  createProject: async (name: string, prompt: string) => {
    const { user } = useAuthStore.getState()
    if (!user) return null

    try {
      const created = await worldApi.projects.create({ name, masterPrompt: prompt })
      await get().switchProject(created.id)
      return created.id
    } catch (error) {
      console.error('Error creating project:', error)
      return null
    }
  },

  deleteProject: async (projectId: string) => {
    try {
      await worldApi.projects.delete(projectId)
      set(state => ({
        projects: state.projects.filter(p => p.id !== projectId),
        currentProject: state.currentProject?.id === projectId ? null : state.currentProject,
      }))
    } catch (error) {
      console.error('Error deleting project:', error)
    }
  },

  switchProject: async (projectId: string) => {
    set({ currentProject: null, tiles: {} })
    useWorldUiStore.getState().clearSelection()
    await get().loadProject(projectId)
  },

  addTile: async (x: number, y: number, prompt: string, imageData: string) => {
    const { currentProject } = get()
    if (!currentProject) return

    const filename = `${x}_${y}_${Date.now()}.png`

    const response = await fetch('/api/save-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: currentProject.id,
        filename,
        imageData,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Failed to save image')
    }

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
    const { currentProject, tiles } = get()
    if (!currentProject) return

    const tileKey = `${x},${y}`
    const tile = tiles[tileKey]
    if (!tile) return

    await worldApi.tiles.remove({ projectId: currentProject.id, x, y })

    if (tile.image_filename) {
      try {
        await fetch('/api/delete-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: currentProject.id,
            filename: tile.image_filename,
          }),
        })
      } catch (err) {
        console.warn('Failed to delete image file:', err)
      }
    }

    set(state => {
      const newTiles = { ...state.tiles }
      delete newTiles[tileKey]
      return { tiles: newTiles }
    })
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
    const { currentProject } = get()
    if (!currentProject) return

    try {
      const assets = await worldApi.assets.list(currentProject.id)
      set({ assets: assets.map(toLegacyAsset) })
    } catch (error) {
      console.error('Error fetching assets:', error)
    }
  },
  setCurrentProject: project => set({ currentProject: project }),

  acceptUpscale: async (x, y) => {
    const { currentProject } = get()
    const pending = useWorldUiStore.getState().getPendingUpscale(x, y)
    if (!currentProject || !pending) return

    const tileKey = `${x},${y}`
    const response = await fetch('/api/tiles/accept-upscale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: currentProject.id,
        x,
        y,
        upscaledUrl: pending.upscaledUrl,
      }),
    })

    if (!response.ok) throw new Error('Failed to accept upscale')

    const { filename } = await response.json()
    set(state => ({
      tiles: {
        ...state.tiles,
        [tileKey]: { ...state.tiles[tileKey], image_filename: filename },
      },
    }))
    useWorldUiStore.getState().rejectUpscale(x, y)
  },

  acceptGeneration: async (x, y, acceptedUrl) => {
    const { currentProject } = get()
    const pending = useWorldUiStore.getState().getPendingGeneration(x, y)
    if (!currentProject || !pending) return

    const tileKey = `${x},${y}`
    const imageUrl = acceptedUrl || pending.newUrl

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
    const { currentProject } = get()
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

export function useWorldStore(): WorldState
export function useWorldStore<T>(selector: (state: WorldState) => T): T
export function useWorldStore<T>(selector?: (state: WorldState) => T) {
  const data = useWorldDataStore()
  const ui = useWorldUiStore()
  const combined = useMemo(() => ({ ...data, ...ui }), [data, ui])
  return selector ? selector(combined) : combined
}

useWorldStore.getState = getCombinedState

useWorldStore.setState = (partial: Partial<WorldState>) => {
  const dataKeys = new Set([
    'user',
    'currentProject',
    'projects',
    'tiles',
    'assets',
    'setUser',
    'loadProject',
    'fetchAllProjects',
    'createProject',
    'deleteProject',
    'switchProject',
    'addTile',
    'removeTile',
    'getTile',
    'setAssets',
    'addAsset',
    'updateAsset',
    'removeAsset',
    'fetchAssets',
    'setCurrentProject',
    'acceptUpscale',
    'acceptGeneration',
    'acceptFidelity',
  ])

  const dataPartial: Partial<WorldDataState> = {}
  const uiPartial: Partial<WorldUiState> = {}

  for (const [key, value] of Object.entries(partial)) {
    if (dataKeys.has(key)) {
      ;(dataPartial as Record<string, unknown>)[key] = value
    } else {
      ;(uiPartial as Record<string, unknown>)[key] = value
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
  const unsubData = useWorldDataStore.subscribe(() => {
    listener(getCombinedState(), getCombinedState())
  })
  const unsubUi = useWorldUiStore.subscribe(() => {
    listener(getCombinedState(), getCombinedState())
  })
  return () => {
    unsubData()
    unsubUi()
  }
}
