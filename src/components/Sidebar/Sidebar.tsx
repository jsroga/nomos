import React, { useState } from 'react'
import { useWorldStore } from '@/store/useWorldStore'
import { aiService } from '@/lib/ai/service'
import { SettingsDialog } from '@/components/SettingsDialog'
import { ProjectSelector } from '@/components/ProjectSelector'
import { Settings, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export const Sidebar: React.FC = () => {
  const defaultMasterPrompt =
    'Isometric painted world in the style of Disco Elysium, detailed urban environment, painterly art style'

  const [masterPrompt, setMasterPrompt] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('master-prompt') || defaultMasterPrompt
    }
    return defaultMasterPrompt
  })
  const [tilePrompt, setTilePrompt] = useState('')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Save master prompt to localStorage when it changes
  const handleMasterPromptChange = (value: string) => {
    setMasterPrompt(value)
    if (typeof window !== 'undefined') {
      localStorage.setItem('master-prompt', value)
    }
  }

  const isGenerating = useWorldStore(state => state.isGenerating)
  const setGenerating = useWorldStore(state => state.setGenerating)
  const selectedTiles = useWorldStore(state => state.selectedTiles)
  const addTile = useWorldStore(state => state.addTile)
  const currentProject = useWorldStore(state => state.currentProject)
  const tiles = useWorldStore(state => state.tiles)
  const addGeneratingTile = useWorldStore(state => state.addGeneratingTile)
  const removeGeneratingTile = useWorldStore(state => state.removeGeneratingTile)
  const generatingTiles = useWorldStore(state => state.generatingTiles)

  // Helper to convert local image to base64 data URL
  const loadImageAsDataUrl = async (tile: any): Promise<any> => {
    if (!tile || !currentProject) return tile
    
    const imageUrl = `/projects/${currentProject.id}/${tile.image_filename}`
    
    try {
      // Fetch the local image and convert to base64
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          resolve({
            ...tile,
            imageUrl: reader.result as string // This is now a data URL
          })
        }
        reader.readAsDataURL(blob)
      })
    } catch (e) {
      console.error('Failed to load neighbor image:', e)
      return tile
    }
  }

  const generateSingleTile = async (x: number, y: number) => {
    if (!currentProject) return

    addGeneratingTile(x, y)

    try {
      const config = aiService.getConfig(aiService.getActiveModelId())

      // Load neighbor images as data URLs
      const [upTile, downTile, leftTile, rightTile] = await Promise.all([
        loadImageAsDataUrl(tiles[`${x},${y - 1}`]),
        loadImageAsDataUrl(tiles[`${x},${y + 1}`]),
        loadImageAsDataUrl(tiles[`${x - 1},${y}`]),
        loadImageAsDataUrl(tiles[`${x + 1},${y}`]),
      ])

      const neighbors = {
        up: upTile,
        down: downTile,
        left: leftTile,
        right: rightTile,
      }

      // Construct TileContext
      const context = {
        targetX: x,
        targetY: y,
        allTiles: tiles,
        neighbors,
      }

      // Combine master prompt with tile-specific prompt
      const fullPrompt = tilePrompt ? `${masterPrompt}. ${tilePrompt}` : masterPrompt

      const generatedImageBase64 = await aiService.generate(fullPrompt, context)

      await addTile(x, y, fullPrompt, generatedImageBase64)
      toast.success(`Tile (${x},${y}) generated successfully!`)
    } catch (err: any) {
      console.error(err)
      const errorMessage = err.message || 'Generation failed'
      setError(errorMessage)
      toast.error(`Tile (${x},${y}): ${errorMessage}`)
    } finally {
      removeGeneratingTile(x, y)
    }
  }

  const handleGenerate = async () => {
    if (selectedTiles.length === 0 || !currentProject) return

    const tile = selectedTiles[0] // Only one tile selected at a time
    
    // Check if this tile is already generating
    if (generatingTiles[`${tile.x},${tile.y}`]) return

    setGenerating(true)
    setError(null)

    // Generate the single selected tile
    await generateSingleTile(tile.x, tile.y)

    setGenerating(false)
  }

  return (
    <div className="w-80 h-full bg-card border-r border-border flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h1 className="font-bold text-xl">World Gen</h1>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 hover:bg-accent rounded-full transition-colors"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Master Prompt - Always Visible */}
      <div className="p-4 border-b border-border">
        <label className="block text-sm font-medium mb-2">Master Prompt (Style)</label>
        <textarea
          className="w-full h-24 bg-background border border-input rounded-md p-3 text-sm resize-none focus:ring-2 focus:ring-primary focus:outline-none"
          value={masterPrompt}
          onChange={e => handleMasterPromptChange(e.target.value)}
          placeholder="Define the overall art style and aesthetic..."
        />
        <p className="text-xs text-muted-foreground mt-1">
          This style will be applied to all generated tiles
        </p>
      </div>

      <ProjectSelector />

      <div className="p-4 flex-1 overflow-y-auto">
        {!currentProject ? (
          <div className="text-center text-muted-foreground mt-10">
            Please select or create a project to start.
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Tile Prompt (Optional)</label>
              <input
                type="text"
                className="w-full bg-background border border-input rounded-md p-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                value={tilePrompt}
                onChange={e => setTilePrompt(e.target.value)}
                placeholder="e.g., church, forest, river..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Add specific content for this tile
              </p>
            </div>

            {selectedTiles.length > 0 ? (
              <div className="bg-accent/10 p-3 rounded-md border border-accent/20">
                <div className="text-xs font-mono text-muted-foreground mb-2">
                  Selected: {selectedTiles[0].x}, {selectedTiles[0].y}
                  {generatingTiles[`${selectedTiles[0].x},${selectedTiles[0].y}`] && (
                    <span className="ml-2 text-yellow-500">(generating)</span>
                  )}
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={!!generatingTiles[`${selectedTiles[0].x},${selectedTiles[0].y}`]}
                  className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {generatingTiles[`${selectedTiles[0].x},${selectedTiles[0].y}`] ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Generating...
                    </>
                  ) : (
                    'Generate Tile'
                  )}
                </button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Select another tile to queue more generations
                </p>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center p-4 border border-dashed border-border rounded-md">
                Select a tile on the canvas to generate
              </div>
            )}

            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20">
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  )
}
