/* eslint-disable */
import React, { useRef, useEffect, useState } from 'react'
import { useWorldStore, Tile } from '@/domains/world-building-toolkit/store/useWorldStore'
import { aiService } from '@/infrastructure/ai/service'
import { assembleContextImage } from '@/infrastructure/ai/contextAssembler'
import { upscaleService } from '@/domains/world-building-toolkit/services/UpscaleService'
import { repaintService } from '@/domains/world-building-toolkit/services/RepaintService'
import { SettingsDialog } from '@/domains/world-building-toolkit/components/SettingsDialog'
import { ProjectSelector } from '@/domains/world-building-toolkit/components/ProjectSelector'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Settings, Loader2, Plus, Move, Paintbrush, X, Check, Eye, EyeOff } from 'lucide-react'
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
  const [upscaleCreativity, setUpscaleCreativity] = useState(0.3)
  const [showDebug, setShowDebug] = useState(false)

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
  const selectedTile = useWorldStore(state => state.selectedTile)
  const addTile = useWorldStore(state => state.addTile)
  const currentProject = useWorldStore(state => state.currentProject)
  const tiles = useWorldStore(state => state.tiles)
  const addGeneratingTile = useWorldStore(state => state.addGeneratingTile)
  const removeGeneratingTile = useWorldStore(state => state.removeGeneratingTile)

  const generatingTiles = useWorldStore(state => state.generatingTiles)
  const isRepaintMode = useWorldStore(state => state.isRepaintMode)
  const setRepaintMode = useWorldStore(state => state.setRepaintMode)
  const brushSize = useWorldStore(state => state.brushSize)
  const setBrushSize = useWorldStore(state => state.setBrushSize)
  const repaintStrokes = useWorldStore(state => state.repaintStrokes)
  const clearRepaintStrokes = useWorldStore(state => state.clearRepaintStrokes)
  const repaintResult = useWorldStore(state => state.repaintResult)
  const setRepaintResult = useWorldStore(state => state.setRepaintResult)
  const repaintPrompt = useWorldStore(state => state.repaintPrompt)
  const setRepaintPrompt = useWorldStore(state => state.setRepaintPrompt)
  const debugInfo = useWorldStore(state => state.debugInfo)
  const setDebugInfo = useWorldStore(state => state.setDebugInfo)
  const generationDebugInfo = useWorldStore(state => state.generationDebugInfo)
  const setGenerationDebugInfo = useWorldStore(state => state.setGenerationDebugInfo)
  const upscalingTiles = useWorldStore(state => state.upscalingTiles)

  // Helper to convert local image to base64 data URL
  const blobToDataUrl = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  const loadImageAsDataUrl = async (tile: Tile | undefined): Promise<(Tile & { imageUrl?: string }) | undefined> => {
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
      const [upTile, downTile, leftTile, rightTile, topLeftTile, topRightTile, bottomLeftTile, bottomRightTile] = await Promise.all([
        loadImageAsDataUrl(tiles[`${x},${y - 1}`]),
        loadImageAsDataUrl(tiles[`${x},${y + 1}`]),
        loadImageAsDataUrl(tiles[`${x - 1},${y}`]),
        loadImageAsDataUrl(tiles[`${x + 1},${y}`]),
        loadImageAsDataUrl(tiles[`${x - 1},${y - 1}`]),
        loadImageAsDataUrl(tiles[`${x + 1},${y - 1}`]),
        loadImageAsDataUrl(tiles[`${x - 1},${y + 1}`]),
        loadImageAsDataUrl(tiles[`${x + 1},${y + 1}`]),
      ])

      const neighbors = {
        up: upTile,
        down: downTile,
        left: leftTile,
        right: rightTile,
        topLeft: topLeftTile,
        topRight: topRightTile,
        bottomLeft: bottomLeftTile,
        bottomRight: bottomRightTile,
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

      // Generate assembled context for debug
      let assembledContext = undefined
      try {
        const { imageBlob } = await assembleContextImage(context, 1024)
        assembledContext = await blobToDataUrl(imageBlob)
      } catch (e) {
        console.error('Failed to assemble context for debug:', e)
      }

      // Set Debug Info
      setGenerationDebugInfo({
        neighbors: {
          up: upTile?.imageUrl,
          down: downTile?.imageUrl,
          left: leftTile?.imageUrl,
          right: rightTile?.imageUrl,
          topLeft: topLeftTile?.imageUrl,
          topRight: topRightTile?.imageUrl,
          bottomLeft: bottomLeftTile?.imageUrl,
          bottomRight: bottomRightTile?.imageUrl,
        },
        prompt: fullPrompt,
        assembledContext
      })

      const generatedImageBase64 = await aiService.generate(fullPrompt, context)

      await addTile(x, y, fullPrompt, generatedImageBase64)
      toast.success(`Tile (${x},${y}) generated successfully!`)
    } catch (err: unknown) {
      console.error(err)
      const errorMessage = err instanceof Error ? err.message : 'Generation failed'
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
          onClick={() => {
            console.log('Sidebar: Settings clicked')
            setIsSettingsOpen(true)
          }}
          className="p-2 hover:bg-accent rounded-full transition-colors"
          title="Settings"
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

      <div className="p-4 border-b border-border">
        <Button
          variant={isRepaintMode ? "default" : "secondary"}
          className="w-full"
          onClick={() => setRepaintMode(!isRepaintMode)}
        >
          {isRepaintMode ? 'Exit Repaint Mode' : 'Enter Repaint Mode'}
        </Button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {!currentProject ? (
          <div className="text-center text-muted-foreground mt-10">
            Please select or create a project to start.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Repaint Mode UI */}
            {isRepaintMode && (
              <div className="p-4 border-t border-border bg-muted/20 mb-4 rounded-md">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm">Repaint Mode</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRepaintMode(false)
                      clearRepaintStrokes()
                      setRepaintResult(null)
                      setDebugInfo(null)
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium mb-1 block">Brush Size</label>
                    <Slider
                      value={[brushSize]}
                      min={10}
                      max={200}
                      step={10}
                      onValueChange={([val]) => setBrushSize(val)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium mb-1 block">Repaint Prompt</label>
                    <Textarea
                      value={repaintPrompt}
                      onChange={(e) => setRepaintPrompt(e.target.value)}
                      placeholder="Describe what to paint..."
                      className="h-20 text-xs"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      disabled={repaintStrokes.length === 0 || isGenerating}
                      onClick={async () => {
                        if (repaintStrokes.length === 0) return
                        setGenerating(true)
                        try {
                          const result = await repaintService.generateRepaint(
                            repaintStrokes,
                            tiles,
                            brushSize,
                            repaintPrompt
                          )
                          setRepaintResult(result)
                        } catch (error) {
                          console.error('Repaint failed:', error)
                          alert('Repaint failed. Check console.')
                        } finally {
                          setGenerating(false)
                        }
                      }}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Painting...
                        </>
                      ) : (
                        <>
                          <Paintbrush className="w-4 h-4 mr-2" />
                          Generate Repaint
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => {
                        clearRepaintStrokes()
                        setRepaintResult(null)
                        setDebugInfo(null)
                      }}
                    >
                      Clear
                    </Button>
                  </div>

                  {/* Debug View */}
                  {debugInfo && (
                    <div className="mt-4 border-t border-border pt-4">
                      <h4 className="text-xs font-semibold mb-2">Debug View</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Context</p>
                          <img src={debugInfo.image} alt="Context" className="w-full border border-border rounded" />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Mask (White=Edit)</p>
                          <img src={debugInfo.mask} alt="Mask" className="w-full border border-border rounded" />
                        </div>
                      </div>
                    </div>
                  )}

                  {repaintResult && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs text-muted-foreground">Preview generated. Click Apply to save.</p>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          onClick={async () => {
                            try {
                              await repaintService.applyRepaint(repaintResult)
                              toast.success('Repaint applied successfully')
                              setRepaintResult(null)
                              clearRepaintStrokes()
                              setDebugInfo(null)
                            } catch (e) {
                              console.error(e)
                              alert('Failed to apply repaint')
                            }
                          }}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Apply
                        </Button>
                        <Button
                          variant="secondary"
                          className="flex-1"
                          onClick={() => setRepaintResult(null)}
                        >
                          Discard
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Generation Group */}
            <div className="bg-muted p-4 rounded-lg border border-border space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Generation</h3>
                <div className="flex items-center gap-2">
                    {generationDebugInfo && (
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowDebug(!showDebug)} title="Toggle Debug View">
                            {showDebug ? <EyeOff size={14} /> : <Eye size={14} />}
                        </Button>
                    )}
                    {generationDebugInfo && (
                        <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setGenerationDebugInfo(null)}>
                            Clear
                        </Button>
                    )}
                </div>
              </div>

              <input
                type="text"
                className="w-full bg-background border border-input rounded-md p-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                value={tilePrompt}
                onChange={e => setTilePrompt(e.target.value)}
                placeholder="e.g., church, forest, river..."
              />
              <div className="text-xs text-muted-foreground">
                {selectedTile?.x}, {selectedTile?.y}
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

              {/* Generation Debug View */}
              {generationDebugInfo && showDebug && (
                <div className="mt-2 border border-slate-300 bg-slate-200 p-1 rounded">
                  <h4 className="text-xs font-semibold mb-1">Debug Context</h4>
                  
                  {generationDebugInfo.assembledContext && (
                    <div className="mb-2">
                        <p className="text-[10px] text-muted-foreground mb-1">Inline Data (Assembled)</p>
                        <img src={generationDebugInfo.assembledContext} className="w-full h-auto border border-border" alt="Assembled Context" />
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-1 mb-2">
                    <div className="col-start-2 text-center text-[10px]">Up</div>
                    <div className="col-start-1 row-start-2 text-center text-[10px]">Left</div>
                    <div className="col-start-2 row-start-2 border border-dashed border-border aspect-square flex items-center justify-center text-[10px] text-muted-foreground">Target</div>
                    <div className="col-start-3 row-start-2 text-center text-[10px]">Right</div>
                    <div className="col-start-2 row-start-3 text-center text-[10px]">Down</div>

                    {/* Images */}
                    {generationDebugInfo.neighbors.topLeft && <img src={generationDebugInfo.neighbors.topLeft} className="col-start-1 row-start-1 w-full h-full object-cover border border-border" />}
                    {generationDebugInfo.neighbors.up && <img src={generationDebugInfo.neighbors.up} className="col-start-2 row-start-1 w-full h-full object-cover border border-border" />}
                    {generationDebugInfo.neighbors.topRight && <img src={generationDebugInfo.neighbors.topRight} className="col-start-3 row-start-1 w-full h-full object-cover border border-border" />}
                    
                    {generationDebugInfo.neighbors.left && <img src={generationDebugInfo.neighbors.left} className="col-start-1 row-start-2 w-full h-full object-cover border border-border" />}
                    {generationDebugInfo.neighbors.right && <img src={generationDebugInfo.neighbors.right} className="col-start-3 row-start-2 w-full h-full object-cover border border-border" />}
                    
                    {generationDebugInfo.neighbors.bottomLeft && <img src={generationDebugInfo.neighbors.bottomLeft} className="col-start-1 row-start-3 w-full h-full object-cover border border-border" />}
                    {generationDebugInfo.neighbors.down && <img src={generationDebugInfo.neighbors.down} className="col-start-2 row-start-3 w-full h-full object-cover border border-border" />}
                    {generationDebugInfo.neighbors.bottomRight && <img src={generationDebugInfo.neighbors.bottomRight} className="col-start-3 row-start-3 w-full h-full object-cover border border-border" />}
                  </div>
                  <div className="text-[10px] text-muted-foreground bg-muted p-1 rounded">
                    Prompt: {generationDebugInfo.prompt}
                  </div>
                </div>
              )}
            </div>

            {/* Upscale Group */}
            <div className="bg-muted p-4 rounded-lg border border-border space-y-3">
              <h3 className="text-sm font-medium">Upscale</h3>
              <div>
                <label className="block text-xs font-medium mb-1">Upscale Creativity: {upscaleCreativity}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={upscaleCreativity}
                  onChange={e => setUpscaleCreativity(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <button
                onClick={async () => {
                  if (selectedTile) {
                    const fullTile = tiles[`${selectedTile.x},${selectedTile.y}`]
                    if (fullTile) {
                      toast.promise(upscaleService.upscale(fullTile, upscaleCreativity), {
                        loading: 'Upscaling...',
                        success: 'Tile upscaled!',
                        error: 'Upscale failed'
                      })
                    }
                  }
                }}
                className="w-full py-1.5 bg-secondary text-secondary-foreground rounded-md text-xs font-medium hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!selectedTile || (selectedTile && !!upscalingTiles[`${selectedTile.x},${selectedTile.y}`])}
              >
                Upscale Tile (4x)
              </button>
            </div>

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
