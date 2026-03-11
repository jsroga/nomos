import { create } from 'zustand'
import { getSupabaseClient } from '@/infrastructure/storage/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import type { SelectResult } from '@/domains/world-building-toolkit/services/SelectModeService'
import { Database } from '@/infrastructure/storage/database.types'
import { JobStatus, JobType } from '@/types/enums'
import { useGlobalStatusStore } from '@/store/useGlobalStatusStore'

export type SelectBox = { x1: number; y1: number; x2: number; y2: number }

export interface PendingUpscale {
  upscaledUrl: string
  originalUrl: string
  timestamp: number
}

export interface PendingGeneration {
  newUrl: string
  variantUrls?: string[]
  newBase64?: string // Deprecated: use newUrl instead, kept for backwards compatibility
  originalUrl?: string // undefined for first tile
  isFirstTile: boolean
  timestamp: number
}

export interface PendingFidelity {
  newUrl: string
  newBase64?: string // Deprecated: use newUrl instead, kept for backwards compatibility
  originalUrl: string
  timestamp: number
}

export interface Asset {
  id: string
  project_id: string
  image_filename: string
  model_filename?: string
  created_at: string
  metadata: {
    bounds?: { x: number; y: number; width: number; height: number }
    box?: SelectBox
  }
}

export type Project = Database['public']['Tables']['projects']['Row']
export type Tile = Database['public']['Tables']['tiles']['Row']

interface Job {
  id: string
  type: JobType
  status: JobStatus
  startTime: number
  metadata?: any
}

interface WorldState {
  // Auth
  user: any | null // Session user

  currentProject: Project | null
  projects: Project[]
  tiles: Record<string, Tile> // Key: "x,y"
  viewport: { x: number; y: number; scale: number }
  selectedTile: { x: number; y: number } | null
  selectedTiles: Array<{ x: number; y: number }>

  // Jobs (Replacing old boolean flags)
  jobs: Record<string, Job> // Key: Job ID or Tile ID for convenience

  // Tile operation flags (for UI feedback)
  generatingTiles: Record<string, boolean>
  upscalingTiles: Record<string, boolean>
  repaintingTiles: Record<string, boolean>
  enhancingTiles: Record<string, boolean>
  failedTiles: Record<string, string> // Key: "x,y", Value: error message

  // Per-tile generation progress (shown as overlay on the tile)
  tileProgress: Record<string, { progress: number; stage: string }> // Key: "x,y"

  // Repaint State
  isRepaintMode: boolean
  brushSize: number
  repaintStrokes: Array<{ x: number; y: number; radius?: number }>
  repaintResult: {
    imageUrl: string
    bounds: { x: number; y: number; width: number; height: number }
  } | null
  repaintPrompt: string
  debugInfo: { image: string; mask: string } | null
  generationDebugInfo: {
    neighbors: {
      up?: string
      down?: string
      left?: string
      right?: string
      topLeft?: string
      topRight?: string
      bottomLeft?: string
      bottomRight?: string
    }
    prompt: string
    assembledContext?: string
    canonicalContext?: string
    contextVariant?: 'canonicalFullContext' | 'smartSeamContext'
    contextStrategy?: 'balanced' | 'horizontal_priority' | 'vertical_priority'
    weightedNeighbors?: Array<'up' | 'down' | 'left' | 'right'>
    provider?: string
  } | null

  // Select Mode State
  isSelectMode: boolean
  selectBox: SelectBox | null
  isDrawingBox: boolean
  selectTextPrompt: string
  selectedMask: SelectResult | null
  isSegmenting: boolean
  selectDebugInfo: {
    contextImage?: string
    box?: SelectBox
    apiResponse?: any
  } | null

  // Assets State
  assets: Asset[]
  previewAssetId: string | null
  showAllAssetMasks: boolean

  // Pending Upscales State
  pendingUpscales: Record<string, PendingUpscale> // Key: "x,y"
  pendingGenerations: Record<string, PendingGeneration> // Key: "x,y"
  pendingFidelity: Record<string, PendingFidelity> // Key: "x,y"

