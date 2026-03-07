import React, { useRef, useEffect, useState } from 'react'
import { TOUR_STEP_IDS } from '@/lib/tour-constants'
import { useWorldStore, Tile } from '@/domains/world-building-toolkit/store/useWorldStore'
import { assembleContextImage } from '@/infrastructure/ai/contextAssembler'
import { upscaleService } from '@/domains/world-building-toolkit/services/UpscaleService'
import { tileGenerationService } from '@/domains/world-building-toolkit/services/TileGenerationService'
import { fidelityService } from '@/domains/world-building-toolkit/services/FidelityService'
import { LocalStorageKeys } from '@/constants/localStorage'
import { Button } from '@/components/ui/button'
import { AssetsPanel } from '@/domains/world-building-toolkit/components/AssetsPanel'
import { MjVariantPicker } from '@/domains/world-building-toolkit/components/MjVariantPicker'
import { TileReviewDialog } from '@/domains/world-building-toolkit/components/TileReviewDialog'
import {
  DomainSidebar,
  SidebarSection,
  SidebarEmptyState,
  SidebarHeader,
  SidebarLabel,
  SidebarSliderRow,
  SidebarTextarea,
  SidebarInput,
} from '@/components/ui/domain-sidebar'
import {
  Loader2,
  Plus,
  Eye,
  EyeOff,
  Upload,
  BookOpen,
  Sparkles,
  Palette,
  MousePointer2,
  ImagePlus,
  ZoomIn,
  Package,
  Info,
  Trash2,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import toast from 'react-hot-toast'

export const Sidebar: React.FC = () => {
  const defaultMasterPrompt = ''

  const currentProject = useWorldStore(state => state.currentProject)
  const assets = useWorldStore(state => state.assets)
  const showAllAssetMasks = useWorldStore(state => state.showAllAssetMasks)
  const setShowAllAssetMasks = useWorldStore(state => state.setShowAllAssetMasks)

  const [masterPrompt, setMasterPrompt] = useState('')
  const [tilePrompt, setTilePrompt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [upscaleCreativity, setUpscaleCreativity] = useState(0.3)
  const [showDebug, setShowDebug] = useState(false)

  // Load master prompt from localStorage when project changes
  useEffect(() => {
    if (typeof window !== 'undefined' && currentProject?.id) {
      const savedPrompt = localStorage.getItem(
        `${LocalStorageKeys.MASTER_PROMPT}-${currentProject.id}`
      )
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

  // Auto-approve state (persisted in localStorage)
  const [autoApprove, setAutoApprove] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('world-gen-auto-approve') === 'true'
    }
    return false
  })

  const handleAutoApproveChange = (checked: boolean) => {
    setAutoApprove(checked)
    if (typeof window !== 'undefined') {
      localStorage.setItem('world-gen-auto-approve', String(checked))
    }
  }

  // Pending review state
  const pendingGenerations = useWorldStore(state => state.pendingGenerations)
  const pendingFidelity = useWorldStore(state => state.pendingFidelity)
  const [reviewDialog, setReviewDialog] = useState<{
    type: 'generation' | 'fidelity'
    x: number
    y: number
    newUrl: string
    originalUrl?: string
  } | null>(null)

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
      if (!blob || blob.size === 0) {
        console.error('[Sidebar] blobToDataUrl received invalid blob:', { blob, size: blob?.size })
        reject(new Error('Invalid blob'))
        return
      }

      console.log('[Sidebar] Converting blob to data URL:', { size: blob.size, type: blob.type })

      const reader = new FileReader()
      reader.onloadend = () => {
        const dataUrl = reader.result as string
        console.log('[Sidebar] Data URL created:', {
          length: dataUrl?.length,
          prefix: dataUrl?.substring(0, 50),
          isValid: dataUrl?.startsWith('data:image/'),
        })
        resolve(dataUrl)
      }
      reader.onerror = e => {
        console.error('[Sidebar] FileReader error:', e)
        reject(new Error('FileReader error'))
      }
      reader.readAsDataURL(blob)
    })
  }

  const loadImageAsDataUrl = async (
    tile: Tile | undefined
  ): Promise<(Tile & { imageUrl?: string }) | undefined> => {
    if (!tile || !currentProject) return tile

    // If the filename is already a full URL, use it directly; otherwise build a local path
    const imageUrl = tile.image_filename.startsWith('http')
      ? tile.image_filename
      : `/projects/${currentProject.id}/${tile.image_filename}`

    try {
      // Fetch the image and convert to base64
      const response = await fetch(imageUrl)
      if (!response.ok) {
        console.error(`Failed to fetch neighbor image (${response.status}):`, imageUrl)
        return tile
      }

      const contentType = response.headers.get('content-type') || ''
      if (!contentType.startsWith('image/')) {
        console.error(`Neighbor image returned non-image content-type (${contentType}):`, imageUrl)
        return tile
      }

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
      // Check if there are any neighbors (for follow-up vs first tile)
      const hasNeighbors = [
        tiles[`${x},${y - 1}`],
        tiles[`${x},${y + 1}`],
        tiles[`${x - 1},${y}`],
        tiles[`${x + 1},${y}`],
      ].some(Boolean)

      // Build prompt: only use master prompt for first tile
      // For follow-up tiles, use tile description only (better edge matching)
      // Fallback to master prompt if no tile description provided
      const effectiveTilePrompt = tilePrompt.trim() || masterPrompt
      const fullPrompt = hasNeighbors
        ? effectiveTilePrompt
        : `${tilePrompt}, ${masterPrompt}`.replace(/^, /, '')

      // Keep context assembly always on (critical), but move it off the click critical path.
      // We schedule heavy canvas assembly for idle time and do not block generation start.
      const contextAssemblyTask = (async () => {
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

        await new Promise<void>(resolve => {
          const requestIdle = (window as any).requestIdleCallback as
            | ((cb: () => void, opts?: { timeout: number }) => number)
            | undefined
          if (typeof requestIdle === 'function') {
            requestIdle(() => resolve(), { timeout: 400 })
          } else {
            setTimeout(resolve, 0)
          }
        })

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
      })()

      // Trigger generation immediately via Trigger.dev background task.
      await tileGenerationService.generate(currentProject.id, x, y, fullPrompt, styleReferenceUrls)

      // Do not block UX on context debug completion.
      void contextAssemblyTask.catch(err => {
        console.error('[Sidebar] Context assembly failed:', err)
      })

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
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20">
              {error}
            </div>
          )}
          {/* Master Prompt */}
          <div id={TOUR_STEP_IDS.WORLDGEN_STYLE_PROMPT}>
            <SidebarSection
              icon={<Palette size={12} />}
              title="Style Prompt"
              rightContent={
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={12} className="text-muted-foreground/60 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p className="max-w-[200px]">
                        Define the overall art style that will be applied to all generated tiles
                      </p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] gap-1 font-mono"
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
              }
            >
              <SidebarTextarea
                value={masterPrompt}
                onChange={e => handleMasterPromptChange(e.target.value)}
                placeholder="Define the overall art style and aesthetic..."
                className="h-24"
              />
            </SidebarSection>
          </div>

          {/* Generation Group */}
          <SidebarSection separator title="Generation" icon={<ImagePlus size={12} />}>
            {generationDebugInfo && (
              <div className="flex items-center gap-2 mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs gap-1 font-mono"
                  onClick={() => setShowDebug(!showDebug)}
                >
                  {showDebug ? <EyeOff size={12} /> : <Eye size={12} />}
                  Debug
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs font-mono"
                  onClick={() => setGenerationDebugInfo(null)}
                >
                  Clear
                </Button>
              </div>
            )}

            <div className="space-y-1 mb-3" id={TOUR_STEP_IDS.WORLDGEN_PROMPT}>
              <SidebarLabel className="flex items-center gap-1">
                Tile Description
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info size={10} className="text-muted-foreground/60 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Describe what should appear in this tile</p>
                  </TooltipContent>
                </Tooltip>
              </SidebarLabel>
              <SidebarInput
                type="text"
                value={tilePrompt}
                onChange={e => setTilePrompt(e.target.value)}
                placeholder="e.g., church, forest, river..."
              />
            </div>

            {/* Selection Status */}
            {selectedTiles.length > 0 && (
              <div className="text-xs font-mono text-muted-foreground flex items-center gap-1 mb-3">
                <MousePointer2 size={10} />
                Selected: {selectedTiles[0].x}, {selectedTiles[0].y}
                {generatingTiles[`${selectedTiles[0].x},${selectedTiles[0].y}`] && (
                  <span className="ml-2 text-yellow-500">(generating)</span>
                )}
              </div>
            )}

            <div className="flex gap-2 mb-3">
              <div id={TOUR_STEP_IDS.WORLDGEN_GENERATE} className="flex-1">
                <Button
                  variant="ghost"
                  onClick={handleGenerate}
                  disabled={
                    selectedTiles.length === 0 ||
                    (selectedTiles.length > 0 &&
                      !!generatingTiles[`${selectedTiles[0].x},${selectedTiles[0].y}`]) ||
                    isUploading
                  }
                  className="group w-full gap-2 text-purple-400 border border-purple-500/40 hover:bg-purple-500 hover:text-white hover:border-purple-500 font-mono disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {selectedTiles.length > 0 &&
                    generatingTiles[`${selectedTiles[0].x},${selectedTiles[0].y}`] ? (
                    <>
                      <Loader2 className="animate-spin text-purple-400 group-hover:text-white transition-colors duration-200" size={14} />
                      <span className="text-purple-400 group-hover:text-white transition-colors duration-200">Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="text-purple-400 group-hover:text-white transition-colors duration-200" size={14} />
                      <span className="text-purple-400 group-hover:text-white transition-colors duration-200">Generate</span>
                    </>
                  )}
                </Button>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={
                      selectedTiles.length === 0 ||
                      (selectedTiles.length > 0 &&
                        !!generatingTiles[`${selectedTiles[0].x},${selectedTiles[0].y}`]) ||
                      isUploading
                    }
                    size="icon"
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
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
              {selectedTiles.length > 0 &&
                tiles[`${selectedTiles[0].x},${selectedTiles[0].y}`] && (
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
                        disabled={
                          !!generatingTiles[`${selectedTiles[0].x},${selectedTiles[0].y}`]
                        }
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

            {selectedTiles.length === 0 && (
              <div className="text-[10px] text-muted-foreground text-center mb-3 opacity-60">
                Select a tile to enable generation
              </div>
            )}

            {/* Generation Debug View */}
            {generationDebugInfo && showDebug && (
              <div className="mt-3 bg-zinc-900/30 p-3 rounded-lg border border-zinc-800/50">
                <h4 className="text-xs font-semibold mb-2">Debug Context</h4>

                {generationDebugInfo.assembledContext && (
                  <div className="mb-2">
                    <p className="text-[10px] text-muted-foreground mb-1">
                      Inline Data (Assembled)
                    </p>
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
                <div className="text-[10px] text-zinc-500 bg-zinc-950 p-2 rounded border border-zinc-800">
                  Prompt: {generationDebugInfo.prompt}
                </div>
              </div>
            )}
          </SidebarSection>

          {/* Upscale Group */}
          <SidebarSection separator title="Upscale" icon={<ZoomIn size={12} />}>
            <div className="space-y-3">
              <SidebarSliderRow
                label="Creativity"
                value={upscaleCreativity}
                min={0}
                max={1}
                step={0.1}
                onChange={setUpscaleCreativity}
              />
              <div id={TOUR_STEP_IDS.WORLDGEN_UPSCALE}>
                <Button
                  variant="ghost"
                  className="w-full gap-2 hover:bg-accent hover:text-accent-foreground text-primary border border-primary/40 hover:border-primary/60 font-mono"
                  onClick={async () => {
                    if (selectedTile) {
                      const fullTile = tiles[`${selectedTile.x},${selectedTile.y}`]
                      if (fullTile) {
                        toast.promise(
                          upscaleService.upscale(fullTile, upscaleCreativity, styleReferenceUrls),
                          {
                            loading: 'Upscaling...',
                            success: 'Tile queued for upscaling!',
                            error: 'Upscale failed',
                          }
                        )
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
            </div>
          </SidebarSection>

          {/* Enhance Fidelity Group */}
          <SidebarSection separator title="Enhance Fidelity" icon={<Sparkles size={12} />}>
            <div className="space-y-3">
              <SidebarSliderRow
                label="Creativity"
                value={fidelityCreativity}
                min={0}
                max={1}
                step={0.1}
                onChange={setFidelityCreativity}
              />

              <Button
                onClick={async () => {
                  if (selectedTile) {
                    const fullTile = tiles[`${selectedTile.x},${selectedTile.y}`]
                    if (fullTile) {
                      toast.promise(
                        fidelityService.enhance(
                          fullTile,
                          fidelityPrompt,
                          fidelityCreativity,
                          styleReferenceUrls
                        ),
                        {
                          loading: 'Enhancing fidelity...',
                          success: 'Tile queued for fidelity enhancement!',
                          error: err => `Enhancement failed: ${err.message}`,
                        }
                      )
                    }
                  }
                }}
                variant="ghost"
                className="w-full gap-2 hover:bg-accent hover:text-accent-foreground text-primary border border-primary/40 hover:border-primary/60 font-mono"
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
          <SidebarSection
            separator
            title="Assets"
            icon={<Package size={12} />}
            rightContent={
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">{assets.length}</span>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    setShowAllAssetMasks(!showAllAssetMasks)
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showAllAssetMasks ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
              </div>
            }
          >
            <AssetsPanel />
          </SidebarSection>
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
    <>
      <DomainSidebar
        header={
          <div className="flex items-center justify-between w-full pl-2">
            <SidebarHeader>World Gen</SidebarHeader>
          </div>
        }
        storageKey="world-gen"
      >
        {sidebarContent}
      </DomainSidebar>

      {/* Tile Review Dialog */}
      {reviewDialog && (
        <TileReviewDialog
          open={true}
          onClose={() => setReviewDialog(null)}
          tileX={reviewDialog.x}
          tileY={reviewDialog.y}
          newUrl={reviewDialog.newUrl}
          originalUrl={reviewDialog.originalUrl}
          type={reviewDialog.type}
        />
      )}
    </>
  )
}
