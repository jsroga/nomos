import React, { useRef, useEffect, useState } from 'react'
import { useWorldStore, Tile } from '@/domains/world-building-toolkit/store/useWorldStore'
import { useGlobalStatusStore } from '@/store/useGlobalStatusStore'
import { aiService } from '@/infrastructure/ai/service'
import { assembleContextImage } from '@/infrastructure/ai/contextAssembler'
import { upscaleService } from '@/domains/world-building-toolkit/services/UpscaleService'
import { repaintService } from '@/domains/world-building-toolkit/services/RepaintService'
import { tileGenerationService } from '@/domains/world-building-toolkit/services/TileGenerationService'
import { fidelityService } from '@/domains/world-building-toolkit/services/FidelityService'
import { LocalStorageKeys } from '@/constants/localStorage'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AssetsPanel } from '@/domains/world-building-toolkit/components/AssetsPanel'
import { MjVariantPicker } from '@/domains/world-building-toolkit/components/MjVariantPicker'
import { Loader2, Plus, Move, Paintbrush, X, Check, Eye, EyeOff, MousePointer2, Upload, BookOpen, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

export const Sidebar: React.FC = () => {
  const defaultMasterPrompt =
    'Isometric painted world in the style of Disco Elysium, detailed urban environment, painterly art style'

  const [masterPrompt, setMasterPrompt] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LocalStorageKeys.MASTER_PROMPT) || defaultMasterPrompt
    }
    return defaultMasterPrompt
  })
  const [tilePrompt, setTilePrompt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [upscaleCreativity, setUpscaleCreativity] = useState(0.3)
  const [showDebug, setShowDebug] = useState(false)

  // Save master prompt to localStorage when it changes
  const handleMasterPromptChange = (value: string) => {
    setMasterPrompt(value)
    if (typeof window !== 'undefined') {
      localStorage.setItem(LocalStorageKeys.MASTER_PROMPT, value)
    }
  }

  const [isGenerating, setIsGenerating] = useState(false)
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
  const isSelectMode = useWorldStore(state => state.isSelectMode)
  const setSelectMode = useWorldStore(state => state.setSelectMode)
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
  const enhancingTiles = useWorldStore(state => state.enhancingTiles)
  const selectDebugInfo = useWorldStore(state => state.selectDebugInfo)

  const [styleReferenceUrls, setStyleReferenceUrls] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isFetchingSummary, setIsFetchingSummary] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fidelity enhancement state
  const [fidelityPrompt, setFidelityPrompt] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LocalStorageKeys.FIDELITY_PROMPT) || 'Enhance with fine artistic details, crisp textures, and vibrant colors while maintaining the original composition.'
    }
    return 'Enhance with fine artistic details, crisp textures, and vibrant colors while maintaining the original composition.'
  })
  const [showFidelityPrompt, setShowFidelityPrompt] = useState(false)

  // Save fidelity prompt to localStorage
  const handleFidelityPromptChange = (value: string) => {
    setFidelityPrompt(value)
    if (typeof window !== 'undefined') {
      localStorage.setItem(LocalStorageKeys.FIDELITY_PROMPT, value)
    }
  }

  // MJ Variant Picker state
  const [mjGridData, setMjGridData] = useState<{
    tileId: string
    tileX: number
    tileY: number
    gridImageUrl: string
    buttons: any[]
    taskId: string
  } | null>(null)

  // Listen for MJ grid ready event
  useEffect(() => {
    const handleMjGridReady = (event: CustomEvent) => {
      console.log('MJ grid ready:', event.detail)
      setMjGridData(event.detail)
    }

    window.addEventListener('mj-grid-ready', handleMjGridReady as EventListener)
    return () => {
      window.removeEventListener('mj-grid-ready', handleMjGridReady as EventListener)
    }
  }, [])

  useEffect(() => {
    if (currentProject?.id) {
      fetch(`/api/storyteller/projects/${currentProject.id}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.style_reference_urls) {
            setStyleReferenceUrls(data.style_reference_urls)
          }
        })
        .catch(err => console.error('Failed to load project style refs:', err))
    }
  }, [currentProject?.id])

  // Resume any pending tile generations on mount
  useEffect(() => {
    tileGenerationService.resumePendingGenerations()
    upscaleService.resumePendingUpscales()
    fidelityService.resumePendingEnhancements()
  }, [])

  // Helper to convert local image to base64 data URL
  const blobToDataUrl = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  const loadImageAsDataUrl = async (
    tile: Tile | undefined
  ): Promise<(Tile & { imageUrl?: string }) | undefined> => {
    if (!tile || !currentProject) return tile

    const imageUrl = `/projects/${currentProject.id}/${tile.image_filename}`

    try {
      // Fetch the local image and convert to base64
      const response = await fetch(imageUrl)
      const blob = await response.blob()

      return new Promise(resolve => {
        const reader = new FileReader()
        reader.onloadend = () => {
          resolve({
            ...tile,
            imageUrl: reader.result as string, // This is now a data URL
          })
        }
        reader.readAsDataURL(blob)
      })
    } catch (e) {
      console.error('Failed to load neighbor image:', e)
      return tile
    }
  }

  const fetchWorldSummary = async () => {
    if (!currentProject) return
    setIsFetchingSummary(true)
    try {
      const res = await fetch(`/api/storyteller/world-summary?projectId=${currentProject.id}`)
      if (!res.ok) throw new Error('Failed to fetch summary')

      const data = await res.json()

      if (data.worldGenPrompt) {
        // Confirm before overwriting if user has typed something custom
        if (masterPrompt !== defaultMasterPrompt && masterPrompt !== data.worldGenPrompt) {
          if (!confirm('Overwrite current Master Prompt with World Bible data?')) {
            setIsFetchingSummary(false)
            return
          }
        }
        handleMasterPromptChange(data.worldGenPrompt)
        toast.success('Master Prompt updated from Storyteller Bible')
      }

      if (data.summarize) {
        console.log('World Summary:', data.summarize)
        // Optionally store summary for display if needed
      }
    } catch (e) {
      console.error('Failed to fetch world summary:', e)
      toast.error('Failed to fetch world info')
    } finally {
      setIsFetchingSummary(false)
    }
  }

  const generateSingleTile = async (x: number, y: number) => {
    if (!currentProject) return

    try {
      // Build full prompt from master + tile prompt
      const fullPrompt = `${tilePrompt}, ${masterPrompt}`

      // Optional: Show debug info for context assembly (still works locally)
      // Load neighbor images as data URLs for debug display
      const [
        upTile,
        downTile,
        leftTile,
        rightTile,
        topLeftTile,
        topRightTile,
        bottomLeftTile,
        bottomRightTile,
      ] = await Promise.all([
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

      // Debug: Assemble context image to show in UI
      const { imageBlob } = await assembleContextImage(
        {
          targetX: x,
          targetY: y,
          neighbors,
          allTiles: tiles,
        },
        1024
      )
      const assembledContext = await blobToDataUrl(imageBlob)
      const getImageUrl = (tile: (Tile & { imageUrl?: string }) | undefined) => tile?.imageUrl
      setGenerationDebugInfo({
        neighbors: {
          up: getImageUrl(neighbors.up),
          down: getImageUrl(neighbors.down),
          left: getImageUrl(neighbors.left),
          right: getImageUrl(neighbors.right),
          topLeft: getImageUrl(neighbors.topLeft),
          topRight: getImageUrl(neighbors.topRight),
          bottomLeft: getImageUrl(neighbors.bottomLeft),
          bottomRight: getImageUrl(neighbors.bottomRight),
        },
        assembledContext,
      })

      // Trigger generation via Trigger.dev background task
      // The service handles status tracking and polling
      await tileGenerationService.generate(currentProject.id, x, y, fullPrompt)

      toast.success(`Tile (${x},${y}) generation started!`)
    } catch (err: unknown) {
      console.error(err)
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Generation failed: ${msg}`)
      setError(`Generation failed: ${msg}`)
    }
  }

  const handleGenerate = async () => {
    if (selectedTiles.length === 0 || !currentProject) return

    const tile = selectedTiles[0] // Only one tile selected at a time

    // Check if this tile is already generating
    if (generatingTiles[`${tile.x},${tile.y}`]) return

    setError(null)

    // Generate the single selected tile via Trigger.dev
    await generateSingleTile(tile.x, tile.y)
  }

  const handleUploadTile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentProject || selectedTiles.length === 0) return

    const file = e.target.files?.[0]
    if (!file) return

    const tile = selectedTiles[0]
    setIsUploading(true)
    setError(null)

    try {
      // Read file as base64
      const reader = new FileReader()
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Upload via API
      const response = await fetch('/api/upload-tile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject.id,
          x: tile.x,
          y: tile.y,
          imageBase64,
          prompt: tilePrompt || `Uploaded tile at (${tile.x}, ${tile.y})`,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      // Update local store with new tile
      useWorldStore.setState(state => ({
        tiles: {
          ...state.tiles,
          [`${tile.x},${tile.y}`]: {
            id: data.tile?.id || `tile-${tile.x}-${tile.y}`,
            project_id: currentProject.id,
            x: tile.x,
            y: tile.y,
            tile_prompt: tilePrompt || `Uploaded tile at (${tile.x}, ${tile.y})`,
            image_filename: data.filename,
            created_at: new Date().toISOString(),
          },
        },
      }))

      toast.success(`Tile (${tile.x},${tile.y}) uploaded!`)
    } catch (err: unknown) {
      console.error(err)
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Upload failed: ${msg}`)
      setError(`Upload failed: ${msg}`)
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="w-80 h-full bg-card border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <h1 className="font-bold text-xl">World Gen</h1>
      </div>

      {/* Master Prompt - Always Visible */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Master Prompt (Style)</label>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] gap-1"
            onClick={fetchWorldSummary}
            disabled={isFetchingSummary || !currentProject}
            title="Fetch style from Storyteller Series Bible"
          >
            {isFetchingSummary ? <Loader2 size={10} className="animate-spin" /> : <BookOpen size={10} />}
            Fetch World Info
          </Button>
        </div>
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

      <div className="p-4 border-b border-border space-y-2">
        <Button
          variant={isRepaintMode ? 'default' : 'secondary'}
          className="w-full"
          onClick={() => {
            if (!isRepaintMode) setSelectMode(false)
            setRepaintMode(!isRepaintMode)
          }}
        >
          {isRepaintMode ? 'Exit Repaint Mode' : 'Enter Repaint Mode'}
        </Button>
        <Button
          variant={isSelectMode ? 'default' : 'secondary'}
          className="w-full"
          onClick={() => {
            const newSelectMode = !isSelectMode
            setSelectMode(newSelectMode)
            // Disable repaint mode when enabling select mode
            if (newSelectMode && isRepaintMode) {
              setRepaintMode(false)
            }
          }}
        >
          {isSelectMode ? 'Exit Select Mode' : 'Enter Select Mode'}
        </Button>

        {/* Select Mode Debug View */}
        {isSelectMode && selectDebugInfo && (
          <div className="bg-muted p-4 rounded-lg border border-border space-y-3 mt-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Select Mode Debug</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px]"
                onClick={() => useWorldStore.getState().setSelectDebugInfo(null)}
              >
                Clear
              </Button>
            </div>

            <div className="space-y-2">
              {selectDebugInfo.contextImage && (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Context Image</p>
                  <img
                    src={selectDebugInfo.contextImage}
                    alt="Context"
                    className="w-full border border-border rounded"
                  />
                </div>
              )}

              {selectDebugInfo.box && (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Selection Box</p>
                  <div className="text-[10px] bg-background p-2 rounded border border-border font-mono">
                    {JSON.stringify(selectDebugInfo.box, null, 2)}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[10px] text-muted-foreground mb-1">API Response</p>
                <div className="text-[10px] bg-background p-2 rounded border border-border font-mono max-h-32 overflow-y-auto">
                  {JSON.stringify(selectDebugInfo.apiResponse, null, 2)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {!currentProject ? (
          <div className="text-center text-muted-foreground mt-10 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
              <Plus size={24} className="opacity-50" />
            </div>
            <p>Please select or create a project to start.</p>
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
                      onChange={e => setRepaintPrompt(e.target.value)}
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
                        setIsGenerating(true)
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
                          setIsGenerating(false)
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
                          <img
                            src={debugInfo.image}
                            alt="Context"
                            className="w-full border border-border rounded"
                          />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">
                            Mask (White=Edit)
                          </p>
                          <img
                            src={debugInfo.mask}
                            alt="Mask"
                            className="w-full border border-border rounded"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {repaintResult && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Preview generated. Click Apply to save.
                      </p>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setShowDebug(!showDebug)}
                      title="Toggle Debug View"
                    >
                      {showDebug ? <EyeOff size={14} /> : <Eye size={14} />}
                    </Button>
                  )}
                  {generationDebugInfo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px]"
                      onClick={() => setGenerationDebugInfo(null)}
                    >
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
                  <div className="flex gap-2">
                    <button
                      onClick={handleGenerate}
                      disabled={!!generatingTiles[`${selectedTiles[0].x},${selectedTiles[0].y}`] || isUploading}
                      className="flex-1 bg-primary text-primary-foreground py-2 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {generatingTiles[`${selectedTiles[0].x},${selectedTiles[0].y}`] ? (
                        <>
                          <Loader2 className="animate-spin" size={16} />
                          Generating...
                        </>
                      ) : (
                        'Generate'
                      )}
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!!generatingTiles[`${selectedTiles[0].x},${selectedTiles[0].y}`] || isUploading}
                      className="bg-secondary text-secondary-foreground py-2 px-3 rounded-md font-medium hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      title="Upload image for this tile"
                    >
                      {isUploading ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Upload size={16} />
                      )}
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadTile}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Generate with AI or upload your own image
                  </p>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center p-4 border border-dashed border-border rounded-md">
                  Select a tile on the canvas to generate or upload
                </div>
              )}

              {/* Generation Debug View */}
              {generationDebugInfo && showDebug && (
                <div className="mt-2 border border-slate-300 bg-slate-200 p-1 rounded">
                  <h4 className="text-xs font-semibold mb-1">Debug Context</h4>

                  {generationDebugInfo.assembledContext && (
                    <div className="mb-2">
                      <p className="text-[10px] text-muted-foreground mb-1">
                        Inline Data (Assembled)
                      </p>
                      <img
                        src={generationDebugInfo.assembledContext}
                        className="w-full h-auto border border-border"
                        alt="Assembled Context"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-1 mb-2">
                    <div className="col-start-2 text-center text-[10px]">Up</div>
                    <div className="col-start-1 row-start-2 text-center text-[10px]">Left</div>
                    <div className="col-start-2 row-start-2 border border-dashed border-border aspect-square flex items-center justify-center text-[10px] text-muted-foreground">
                      Target
                    </div>
                    <div className="col-start-3 row-start-2 text-center text-[10px]">Right</div>
                    <div className="col-start-2 row-start-3 text-center text-[10px]">Down</div>

                    {/* Images */}
                    {generationDebugInfo.neighbors.topLeft && (
                      <img
                        src={generationDebugInfo.neighbors.topLeft}
                        className="col-start-1 row-start-1 w-full h-full object-cover border border-border"
                      />
                    )}
                    {generationDebugInfo.neighbors.up && (
                      <img
                        src={generationDebugInfo.neighbors.up}
                        className="col-start-2 row-start-1 w-full h-full object-cover border border-border"
                      />
                    )}
                    {generationDebugInfo.neighbors.topRight && (
                      <img
                        src={generationDebugInfo.neighbors.topRight}
                        className="col-start-3 row-start-1 w-full h-full object-cover border border-border"
                      />
                    )}

                    {generationDebugInfo.neighbors.left && (
                      <img
                        src={generationDebugInfo.neighbors.left}
                        className="col-start-1 row-start-2 w-full h-full object-cover border border-border"
                      />
                    )}
                    {generationDebugInfo.neighbors.right && (
                      <img
                        src={generationDebugInfo.neighbors.right}
                        className="col-start-3 row-start-2 w-full h-full object-cover border border-border"
                      />
                    )}

                    {generationDebugInfo.neighbors.bottomLeft && (
                      <img
                        src={generationDebugInfo.neighbors.bottomLeft}
                        className="col-start-1 row-start-3 w-full h-full object-cover border border-border"
                      />
                    )}
                    {generationDebugInfo.neighbors.down && (
                      <img
                        src={generationDebugInfo.neighbors.down}
                        className="col-start-2 row-start-3 w-full h-full object-cover border border-border"
                      />
                    )}
                    {generationDebugInfo.neighbors.bottomRight && (
                      <img
                        src={generationDebugInfo.neighbors.bottomRight}
                        className="col-start-3 row-start-3 w-full h-full object-cover border border-border"
                      />
                    )}
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
                <label className="block text-xs font-medium mb-1">
                  Upscale Creativity: {upscaleCreativity}
                </label>
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
                        success: 'Tile queued for upscaling!',
                        error: 'Upscale failed',
                      })
                    }
                  }
                }}
                className="w-full py-1.5 bg-secondary text-secondary-foreground rounded-md text-xs font-medium hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={
                  !selectedTile ||
                  (selectedTile && !!upscalingTiles[`${selectedTile.x},${selectedTile.y}`])
                }
              >
                Upscale Tile (4x)
              </button>
            </div>

            {/* Enhance Fidelity Group */}
            <div className="bg-muted p-4 rounded-lg border border-border space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Sparkles size={14} className="text-violet-500" />
                  Enhance Fidelity
                </h3>
                <button
                  onClick={() => setShowFidelityPrompt(!showFidelityPrompt)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showFidelityPrompt ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
              
              {showFidelityPrompt && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium">Style Prompt</label>
                  <Textarea
                    value={fidelityPrompt}
                    onChange={e => handleFidelityPromptChange(e.target.value)}
                    placeholder="Describe the artistic style to apply..."
                    className="h-20 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    This prompt guides how Gemini enhances the tile's artistic fidelity.
                  </p>
                </div>
              )}

              <button
                onClick={async () => {
                  if (selectedTile) {
                    const fullTile = tiles[`${selectedTile.x},${selectedTile.y}`]
                    if (fullTile) {
                      toast.promise(fidelityService.enhance(fullTile, fidelityPrompt), {
                        loading: 'Enhancing fidelity...',
                        success: 'Tile queued for fidelity enhancement!',
                        error: (err) => `Enhancement failed: ${err.message}`,
                      })
                    }
                  }
                }}
                className="w-full py-1.5 bg-violet-600 text-white rounded-md text-xs font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={
                  !selectedTile ||
                  (selectedTile && !!enhancingTiles[`${selectedTile.x},${selectedTile.y}`])
                }
              >
                {selectedTile && enhancingTiles[`${selectedTile.x},${selectedTile.y}`] ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    Enhancing...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Enhance Fidelity
                  </>
                )}
              </button>
            </div>

            {/* Assets Group - Always visible when we have assets or in select mode */}
            <div className="bg-muted p-4 rounded-lg border border-border space-y-3">
              <AssetsPanel />
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20">
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MJ Variant Picker Modal */}
      {mjGridData && (
        <MjVariantPicker
          tileId={mjGridData.tileId}
          tileX={mjGridData.tileX}
          tileY={mjGridData.tileY}
          gridImageUrl={mjGridData.gridImageUrl}
          buttons={mjGridData.buttons}
          taskId={mjGridData.taskId}
          onClose={() => setMjGridData(null)}
          onSelected={() => setMjGridData(null)}
        />
      )}
    </div>
  )
}