  // Actions
  setUser: (user: any) => void
  loadProject: (projectId: string) => Promise<void>
  fetchAllProjects: () => Promise<void>
  createProject: (name: string, prompt: string) => Promise<string | null>
  deleteProject: (projectId: string) => Promise<void>
  switchProject: (projectId: string) => Promise<void>
  addTile: (x: number, y: number, prompt: string, imageData: string) => Promise<void>
  removeTile: (x: number, y: number) => Promise<void>
  setViewport: (viewport: { x: number; y: number; scale: number }) => void
  setSelectedTile: (tile: { x: number; y: number } | null) => void
  toggleTileSelection: (tile: { x: number; y: number }) => void
  clearSelection: () => void

  // Job Actions
  addJob: (id: string, type: JobType, metadata?: any) => void
  updateJobStatus: (id: string, status: JobStatus) => void
  removeJob: (id: string) => void

  // Tile operation flags
  addGeneratingTile: (x: number, y: number) => void
  removeGeneratingTile: (x: number, y: number) => void
  addUpscalingTile: (x: number, y: number) => void
  removeUpscalingTile: (x: number, y: number) => void
  addRepaintingTile: (x: number, y: number) => void
  removeRepaintingTile: (x: number, y: number) => void
  addEnhancingTile: (x: number, y: number) => void
  removeEnhancingTile: (x: number, y: number) => void
  setTileError: (x: number, y: number, message: string) => void
  clearTileError: (x: number, y: number) => void
  setTileProgress: (x: number, y: number, progress: number, stage: string) => void
  clearTileProgress: (x: number, y: number) => void

  getTile: (x: number, y: number) => Tile | undefined

  // Repaint Actions
  setRepaintMode: (isRepaintMode: boolean) => void
  setBrushSize: (size: number) => void
  addRepaintStroke: (point: { x: number; y: number; radius?: number }) => void
  clearRepaintStrokes: () => void
  setRepaintResult: (
    result: {
      imageUrl: string
      bounds: { x: number; y: number; width: number; height: number }
    } | null
  ) => void
  setRepaintPrompt: (prompt: string) => void
  setDebugInfo: (info: { image: string; mask: string } | null) => void
  setGenerationDebugInfo: (info: any) => void

  // Select Mode Actions
  setSelectMode: (isSelectMode: boolean) => void
  setSelectBox: (box: SelectBox | null) => void
  setDrawingBox: (isDrawing: boolean) => void
  setSelectTextPrompt: (prompt: string) => void
  clearSelectBox: () => void
  setSelectedMask: (mask: SelectResult | null) => void
  setSegmenting: (isSegmenting: boolean) => void
  setSelectDebugInfo: (info: any) => void

  // Assets Actions
  setAssets: (assets: Asset[]) => void
  addAsset: (asset: Asset) => void
  updateAsset: (id: string, updates: Partial<Asset>) => void
  removeAsset: (id: string) => void
  setPreviewAssetId: (id: string | null) => void
  setShowAllAssetMasks: (show: boolean) => void
  fetchAssets: () => Promise<void>
  setCurrentProject: (project: Project) => void

  // Pending Upscale Actions
  setPendingUpscale: (x: number, y: number, upscaledUrl: string, originalUrl: string) => void
  acceptUpscale: (x: number, y: number) => Promise<void>
  rejectUpscale: (x: number, y: number) => void
  getPendingUpscale: (x: number, y: number) => PendingUpscale | undefined

  // Pending Generation Actions
  setPendingGeneration: (x: number, y: number, data: Omit<PendingGeneration, 'timestamp'>) => void
  acceptGeneration: (x: number, y: number, acceptedUrl?: string) => Promise<void>
  rejectGeneration: (x: number, y: number) => void
  getPendingGeneration: (x: number, y: number) => PendingGeneration | undefined

  // Pending Fidelity Actions
  setPendingFidelity: (x: number, y: number, data: Omit<PendingFidelity, 'timestamp'>) => void
  acceptFidelity: (x: number, y: number) => Promise<void>
  rejectFidelity: (x: number, y: number) => void
  getPendingFidelity: (x: number, y: number) => PendingFidelity | undefined
}

