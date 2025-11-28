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
  const selectedTile = useWorldStore(state => state.selectedTile)
  const addTile = useWorldStore(state => state.addTile)
  const currentProject = useWorldStore(state => state.currentProject)
  const tiles = useWorldStore(state => state.tiles)

  const handleGenerate = async () => {
    if (!selectedTile || !currentProject) return

    setGenerating(true)
    setError(null)

    try {
      const config = aiService.getConfig(aiService.getActiveModelId())

      // Get neighbors for context
      const { x, y } = selectedTile
      const neighbors = {
        up: tiles[`${x},${y - 1}`],
        down: tiles[`${x},${y + 1}`],
        left: tiles[`${x - 1},${y}`],
        right: tiles[`${x + 1},${y}`],
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
      toast.success('Tile generated successfully!')
    } catch (err: any) {
      console.error(err)
      const errorMessage = err.message || 'Generation failed'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setGenerating(false)
    }
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

            {selectedTile ? (
              <div className="bg-accent/10 p-3 rounded-md border border-accent/20">
                <div className="text-xs font-mono text-muted-foreground mb-2">
                  Selected: {selectedTile.x}, {selectedTile.y}
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Generating...
                    </>
                  ) : (
                    'Generate Tile'
                  )}
                </button>
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
