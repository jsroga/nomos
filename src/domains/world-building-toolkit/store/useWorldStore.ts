import { create } from 'zustand'
import { supabase } from '@/infrastructure/storage/supabase'
import type { SelectResult } from '@/domains/world-building-toolkit/services/SelectModeService'

export type SelectBox = { x1: number; y1: number; x2: number; y2: number }
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
import { Database } from '@/infrastructure/storage/database.types'

export type Project = Database['public']['Tables']['projects']['Row']
export type Tile = Database['public']['Tables']['tiles']['Row']

interface GeneratingTile {
  x: number
  y: number
  startTime: number
}

interface WorldState {
  currentProject: Project | null
  tiles: Record<string, Tile> // Key: "x,y"
  viewport: { x: number; y: number; scale: number }
  selectedTile: { x: number; y: number } | null
  selectedTiles: Array<{ x: number; y: number }> // Multiple selection
  isGenerating: boolean
  generatingTiles: Record<string, GeneratingTile> // Key: "x,y"
  upscalingTiles: Record<string, GeneratingTile> // Key: "x,y"
  repaintingTiles: Record<string, GeneratingTile> // Key: "x,y"

  // Repaint State
  isRepaintMode: boolean
  brushSize: number
  repaintStrokes: Array<{ x: number; y: number; radius?: number }> // Points in world coordinates with optional radius
  repaintResult: { imageUrl: string; bounds: { x: number; y: number; width: number; height: number } } | null
  repaintPrompt: string
  debugInfo: { image: string; mask: string } | null
  generationDebugInfo: {
    neighbors: {
      up?: string;
      down?: string;
      left?: string;
      right?: string;
      topLeft?: string;
      topRight?: string;
      bottomLeft?: string;
      bottomRight?: string;
    };
    prompt: string;
    assembledContext?: string
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

  // Actions
  loadProject: (projectId: string) => Promise<void>
  createProject: (name: string, prompt: string) => Promise<string | null>
  switchProject: (projectId: string) => Promise<void>
  addTile: (x: number, y: number, prompt: string, imageData: string) => Promise<void>
  setViewport: (viewport: { x: number; y: number; scale: number }) => void
  setSelectedTile: (tile: { x: number; y: number } | null) => void
  toggleTileSelection: (tile: { x: number; y: number }) => void
  clearSelection: () => void
  setGenerating: (isGenerating: boolean) => void
  addGeneratingTile: (x: number, y: number) => void
  removeGeneratingTile: (x: number, y: number) => void
  addUpscalingTile: (x: number, y: number) => void
  removeUpscalingTile: (x: number, y: number) => void
  addRepaintingTile: (x: number, y: number) => void
  removeRepaintingTile: (x: number, y: number) => void

  getTile: (x: number, y: number) => Tile | undefined

  // Repaint Actions
  setRepaintMode: (isRepaintMode: boolean) => void
  setBrushSize: (size: number) => void
  addRepaintStroke: (point: { x: number; y: number; radius?: number }) => void
  clearRepaintStrokes: () => void
  setRepaintResult: (result: { imageUrl: string; bounds: { x: number; y: number; width: number; height: number } } | null) => void
  setRepaintPrompt: (prompt: string) => void
  setDebugInfo: (info: { image: string; mask: string } | null) => void
  setGenerationDebugInfo: (info: {
    neighbors: {
      up?: string;
      down?: string;
      left?: string;
      right?: string;
      topLeft?: string;
      topRight?: string;
      bottomLeft?: string;
      bottomRight?: string;
    };
    prompt: string;
    assembledContext?: string
  } | null) => void

  // Select Mode Actions
  setSelectMode: (isSelectMode: boolean) => void
  setSelectBox: (box: SelectBox | null) => void
  setDrawingBox: (isDrawing: boolean) => void
  setSelectTextPrompt: (prompt: string) => void
  clearSelectBox: () => void
  setSelectedMask: (mask: SelectResult | null) => void
  setSegmenting: (isSegmenting: boolean) => void
  setSelectDebugInfo: (info: { contextImage?: string; box?: SelectBox; apiResponse?: any } | null) => void

  // Assets Actions
  setAssets: (assets: Asset[]) => void
  addAsset: (asset: Asset) => void
  updateAsset: (id: string, updates: Partial<Asset>) => void
  removeAsset: (id: string) => void
  setPreviewAssetId: (id: string | null) => void
  setShowAllAssetMasks: (show: boolean) => void
  fetchAssets: () => Promise<void>
}

export const useWorldStore = create<WorldState>((set, get) => ({
  currentProject: null,
  tiles: {},
  viewport: { x: 0, y: 0, scale: 1 },
  selectedTile: null,
  selectedTiles: [],
  isGenerating: false,

  generatingTiles: {},
  upscalingTiles: {},
  repaintingTiles: {},
  isRepaintMode: false,
  brushSize: 50,
  repaintStrokes: [],
  repaintResult: null,
  repaintPrompt: '',
  debugInfo: null,
  generationDebugInfo: null,

  loadProject: async (projectId: string) => {
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      console.error('Error loading project:', projectError)
      return
    }

    const { data: tiles, error: tilesError } = await supabase
      .from('tiles')
      .select('*')
      .eq('project_id', projectId)

    if (tilesError) {
      console.error('Error loading tiles:', tilesError)
      return
    }

    const tileMap: Record<string, Tile> = {}
    tiles?.forEach(tile => {
      tileMap[`${tile.x},${tile.y}`] = tile
    })

    set({ currentProject: project, tiles: tileMap })
  },

  createProject: async (name: string, prompt: string) => {
    const { data, error } = await supabase
      .from('projects')
      .insert({ name, project_prompt: prompt })
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

  switchProject: async (projectId: string) => {
    // Clear current state first
    set({ currentProject: null, tiles: {}, selectedTile: null })
    await get().loadProject(projectId)
  },

  addTile: async (x: number, y: number, prompt: string, imageData: string) => {
    const { currentProject } = get()
    if (!currentProject) return

    const filename = `${x}_${y}_${Date.now()}.png`

    // 1. Save Image Locally via API
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

      if (!response.ok) throw new Error('Failed to save image locally')
    } catch (e) {
      console.error('Local save failed', e)
      return
    }

    // 2. Save Metadata to Supabase (upsert to allow regeneration)
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
          onConflict: 'project_id,x,y', // Update if this combination exists
        }
      )
      .select()
      .single()

    if (error) {
      console.error('Error saving tile to DB:', error)
      return
    }

    if (tile) {
      set(state => ({
        tiles: { ...state.tiles, [`${x},${y}`]: tile },
      }))
    }
  },