export const useWorldStore = create<WorldState>((set, get) => ({
  user: null,
  currentProject: null,
  projects: [],
  setCurrentProject: project => set({ currentProject: project }),
  tiles: {},
  viewport: { x: -256, y: -256, scale: 1 },
  selectedTile: null,
  selectedTiles: [],

  jobs: {},

  generatingTiles: {},
  upscalingTiles: {},
  repaintingTiles: {},
  enhancingTiles: {},
  tileProgress: {},
  failedTiles: {},
  isRepaintMode: false,
  brushSize: 50,
  repaintStrokes: [],
  repaintResult: null,
  repaintPrompt: '',
  debugInfo: null,
  generationDebugInfo: null,

  // Select Mode Initial State
  isSelectMode: false,
  selectBox: null,
  isDrawingBox: false,
  selectTextPrompt: '',
  selectedMask: null,
  isSegmenting: false,
  selectDebugInfo: null,

  // Assets Initial State
  assets: [],
  previewAssetId: null,
  showAllAssetMasks: false,

  // Pending Upscales Initial State
  pendingUpscales: {},
  pendingGenerations: {},
  pendingFidelity: {},

  setUser: user => set({ user }),

  loadProject: async (projectId: string) => {
    try {
      // Use API route instead of direct Supabase to allow backend auth bypass (x-bypass-auth)
      // cache: 'no-store' ensures we always get fresh data from the server (fixes stale data after refresh)
      const response = await fetch(`/api/storyteller/projects/${projectId}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      })
      if (!response.ok) {
        console.error('API error loading project:', response.statusText)
        // Fallback or handle error
        return
      }

      const projectData = await response.json()

      // Map API response to store state (handling snake/camel case)
      const project = {
        ...projectData,
        master_prompt: projectData.masterPrompt || projectData.master_prompt || '',
        series_bible: projectData.seriesBible || projectData.series_bible || {},
        story_plan: projectData.storyPlan || projectData.story_plan || {},
      }

      // Fetch tiles separately (this might still need RLS bypass if we want full E2E,
      // but for World Bible heading, project record is enough)
      const supabase = getSupabaseClient()
      const { data: tiles, error: tilesError } = await supabase
        .from('tiles')
        .select('*')
        .eq('project_id', projectId)

      const tileMap: Record<string, Tile> = {}
      tiles?.forEach(tile => {
        tileMap[`${tile.x},${tile.y}`] = tile
      })

      set({ currentProject: project, tiles: tileMap })
    } catch (err) {
      console.error('Failed to load project via API:', err)
    }
  },

  fetchAllProjects: async () => {
    const supabase = getSupabaseClient()
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching projects:', error)
      return
    }

    set({ projects: projects || [] })
  },

  createProject: async (name: string, prompt: string) => {
    const { user } = useAuthStore.getState()
    if (!user) return null

    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name,
        master_prompt: prompt,
        user_id: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating project:', error)
      return null
    }

    if (data) {
      await get().switchProject(data.id)
      return data.id
    }
    return null
  },

  deleteProject: async (projectId: string) => {
    const supabase = getSupabaseClient()
    const { error } = await supabase.from('projects').delete().eq('id', projectId)

    if (error) {
      console.error('Error deleting project:', error)
      return
    }

    set(state => ({
      projects: state.projects.filter(p => p.id !== projectId),
      currentProject: state.currentProject?.id === projectId ? null : state.currentProject,
    }))
  },

  switchProject: async (projectId: string) => {
    set({ currentProject: null, tiles: {}, selectedTile: null })
    await get().loadProject(projectId)
  },

  addTile: async (x: number, y: number, prompt: string, imageData: string) => {
    const { currentProject } = get()
    if (!currentProject) return

    const filename = `${x}_${y}_${Date.now()}.png`

    // Save image to disk via API route
    try {
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
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save image')
      }
    } catch (err) {
      console.error('Failed to save image:', err)
      throw err
    }

    // Save tile record to database
    const supabase = getSupabaseClient()
    const { data: tile, error } = await supabase
      .from('tiles')
      .upsert(
        {
          project_id: currentProject.id,
          x,
          y,
          tile_prompt: prompt,
          image_filename: filename,
        },
        {
          onConflict: 'project_id,x,y',
        }
      )
      .select()
      .single()

    if (error) {
      console.error('Failed to save tile to database:', error)
      throw error
    }

    if (tile) {
      set(state => ({
        tiles: { ...state.tiles, [`${x},${y}`]: tile },
      }))
    }
  },

  removeTile: async (x: number, y: number) => {
    const { currentProject, tiles } = get()
    if (!currentProject) return

    const tileKey = `${x},${y}`
    const tile = tiles[tileKey]
    if (!tile) return

    // Delete from database
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('tiles')
      .delete()
      .eq('project_id', currentProject.id)
      .eq('x', x)
      .eq('y', y)

    if (error) {
      console.error('Failed to delete tile from database:', error)
      throw error
    }

    // Delete image file via API
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
        // Continue anyway - DB record is already deleted
      }
    }

    // Remove from local state
    set(state => {
      const newTiles = { ...state.tiles }
      delete newTiles[tileKey]
      return { tiles: newTiles, selectedTile: null, selectedTiles: [] }
    })
  },

  setViewport: viewport => set({ viewport }),
  setSelectedTile: selectedTile =>
    set({ selectedTile, selectedTiles: selectedTile ? [selectedTile] : [] }),
  toggleTileSelection: tile => {
    const { selectedTiles } = get()
    const exists = selectedTiles.some(t => t.x === tile.x && t.y === tile.y)
    if (exists) {
      set({ selectedTiles: selectedTiles.filter(t => !(t.x === tile.x && t.y === tile.y)) })
    } else {
      set({ selectedTiles: [...selectedTiles, tile] })
    }
  },
  clearSelection: () => set({ selectedTiles: [], selectedTile: null }),

  // Job Management
  addJob: (id, type, metadata) =>
    set(state => ({
      jobs: {
        ...state.jobs,
        [id]: { id, type, status: JobStatus.Pending, startTime: Date.now(), metadata },
      },
    })),
  updateJobStatus: (id, status) =>
    set(state => {
      if (!state.jobs[id]) return {}
      return {
        jobs: {
          ...state.jobs,
          [id]: { ...state.jobs[id], status },
        },
      }
    }),
  removeJob: id =>
    set(state => {
      const newJobs = { ...state.jobs }
      delete newJobs[id]
      return { jobs: newJobs }
    }),

  // Tile operation flag actions
  addGeneratingTile: (x, y) => {
    // Note: Global status operation is managed by TileGenerationService for better detail
    const key = `${x},${y}`
    set(state => {
      const failedTiles = { ...state.failedTiles }
      delete failedTiles[key]
      return { generatingTiles: { ...state.generatingTiles, [key]: true }, failedTiles }
    })
  },
  removeGeneratingTile: (x, y) => {
    // Note: Global status operation is managed by TileGenerationService
    set(state => {
      const newTiles = { ...state.generatingTiles }
      delete newTiles[`${x},${y}`]
      return { generatingTiles: newTiles }
    })
  },
  addUpscalingTile: (x, y) => {
    // Note: Global status operation is managed by UpscaleService for better detail
    const key = `${x},${y}`
    set(state => {
      const failedTiles = { ...state.failedTiles }
      delete failedTiles[key]
      return { upscalingTiles: { ...state.upscalingTiles, [key]: true }, failedTiles }
    })
  },
  removeUpscalingTile: (x, y) => {
    // Note: Global status operation is managed by UpscaleService
    set(state => {
      const newTiles = { ...state.upscalingTiles }
      delete newTiles[`${x},${y}`]
      return { upscalingTiles: newTiles }
    })
  },
  addRepaintingTile: (x, y) => {
    useGlobalStatusStore.getState().addOperation({
      id: `rep-${x},${y}`,
      type: 'world-gen',
      label: 'Repainting',
      details: `(${x}, ${y})`,
      status: 'in-progress',
    })
    const key = `${x},${y}`
    set(state => {
      const failedTiles = { ...state.failedTiles }
      delete failedTiles[key]
      return { repaintingTiles: { ...state.repaintingTiles, [key]: true }, failedTiles }
    })
  },
  removeRepaintingTile: (x, y) => {
    useGlobalStatusStore.getState().removeOperation(`rep-${x},${y}`)
    set(state => {
      const newTiles = { ...state.repaintingTiles }
      delete newTiles[`${x},${y}`]
      return { repaintingTiles: newTiles }
    })
  },
  addEnhancingTile: (x, y) => {
    // Note: Global status operation is managed by FidelityService for better detail
    const key = `${x},${y}`
    set(state => {
      const failedTiles = { ...state.failedTiles }
      delete failedTiles[key]
      return { enhancingTiles: { ...state.enhancingTiles, [key]: true }, failedTiles }
    })
  },
  removeEnhancingTile: (x, y) => {
    // Note: Global status operation is managed by FidelityService
    set(state => {
      const newTiles = { ...state.enhancingTiles }
      delete newTiles[`${x},${y}`]
      return { enhancingTiles: newTiles }
    })
  },
  setTileError: (x, y, message) => {
    set(state => ({
      failedTiles: { ...state.failedTiles, [`${x},${y}`]: message },
    }))
  },
  clearTileError: (x, y) => {
    set(state => {
      const failedTiles = { ...state.failedTiles }
      delete failedTiles[`${x},${y}`]
      return { failedTiles }
    })
  },

  setTileProgress: (x, y, progress, stage) => {
    set(state => ({
      tileProgress: { ...state.tileProgress, [`${x},${y}`]: { progress, stage } },
    }))
  },

  clearTileProgress: (x, y) => {
    set(state => {
      const tileProgress = { ...state.tileProgress }
      delete tileProgress[`${x},${y}`]
      return { tileProgress }
    })
  },

  getTile: (x, y) => get().tiles[`${x},${y}`],

  setRepaintMode: isRepaintMode => set({ isRepaintMode }),
  setBrushSize: brushSize => set({ brushSize }),
  addRepaintStroke: point => set(state => ({ repaintStrokes: [...state.repaintStrokes, point] })),
  clearRepaintStrokes: () => set({ repaintStrokes: [] }),
  setRepaintResult: repaintResult => set({ repaintResult }),
  setRepaintPrompt: repaintPrompt => set({ repaintPrompt }),
  setDebugInfo: debugInfo => set({ debugInfo }),
  setGenerationDebugInfo: generationDebugInfo => set({ generationDebugInfo }),

  setSelectMode: isSelectMode => set({ isSelectMode }),
  setSelectBox: selectBox => set({ selectBox }),
  setDrawingBox: isDrawingBox => set({ isDrawingBox }),
  setSelectTextPrompt: selectTextPrompt => set({ selectTextPrompt }),
  clearSelectBox: () => set({ selectBox: null, selectedMask: null, selectDebugInfo: null }),
  setSelectedMask: selectedMask => set({ selectedMask }),
  setSegmenting: isSegmenting => set({ isSegmenting }),
  setSelectDebugInfo: selectDebugInfo => set({ selectDebugInfo }),

  setAssets: assets => set({ assets }),
  addAsset: asset => set(state => ({ assets: [asset, ...state.assets] })),
  updateAsset: (id, updates) =>
    set(state => ({
      assets: state.assets.map(a => (a.id === id ? { ...a, ...updates } : a)),
    })),
  removeAsset: id =>
    set(state => ({
      assets: state.assets.filter(a => a.id !== id),
      previewAssetId: state.previewAssetId === id ? null : state.previewAssetId,
    })),
  setPreviewAssetId: previewAssetId => set({ previewAssetId }),
  setShowAllAssetMasks: showAllAssetMasks => set({ showAllAssetMasks }),
  fetchAssets: async () => {
    const { currentProject } = get()
    if (!currentProject) return

    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('project_id', currentProject.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      set({ assets: data })
    }
  },

  // Pending Upscale Actions
  setPendingUpscale: (x, y, upscaledUrl, originalUrl) =>
    set(state => ({
      pendingUpscales: {
        ...state.pendingUpscales,
        [`${x},${y}`]: { upscaledUrl, originalUrl, timestamp: Date.now() },
      },
    })),

  acceptUpscale: async (x, y) => {
    const { currentProject, pendingUpscales } = get()
    if (!currentProject) return

    const tileKey = `${x},${y}`
    const pending = pendingUpscales[tileKey]
    if (!pending) return

    try {
      // Call API to download and save upscaled image
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

      if (!response.ok) {
        throw new Error('Failed to accept upscale')
      }

      const { filename } = await response.json()

      // Update tile in local state
      set(state => ({
        tiles: {
          ...state.tiles,
          [tileKey]: {
            ...state.tiles[tileKey],
            image_filename: filename,
          },
        },
        pendingUpscales: (() => {
          const newPending = { ...state.pendingUpscales }
          delete newPending[tileKey]
          return newPending
        })(),
      }))
    } catch (error) {
      console.error('Error accepting upscale:', error)
      throw error
    }
  },

  rejectUpscale: (x, y) => {
    set(state => {
      const newPending = { ...state.pendingUpscales }
      delete newPending[`${x},${y}`]
      return { pendingUpscales: newPending }
    })
  },

  getPendingUpscale: (x, y) => get().pendingUpscales[`${x},${y}`],

  // Pending Generation Actions
  setPendingGeneration: (x, y, data) =>
    set(state => ({
      pendingGenerations: {
        ...state.pendingGenerations,
        [`${x},${y}`]: { ...data, timestamp: Date.now() },
      },
    })),

  acceptGeneration: async (x, y, acceptedUrl) => {
    const { currentProject, pendingGenerations } = get()
    if (!currentProject) return

    const tileKey = `${x},${y}`
    const pending = pendingGenerations[tileKey]
    if (!pending) return

    try {
      // Use the Vercel Blob URL directly instead of re-saving base64
      // The image is already stored in Vercel Blob (pending.newUrl)
      const imageUrl = acceptedUrl || pending.newUrl

      // Upsert tile in database with the Blob URL
      const supabase = (await import('@/infrastructure/storage/supabaseClient')).getSupabaseClient()
      const { data: tile } = await supabase
        .from('tiles')
        .upsert(
          {
            project_id: currentProject.id,
            x,
            y,
            tile_prompt: '', // Will be updated by service if needed
            image_filename: imageUrl, // Store the full Blob URL
          },
          { onConflict: 'project_id,x,y' }
        )
        .select()
        .single()

      // Update local state
      set(state => ({
        tiles: {
          ...state.tiles,
          [tileKey]: tile || { ...state.tiles[tileKey], image_filename: imageUrl },
        },
        pendingGenerations: (() => {
          const newPending = { ...state.pendingGenerations }
          delete newPending[tileKey]
          return newPending
        })(),
      }))
    } catch (error) {
      console.error('Error accepting generation:', error)
      throw error
    }
  },

  rejectGeneration: (x, y) => {
    set(state => {
      const newPending = { ...state.pendingGenerations }
      delete newPending[`${x},${y}`]
      return { pendingGenerations: newPending }
    })
  },

  getPendingGeneration: (x, y) => get().pendingGenerations[`${x},${y}`],

  // Pending Fidelity Actions
  setPendingFidelity: (x, y, data) =>
    set(state => ({
      pendingFidelity: {
        ...state.pendingFidelity,
        [`${x},${y}`]: { ...data, timestamp: Date.now() },
      },
    })),

  acceptFidelity: async (x, y) => {
    const { currentProject, pendingFidelity } = get()
    if (!currentProject) return

    const tileKey = `${x},${y}`
    const pending = pendingFidelity[tileKey]
    if (!pending) return

    try {
      // Save the enhanced image
      // Use the Vercel Blob URL directly instead of re-saving base64
      const imageUrl = pending.newUrl

      // Update tile in database with the Blob URL
      const supabase = (await import('@/infrastructure/storage/supabaseClient')).getSupabaseClient()
      await supabase
        .from('tiles')
        .update({ image_filename: imageUrl })
        .eq('project_id', currentProject.id)
        .eq('x', x)
        .eq('y', y)

      // Update local state
      set(state => ({
        tiles: {
          ...state.tiles,
          [tileKey]: {
            ...state.tiles[tileKey],
            image_filename: imageUrl,
          },
        },
        pendingFidelity: (() => {
          const newPending = { ...state.pendingFidelity }
          delete newPending[tileKey]
          return newPending
        })(),
      }))
    } catch (error) {
      console.error('Error accepting fidelity:', error)
      throw error
    }
  },

  rejectFidelity: (x, y) => {
    set(state => {
      const newPending = { ...state.pendingFidelity }
      delete newPending[`${x},${y}`]
      return { pendingFidelity: newPending }
    })
  },

  getPendingFidelity: (x, y) => get().pendingFidelity[`${x},${y}`],
}))
