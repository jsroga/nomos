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
import { AssetsPanel } from '@/domains/world-building-toolkit/components/AssetsPanel'
import { MjVariantPicker } from '@/domains/world-building-toolkit/components/MjVariantPicker'
import {
  DomainSidebar,
  SidebarSection,
  SidebarEmptyState,
} from '@/components/ui/domain-sidebar'
import {
  Loader2,
  Plus,
  Paintbrush,
  X,
  Check,
  Eye,
  EyeOff,
  Upload,
  BookOpen,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Palette,
  Wand2,
  MousePointer2,
  ImagePlus,
  ZoomIn,
  Package,
  Info,
  Trash2,
  RotateCcw,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import toast from 'react-hot-toast'

export const Sidebar: React.FC = () => {
  const defaultMasterPrompt =
    'Isometric painted world in the style of Disco Elysium, detailed urban environment, painterly art style'

  const currentProject = useWorldStore(state => state.currentProject)

  const [masterPrompt, setMasterPrompt] = useState(defaultMasterPrompt)
  const [tilePrompt, setTilePrompt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [upscaleCreativity, setUpscaleCreativity] = useState(0.3)
  const [showDebug, setShowDebug] = useState(false)

  // Load master prompt from localStorage when project changes
  useEffect(() => {
    if (typeof window !== 'undefined' && currentProject?.id) {
      const savedPrompt = localStorage.getItem(`${LocalStorageKeys.MASTER_PROMPT}-${currentProject.id}`)
      setMasterPrompt(savedPrompt || defaultMasterPrompt)
    }
  }, [currentProject?.id])

  // Save master prompt to localStorage when it changes (per project)
  const handleMasterPromptChange = (value: string) => {
    setMasterPrompt(value)
    if (typeof window !== 'undefined' && currentProject?.id) {
      localStorage.setItem(`${LocalStorageKeys.MASTER_PROMPT}-${currentProject.id}`, value)
    }
  }

  const [isGenerating, setIsGenerating] = useState(false)
  const selectedTiles = useWorldStore(state => state.selectedTiles)
  const selectedTile = useWorldStore(state => state.selectedTile)
  const addTile = useWorldStore(state => state.addTile)
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
      return (
        localStorage.getItem(LocalStorageKeys.FIDELITY_PROMPT) ||
        'Enhance with fine artistic details, crisp textures, and vibrant colors while maintaining the original composition.'
      )
    }
    return 'Enhance with fine artistic details, crisp textures, and vibrant colors while maintaining the original composition.'
  })
  const [showFidelityPrompt, setShowFidelityPrompt] = useState(false)
  const [fidelityCreativity, setFidelityCreativity] = useState(0.3)

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
          if (data && data.styleReferenceUrls) {
            setStyleReferenceUrls(data.styleReferenceUrls)
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
      await tileGenerationService.generate(currentProject.id, x, y, fullPrompt, styleReferenceUrls)

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

  const sidebarContent = (
    <TooltipProvider>
      {!currentProject ? (
        <SidebarEmptyState
          icon={<Plus size={24} className="opacity-50" />}
          message="Please select or create a project to start."
        />
      ) : (
        <div className="space-y-6">
          {/* Master Prompt */}
          <SidebarSection icon={<Palette size={12} />}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Style Prompt
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info size={12} className="text-muted-foreground/60 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="max-w-[200px]">Define the overall art style that will be applied to all generated tiles</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] gap-1"
                    onClick={fetchWorldSummary}
                    disabled={isFetchingSummary || !currentProject}
                  >
                    {isFetchingSummary ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <BookOpen size={10} />
                    )}
                    Fetch
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Import style from Storyteller World Bible</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <textarea
              value={masterPrompt}
              onChange={e => handleMasterPromptChange(e.target.value)}
              placeholder="Define the overall art style and aesthetic..."
              className="w-full h-24 bg-background/50 border-2 border-border/60 rounded-md p-3 text-sm resize-none hover:border-border transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30 focus:outline-none placeholder:text-muted-foreground/60"
            />
          </SidebarSection>

          {/* Mode Buttons */}
          <SidebarSection separator title="Tools" icon={<Wand2 size={12} />}>
            <div className="space-y-2">
              <Button
                variant={isRepaintMode ? 'default' : 'ghost'}
                className={`w-full gap-2 ${!isRepaintMode ? 'bg-primary/20 text-primary border border-primary hover:bg-primary hover:text-white' : ''}`}
                onClick={() => {
                  if (!isRepaintMode) setSelectMode(false)
                  setRepaintMode(!isRepaintMode)
                }}
              >
                <Paintbrush size={14} />
                {isRepaintMode ? 'Exit Repaint Mode' : 'Repaint Mode'}
              </Button>
              <Button
                variant={isSelectMode ? 'default' : 'ghost'}
                className={`w-full gap-2 ${!isSelectMode ? 'bg-primary/20 text-primary border border-primary hover:bg-primary hover:text-white' : ''}`}
                onClick={() => {
                  const newSelectMode = !isSelectMode
                  setSelectMode(newSelectMode)
                  // Disable repaint mode when enabling select mode
                  if (newSelectMode && isRepaintMode) {
                    setRepaintMode(false)
                  }
                }}
              >
                <MousePointer2 size={14} />
                {isSelectMode ? 'Exit Select Mode' : 'Select Mode'}
              </Button>
            </div>

            {/* Select Mode Debug View */}
            {isSelectMode && selectDebugInfo && (
              <div className="bg-background/50 p-3 rounded-lg border border-border space-y-3 mt-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium">Debug</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-5 text-[10px] px-2"
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
          </SidebarSection>

          {/* Repaint Mode UI */}
          {isRepaintMode && (
            <SidebarSection separator title="Repaint Mode" icon={<Paintbrush size={12} />}>
              <div className="flex justify-end mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => {
                    setRepaintMode(false)
                    clearRepaintStrokes()
                    setRepaintResult(null)
                    setDebugInfo(null)
                  }}
                >
                  <X className="w-3 h-3 mr-1" />
                  Exit
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium mb-2 block flex items-center gap-1">
                    Brush Size
                    <span className="text-muted-foreground">({brushSize}px)</span>
                  </label>
                  <Slider
                    value={[brushSize]}
                    min={10}
                    max={200}
                    step={10}
                    onValueChange={([val]) => setBrushSize(val)}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium mb-2 block">Repaint Prompt</label>
                  <Textarea
                    value={repaintPrompt}
                    onChange={e => setRepaintPrompt(e.target.value)}
                    placeholder="Describe what to paint in the selected area..."
                    className="h-20 text-sm bg-background/50 border-2 border-border/60 hover:border-border transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="default"
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
                          repaintPrompt,
                          styleReferenceUrls
                        )
                        setRepaintResult(result)
                      } catch (error) {
                        console.error('Repaint failed:', error)
                        toast.error('Repaint failed. Check console.')
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
                        Generate
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    className="gap-1"
                    onClick={() => {
                      clearRepaintStrokes()
                      setRepaintResult(null)
                      setDebugInfo(null)
                    }}
                  >
                    <Trash2 size={14} />
                    Clear
                  </Button>
                </div>

                {/* Debug View */}
                {debugInfo && (
                  <div className="mt-4 border-t border-border pt-4">
                    <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
                      <Eye size={12} />
                      Debug View
                    </h4>
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
                        <p className="text-[10px] text-muted-foreground mb-1">Mask (White=Edit)</p>
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
                        variant="default"
                        className="flex-1 gap-2"
                        onClick={async () => {
                          try {
                            await repaintService.applyRepaint(repaintResult)
                            toast.success('Repaint applied successfully')
                            setRepaintResult(null)
                            clearRepaintStrokes()
                            setDebugInfo(null)
                          } catch (e) {
                            console.error(e)
                            toast.error('Failed to apply repaint')
                          }
                        }}
                      >
                        <Check size={14} />
                        Apply
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() => setRepaintResult(null)}
                      >
                        <X size={14} />
                        Discard
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </SidebarSection>
          )}

          {/* Generation Group */}
          <SidebarSection separator title="Generation" icon={<ImagePlus size={12} />}>
            {generationDebugInfo && (
              <div className="flex items-center gap-2 mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs gap-1"
                  onClick={() => setShowDebug(!showDebug)}
                >
                  {showDebug ? <EyeOff size={12} /> : <Eye size={12} />}
                  Debug
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setGenerationDebugInfo(null)}
                >
                  Clear
                </Button>
              </div>
            )}

            <div className="space-y-1 mb-3">
              <label className="text-xs font-medium flex items-center gap-1">
                Tile Description
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info size={10} className="text-muted-foreground/60 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Describe what should appear in this tile</p>
                  </TooltipContent>
                </Tooltip>
              </label>
              <input
                type="text"
                value={tilePrompt}
                onChange={e => setTilePrompt(e.target.value)}
                placeholder="e.g., church, forest, river..."
                className="w-full bg-background/50 border-2 border-border/60 rounded-md px-3 py-2 text-sm hover:border-border transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30 focus:outline-none placeholder:text-muted-foreground/60"
              />
            </div>

            {selectedTiles.length > 0 ? (
              <div className="space-y-3">
                <div className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                  <MousePointer2 size={10} />
                  Selected: {selectedTiles[0].x}, {selectedTiles[0].y}
                  {generatingTiles[`${selectedTiles[0].x},${selectedTiles[0].y}`] && (
                    <span className="ml-2 text-yellow-500">(generating)</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={handleGenerate}
                    disabled={
                      !!generatingTiles[`${selectedTiles[0].x},${selectedTiles[0].y}`] || isUploading
                    }
                    className="flex-1 gap-2 bg-primary/20 text-primary border border-primary hover:bg-primary hover:text-white"
                  >
                    {generatingTiles[`${selectedTiles[0].x},${selectedTiles[0].y}`] ? (
                      <>
                        <Loader2 className="animate-spin" size={14} />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        Generate
                      </>
                    )}
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={
                          !!generatingTiles[`${selectedTiles[0].x},${selectedTiles[0].y}`] || isUploading
                        }
                        size="icon"
                      >
                        {isUploading ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          <Upload size={16} />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Upload image</p>
                    </TooltipContent>
                  </Tooltip>
                  {/* Delete tile button - only show if tile exists */}
                  {tiles[`${selectedTiles[0].x},${selectedTiles[0].y}`] && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          onClick={async () => {
                            const tile = selectedTiles[0]
                            if (confirm(`Delete tile at (${tile.x}, ${tile.y})?`)) {
                              try {
                                await useWorldStore.getState().removeTile(tile.x, tile.y)
                                toast.success(`Tile (${tile.x}, ${tile.y}) deleted`)
                              } catch (err) {
                                toast.error('Failed to delete tile')
                              }
                            }
                          }}
                          disabled={!!generatingTiles[`${selectedTiles[0].x},${selectedTiles[0].y}`]}
                          size="icon"
                          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Delete tile</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadTile}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-md">
                Select a tile on the canvas to generate or upload
              </div>
            )}

            {/* Generation Debug View */}
            {generationDebugInfo && showDebug && (
              <div className="mt-3 bg-background/50 p-3 rounded-lg border border-border">
                <h4 className="text-xs font-semibold mb-2">Debug Context</h4>

                {generationDebugInfo.assembledContext && (
                  <div className="mb-2">
                    <p className="text-[10px] text-muted-foreground mb-1">Inline Data (Assembled)</p>
                    <img
                      src={generationDebugInfo.assembledContext}
                      className="w-full h-auto border border-border rounded"
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
                <div className="text-[10px] text-muted-foreground bg-background p-2 rounded border border-border">
                  Prompt: {generationDebugInfo.prompt}
                </div>
              </div>
            )}
          </SidebarSection>

          {/* Upscale Group */}
          <SidebarSection separator title="Upscale" icon={<ZoomIn size={12} />}>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-2 flex items-center gap-1">
                  Creativity
                  <span className="text-muted-foreground">({upscaleCreativity})</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={10} className="text-muted-foreground/60 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Higher = more creative details, Lower = more faithful to original</p>
                    </TooltipContent>
                  </Tooltip>
                </label>
                <Slider
                  value={[upscaleCreativity]}
                  min={0}
                  max={1}
                  step={0.1}
                  onValueChange={([val]) => setUpscaleCreativity(val)}
                />
              </div>
              <Button
                variant="ghost"
                className="w-full gap-2 bg-primary/20 text-primary border border-primary hover:bg-primary hover:text-white"
                onClick={async () => {
                  if (selectedTile) {
                    const fullTile = tiles[`${selectedTile.x},${selectedTile.y}`]
                    if (fullTile) {
                      toast.promise(upscaleService.upscale(fullTile, upscaleCreativity, styleReferenceUrls), {
                        loading: 'Upscaling...',
                        success: 'Tile queued for upscaling!',
                        error: 'Upscale failed',
                      })
                    }
                  }
                }}
                disabled={
                  !selectedTile ||
                  (selectedTile && !!upscalingTiles[`${selectedTile.x},${selectedTile.y}`])
                }
              >
                <ZoomIn size={14} />
                Upscale (4x)
              </Button>
            </div>
          </SidebarSection>

          {/* Enhance Fidelity Group */}
          <SidebarSection separator title="Enhance Fidelity" icon={<Sparkles size={12} />}>
            <div className="space-y-3">
              <button
                onClick={() => setShowFidelityPrompt(!showFidelityPrompt)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showFidelityPrompt ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showFidelityPrompt ? 'Hide' : 'Show'} style prompt
              </button>

              <div className="space-y-1">
                <label className="text-xs font-medium flex items-center gap-1">
                  Creativity
                  <span className="text-muted-foreground">({fidelityCreativity})</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={10} className="text-muted-foreground/60 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Higher = more creative freedom, Lower = stricter adherence to original structure</p>
                    </TooltipContent>
                  </Tooltip>
                </label>
                <Slider
                  value={[fidelityCreativity]}
                  min={0}
                  max={1}
                  step={0.1}
                  onValueChange={([val]) => setFidelityCreativity(val)}
                />
              </div>

              {showFidelityPrompt && (
                <div className="space-y-2">
                  <Textarea
                    value={fidelityPrompt}
                    onChange={e => handleFidelityPromptChange(e.target.value)}
                    placeholder="Describe the artistic style to apply..."
                    className="h-20 text-sm bg-background/50 border-2 border-border/60 hover:border-border transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    This prompt guides how Gemini enhances the tile&apos;s artistic fidelity.
                  </p>
                </div>
              )}

              <Button
                onClick={async () => {
                  if (selectedTile) {
                    const fullTile = tiles[`${selectedTile.x},${selectedTile.y}`]
                    if (fullTile) {
                      toast.promise(fidelityService.enhance(fullTile, fidelityPrompt, fidelityCreativity, styleReferenceUrls), {
                        loading: 'Enhancing fidelity...',
                        success: 'Tile queued for fidelity enhancement!',
                        error: err => `Enhancement failed: ${err.message}`,
                      })
                    }
                  }
                }}
                variant="ghost"
                className="w-full gap-2 bg-primary/20 text-primary border border-primary hover:bg-primary hover:text-white"
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
              </Button>
            </div>
          </SidebarSection>

          {/* Assets Group */}
          <SidebarSection separator title="Assets" icon={<Package size={12} />}>
            <AssetsPanel />
          </SidebarSection>

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20">
              {error}
            </div>
          )}
        </div>
      )}

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
    </TooltipProvider>
  )

  return (
    <DomainSidebar header="World Gen" storageKey="world-gen">
      {sidebarContent}
    </DomainSidebar>
  )
}
