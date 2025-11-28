import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'

type Project = Database['public']['Tables']['projects']['Row']
type Tile = Database['public']['Tables']['tiles']['Row']

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
  getTile: (x: number, y: number) => Tile | undefined
}

export const useWorldStore = create<WorldState>((set, get) => ({
  currentProject: null,
  tiles: {},
  viewport: { x: 0, y: 0, scale: 1 },
  selectedTile: null,
  selectedTiles: [],
  isGenerating: false,
  generatingTiles: {},

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
  getTile: (x, y) => get().tiles[`${x},${y}`],
}))