  setViewport: viewport => set({ viewport }),
  setSelectedTile: selectedTile => set({ selectedTile, selectedTiles: selectedTile ? [selectedTile] : [] }),
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
  setGenerating: isGenerating => set({ isGenerating }),
  addGeneratingTile: (x, y) =>
    set(state => ({
      generatingTiles: {
        ...state.generatingTiles,
        [`${x},${y}`]: { x, y, startTime: Date.now() },
      },
    })),
  removeGeneratingTile: (x, y) =>
    set(state => {
      const newGenerating = { ...state.generatingTiles }
      delete newGenerating[`${x},${y}`]
      return { generatingTiles: newGenerating }
    }),
  addUpscalingTile: (x, y) =>
    set(state => ({
      upscalingTiles: {
        ...state.upscalingTiles,
        [`${x},${y}`]: { x, y, startTime: Date.now() },
      },
    })),
  removeUpscalingTile: (x, y) =>
    set(state => {
      const newUpscaling = { ...state.upscalingTiles }
      delete newUpscaling[`${x},${y}`]
      return { upscalingTiles: newUpscaling }
    }),
  addRepaintingTile: (x, y) =>
    set(state => ({
      repaintingTiles: {
        ...state.repaintingTiles,
        [`${x},${y}`]: { x, y, startTime: Date.now() },
      },
    })),
  removeRepaintingTile: (x, y) =>
    set(state => {
      const newRepainting = { ...state.repaintingTiles }
      delete newRepainting[`${x},${y}`]
      return { repaintingTiles: newRepainting }
    }),
  getTile: (x, y) => get().tiles[`${x},${y}`],

  setRepaintMode: isRepaintMode => set({ isRepaintMode }),
  setBrushSize: brushSize => set({ brushSize }),
  addRepaintStroke: point => set(state => ({ repaintStrokes: [...state.repaintStrokes, point] })),
  clearRepaintStrokes: () => set({ repaintStrokes: [] }),
  setRepaintResult: repaintResult => set({ repaintResult }),
  setRepaintPrompt: repaintPrompt => set({ repaintPrompt }),
  setDebugInfo: debugInfo => set({ debugInfo }),
  setGenerationDebugInfo: generationDebugInfo => set({ generationDebugInfo }),

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

  // Select Mode Actions
  setSelectMode: isSelectMode => set({ isSelectMode }),
  setSelectBox: selectBox => set({ selectBox }),
  setDrawingBox: isDrawingBox => set({ isDrawingBox }),
  setSelectTextPrompt: selectTextPrompt => set({ selectTextPrompt }),
  clearSelectBox: () => set({ selectBox: null, selectedMask: null, selectDebugInfo: null }),
  setSelectedMask: selectedMask => set({ selectedMask }),
  setSegmenting: isSegmenting => set({ isSegmenting }),
  setSelectDebugInfo: selectDebugInfo => set({ selectDebugInfo }),

  // Assets Actions
  setAssets: assets => set({ assets }),
  addAsset: asset => set(state => ({ assets: [asset, ...state.assets] })),
  updateAsset: (id, updates) => set(state => ({
    assets: state.assets.map(a => a.id === id ? { ...a, ...updates } : a)
  })),
  removeAsset: id => set(state => ({ 
    assets: state.assets.filter(a => a.id !== id),
    previewAssetId: state.previewAssetId === id ? null : state.previewAssetId
  })),
  setPreviewAssetId: previewAssetId => set({ previewAssetId }),
  setShowAllAssetMasks: showAllAssetMasks => set({ showAllAssetMasks }),
  fetchAssets: async () => {
    const { currentProject } = get()
    if (!currentProject) return
    
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('project_id', currentProject.id)
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      set({ assets: data })
    }
  },
}))
