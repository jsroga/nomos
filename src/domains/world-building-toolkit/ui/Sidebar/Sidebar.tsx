import React, { useRef, useEffect, useState, useMemo } from 'react'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { useWorldStore, Tile } from '@/domains/world-building-toolkit'
import { assembleContextImage, type ContextImageVariant } from '@/shared/ai/contextAssembler'
import { upscaleService } from '@/domains/world-building-toolkit/state/client-services/UpscaleService'
import {
  tileGenerationService,
  type FollowUpContextPayload,
} from '@/domains/world-building-toolkit/state/client-services/TileGenerationService'
import { fidelityService } from '@/domains/world-building-toolkit/state/client-services/FidelityService'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import { STYLE_PRESETS_MAP } from '@/shared/data/constants/style-presets'
import { Button } from '@/components/Button'
import { AssetsPanel } from '@/domains/world-building-toolkit/ui/AssetsPanel'
import { MjVariantPicker } from '@/domains/world-building-toolkit/ui/MjVariantPicker'
import {
  DomainSidebar,
  SidebarSection,
  SidebarEmptyState,
  SidebarHeader,
  SidebarLabel,
  SidebarSliderRow,
  SidebarTextarea,
  SidebarInput,
} from '@/components/DomainSidebar'
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
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/Tooltip'
import toast from 'react-hot-toast'
import { customEventDetailRecord, fileReaderText, readNumber, readString, recordFromJson, stringArrayFromJson } from '@/shared/data/json-guards'
import { parseUpscaleProvider, UpscaleProvider } from '../../core/upscale-provider-wire'

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
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)

  const [isDebugMode] = useState(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem(LocalStorageKeys.DEBUG_MODE) === '2137'
      : false
  )
  const [upscaleProvider, setUpscaleProvider] = useState<UpscaleProvider>(() => {
    if (typeof window !== 'undefined') {
      return parseUpscaleProvider(localStorage.getItem(LocalStorageKeys.AI_ACTIVE_UPSCALER))
    }
    return UpscaleProvider.Stability
  })

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

  const selectedTiles = useWorldStore(state => state.selectedTiles)
  const selectedTile = useWorldStore(state => state.selectedTile)
  const tiles = useWorldStore(state => state.tiles)
  const generatingTiles = useWorldStore(state => state.generatingTiles)
  const generationDebugInfo = useWorldStore(state => state.generationDebugInfo)
  const setGenerationDebugInfo = useWorldStore(state => state.setGenerationDebugInfo)
  const upscalingTiles = useWorldStore(state => state.upscalingTiles)
  const enhancingTiles = useWorldStore(state => state.enhancingTiles)

  const [styleReferenceUrls, setStyleReferenceUrls] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isFetchingSummary, setIsFetchingSummary] = useState(false)

  // Which single style-reference image to send to MJ (persisted per project+preset)
  const styleUrlLocalStorageKey = currentProject?.id
    ? `worldgen-style-url-idx-${currentProject.id}-${currentProject.stylePreset || 'custom'}`
    : null

  const [selectedStyleUrlIndex, setSelectedStyleUrlIndex] = useState<number>(0)

  // Load saved index when project or preset changes
  useEffect(() => {
    if (!styleUrlLocalStorageKey) return
    const saved = localStorage.getItem(styleUrlLocalStorageKey)
    setSelectedStyleUrlIndex(saved !== null ? parseInt(saved, 10) : 0)
  }, [styleUrlLocalStorageKey])

  const handleSelectStyleUrl = (index: number) => {
    setSelectedStyleUrlIndex(index)
    if (styleUrlLocalStorageKey) {
      localStorage.setItem(styleUrlLocalStorageKey, String(index))
    }
  }

  // The full list of available style URLs (preset takes priority over custom)
  const activeStyleUrls = useMemo(() => {
    if (currentProject?.stylePreset) {
      const preset = STYLE_PRESETS_MAP[currentProject.stylePreset]
      if (preset && preset.urls.length > 0) return preset.urls
    }
    return styleReferenceUrls
  }, [currentProject?.stylePreset, styleReferenceUrls])

  // Single URL sent to MJ – always just one image
  const effectiveStyleUrls = useMemo(() => {
    if (activeStyleUrls.length === 0) return []
    const idx = Math.min(selectedStyleUrlIndex, activeStyleUrls.length - 1)
    return [activeStyleUrls[idx]]
  }, [activeStyleUrls, selectedStyleUrlIndex])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fidelity enhancement state
  const [fidelityPrompt] = useState(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem(LocalStorageKeys.FIDELITY_PROMPT) ||
        'Enhance with fine artistic details, crisp textures, and vibrant colors while maintaining the original composition.'
      )
    }
    return 'Enhance with fine artistic details, crisp textures, and vibrant colors while maintaining the original composition.'
  })
  const [fidelityCreativity, setFidelityCreativity] = useState(0.3)

  // MJ Variant Picker state
  type MjGridData = {
    tileId: string
    tileX: number
    tileY: number
    gridImageUrl: string
    buttons: unknown[]
    taskId: string
  }

  function mjGridDataFromEvent(event: Event): MjGridData | null {
    const detail = customEventDetailRecord(event)
    const tileId = readString(detail.tileId)
    const gridImageUrl = readString(detail.gridImageUrl)
    const taskId = readString(detail.taskId)
    const tileX = readNumber(detail.tileX)
    const tileY = readNumber(detail.tileY)
    if (!tileId || !gridImageUrl || !taskId || tileX === undefined || tileY === undefined) {
      return null
    }
    return {
      tileId,
      tileX,
      tileY,
      gridImageUrl,
      buttons: Array.isArray(detail.buttons) ? detail.buttons : [],
      taskId,
    }
  }

  const [mjGridData, setMjGridData] = useState<MjGridData | null>(null)

  // Listen for MJ grid ready event
  useEffect(() => {
    const handleMjGridReady = (event: Event) => {
      const data = mjGridDataFromEvent(event)
      if (data) {
        console.log('MJ grid ready:', data)
        setMjGridData(data)
      }
    }

    window.addEventListener('mj-grid-ready', handleMjGridReady)
    return () => {
      window.removeEventListener('mj-grid-ready', handleMjGridReady)
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
  const blobToRawBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const dataUrl = fileReaderText(reader.result)
        if (!dataUrl || !dataUrl.includes(',')) reject(new Error('Invalid data URL'))
        else resolve(dataUrl.split(',')[1])
      }
      reader.onerror = () => reject(new Error('FileReader error'))
      reader.readAsDataURL(blob)
    })

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
        const dataUrl = fileReaderText(reader.result)
        console.log('[Sidebar] Data URL created:', {
          length: dataUrl?.length,
          prefix: dataUrl?.substring(0, 50),
          isValid: dataUrl?.startsWith('data:image/'),
        })
        if (dataUrl) resolve(dataUrl)
        else reject(new Error('FileReader error'))
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
    if (!tile || !currentProject || !tile.image_filename) return tile

    const imageUrl = tile.image_filename.startsWith('http')
      ? tile.image_filename
      : `${window.location.origin}/projects/${currentProject.id}/${tile.image_filename}`

    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()

      return new Promise(resolve => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const imageUrl = fileReaderText(reader.result)
          if (imageUrl) {
            resolve({
              ...tile,
              imageUrl,
            })
          } else {
            resolve(undefined)
          }
        }
        reader.onerror = () => resolve(undefined)
        reader.readAsDataURL(blob)
      })
    } catch (e) {
      console.error('Failed to load neighbor image:', e)
      return undefined
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

      let followUpContext: FollowUpContextPayload | undefined

      if (hasNeighbors) {
        const [upTile, downTile, leftTile, rightTile, topLeftTile, topRightTile, bottomLeftTile, bottomRightTile] =
          await Promise.all([
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

        const contextInput = { targetX: x, targetY: y, neighbors, allTiles: tiles }
        const preferredVariant: ContextImageVariant = 'canonicalFullContext'
        const canonicalContext = await assembleContextImage(
          contextInput,
          1024,
          'canonicalFullContext'
        )

        if (canonicalContext.directNeighborCount === 0) {
          throw new Error('Failed to load direct neighbor context for follow-up tile generation')
        }

        const [canonicalBase64, maskBase64] = await Promise.all([
          blobToRawBase64(canonicalContext.imageBlob),
          blobToRawBase64(canonicalContext.maskBlob),
        ])
        followUpContext = {
          images: {
            canonicalFullContext: canonicalBase64,
          },
          maskBase64,
          preferredVariant,
        }

        const getImageUrl = (tile: (Tile & { imageUrl?: string }) | undefined) => tile?.imageUrl
        blobToDataUrl(canonicalContext.imageBlob).then(assembledContext =>
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
            prompt: fullPrompt,
            assembledContext,
            contextVariant: preferredVariant,
            contextStrategy: canonicalContext.strategy.mode,
            weightedNeighbors: canonicalContext.strategy.weightedNeighbors,
            provider: 'nano-banana',
          })
        ).catch(() => { })
      }

      await tileGenerationService.generate(
        currentProject.id,
        x,
        y,
        fullPrompt,
        effectiveStyleUrls,
        followUpContext
      )

      toast.success(`Tile (${x},${y}) generation started!`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(err)
      toast.error(`Generation failed: ${msg}`)
      setError(`Generation failed: ${msg}`)
    }
  }

  const handleGenerate = async () => {
    if (selectedTiles.length === 0 || !currentProject) return

    const tile = selectedTiles[0]
    if (generatingTiles[`${tile.x},${tile.y}`]) return

    setError(null)
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
      const reader = new FileReader()
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const dataUrl = fileReaderText(reader.result)
          if (dataUrl) resolve(dataUrl)
          else reject(new Error('FileReader error'))
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

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

      useWorldStore.setState({
        tiles: {
          ...useWorldStore.getState().tiles,
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
      })

      toast.success(`Tile (${tile.x},${tile.y}) uploaded!`)
    } catch (err: unknown) {
      console.error(err)
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Upload failed: ${msg}`)
      setError(`Upload failed: ${msg}`)
    } finally {
      setIsUploading(false)
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

          <SidebarSection separator title="Generation" icon={<ImagePlus size={12} />}>
            {isDebugMode && generationDebugInfo && (
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

            {selectedTiles.length > 0 && (
              <div className="text-xs font-mono text-muted-foreground flex items-center gap-1 mb-3">
                <MousePointer2 size={10} />
                Selected: {selectedTiles[0].x}, {selectedTiles[0].y}
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
                      generatingTiles[`${selectedTiles[0].x},${selectedTiles[0].y}`]) ||
                    isUploading
                  }
                  className="group w-full gap-2 text-purple-400 border border-purple-500/40 hover:bg-purple-500 hover:text-white hover:border-purple-500 font-mono disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {selectedTiles.length > 0 &&
                  generatingTiles[`${selectedTiles[0].x},${selectedTiles[0].y}`] ? (
                    <>
                      <Loader2
                        className="animate-spin text-purple-400 group-hover:text-white transition-colors duration-200"
                        size={14}
                      />
                      <span className="text-purple-400 group-hover:text-white transition-colors duration-200">
                        Generate
                      </span>
                    </>
                  ) : (
                    <>
                      <Sparkles
                        className="text-purple-400 group-hover:text-white transition-colors duration-200"
                        size={14}
                      />
                      <span className="text-purple-400 group-hover:text-white transition-colors duration-200">
                        Generate
                      </span>
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
                        generatingTiles[`${selectedTiles[0].x},${selectedTiles[0].y}`]) ||
                      isUploading
                    }
                    size="icon"
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Upload image</p>
                </TooltipContent>
              </Tooltip>

              {selectedTiles.length > 0 && tiles[`${selectedTiles[0].x},${selectedTiles[0].y}`] && (
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
                          } catch {
                            toast.error('Failed to delete tile')
                          }
                        }
                      }}
                      disabled={generatingTiles[`${selectedTiles[0].x},${selectedTiles[0].y}`]}
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

            {isDebugMode && generationDebugInfo && showDebug && (() => {
              const debug = generationDebugInfo
              const neighbors = recordFromJson(debug.neighbors)
              const neighborSrc = (key: string) => readString(neighbors[key])
              const weighted = stringArrayFromJson(debug.weightedNeighbors).join(', ') || 'none'
              const assembledContext = readString(debug.assembledContext)
              const canonicalContext = readString(debug.canonicalContext)
              const prompt = readString(debug.prompt)
              return (
              <div className="mt-3 bg-zinc-900/30 p-3 rounded-lg border border-zinc-800/50">
                <h4 className="text-xs font-semibold mb-2">Debug Context</h4>
                <div className="text-[10px] text-zinc-500 bg-zinc-950 p-2 rounded border border-zinc-800 mb-2">
                  Provider: {readString(debug.provider) ?? 'unknown'} | Variant:{' '}
                  {readString(debug.contextVariant) ?? 'canonicalFullContext'}
                </div>
                {readString(debug.contextStrategy) && (
                  <div className="text-[10px] text-zinc-500 bg-zinc-950 p-2 rounded border border-zinc-800 mb-2">
                    Strategy: {readString(debug.contextStrategy)} | Weighted: {weighted}
                  </div>
                )}
                {assembledContext && (
                  <div className="mb-2">
                    <p className="text-[10px] text-muted-foreground mb-1">Provider Input Context</p>
                    <img
                      src={assembledContext}
                      className="w-full h-auto border border-border rounded"
                      alt="Assembled Context"
                    />
                  </div>
                )}
                {canonicalContext && (
                  <div className="mb-2">
                    <p className="text-[10px] text-muted-foreground mb-1">Canonical Full Context</p>
                    <img
                      src={canonicalContext}
                      className="w-full h-auto border border-border rounded"
                      alt="Canonical Context"
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
                  {neighborSrc('topLeft') && <img src={neighborSrc('topLeft')} className="col-start-1 row-start-1 w-full h-full object-cover border border-border" alt="" />}
                  {neighborSrc('up') && <img src={neighborSrc('up')} className="col-start-2 row-start-1 w-full h-full object-cover border border-border" alt="" />}
                  {neighborSrc('topRight') && <img src={neighborSrc('topRight')} className="col-start-3 row-start-1 w-full h-full object-cover border border-border" alt="" />}
                  {neighborSrc('left') && <img src={neighborSrc('left')} className="col-start-1 row-start-2 w-full h-full object-cover border border-border" alt="" />}
                  {neighborSrc('right') && <img src={neighborSrc('right')} className="col-start-3 row-start-2 w-full h-full object-cover border border-border" alt="" />}
                  {neighborSrc('bottomLeft') && <img src={neighborSrc('bottomLeft')} className="col-start-1 row-start-3 w-full h-full object-cover border border-border" alt="" />}
                  {neighborSrc('down') && <img src={neighborSrc('down')} className="col-start-2 row-start-3 w-full h-full object-cover border border-border" alt="" />}
                  {neighborSrc('bottomRight') && <img src={neighborSrc('bottomRight')} className="col-start-3 row-start-3 w-full h-full object-cover border border-border" alt="" />}
                </div>
                {prompt && (
                <div className="text-[10px] text-zinc-500 bg-zinc-950 p-2 rounded border border-zinc-800">
                  Prompt: {prompt}
                </div>
                )}
              </div>
              )
            })()}
          </SidebarSection>

          <SidebarSection separator title="Upscale" icon={<ZoomIn size={12} />}>
            <div className="space-y-3">
              {isDebugMode && (
                <div className="space-y-1">
                  <SidebarLabel>Provider</SidebarLabel>
                  <select
                    value={upscaleProvider}
                    onChange={e => {
                      const v = parseUpscaleProvider(e.target.value)
                      setUpscaleProvider(v)
                      localStorage.setItem(LocalStorageKeys.AI_ACTIVE_UPSCALER, v)
                    }}
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-md py-1.5 px-2 text-[11px] text-zinc-300 font-mono focus:border-indigo-500/50 focus:outline-none"
                  >
                    <option value="stability">Stability AI (4k)</option>
                    <option value="replicate">Replicate (Creative)</option>
                    <option value="midjourney">Midjourney (LegNext)</option>
                  </select>
                </div>
              )}
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
                          upscaleService.upscale(fullTile, upscaleCreativity, effectiveStyleUrls, upscaleProvider),
                          {
                            loading: 'Upscaling...',
                            success: 'Tile queued for upscaling!',
                            error: 'Upscale failed',
                          }
                        )
                      }
                    }
                  }}
                  disabled={!selectedTile || (selectedTile && !!upscalingTiles[`${selectedTile.x},${selectedTile.y}`])}
                >
                  <ZoomIn size={14} />
                  Upscale (4x)
                </Button>
              </div>
            </div>
          </SidebarSection>

          <SidebarSection separator title="Enhance Fidelity" icon={<Sparkles size={12} />}>
            <div className="space-y-3">
              {isDebugMode && (
                <div className="space-y-1">
                  <SidebarLabel>Provider</SidebarLabel>
                  <div className="text-[11px] text-zinc-400 font-mono px-2 py-1.5 bg-zinc-900/50 border border-zinc-800 rounded-md">
                    Gemini (gemini-3-pro-image-preview)
                  </div>
                </div>
              )}
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
                        fidelityService.enhance(fullTile, fidelityPrompt, fidelityCreativity, effectiveStyleUrls),
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
                disabled={!selectedTile || (selectedTile && !!enhancingTiles[`${selectedTile.x},${selectedTile.y}`])}
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

          <div id={TOUR_STEP_IDS.WORLDGEN_STYLE_PROMPT}>
            <SidebarSection
              separator
              icon={<Palette size={12} />}
              title="Advanced Settings"
              rightContent={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvancedSettings(prev => !prev)}
                  className="h-7 gap-1 px-2 text-[10px] font-mono uppercase tracking-wide"
                >
                  {showAdvancedSettings ? 'Hide' : 'Show'}
                  {showAdvancedSettings ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </Button>
              }
            >
              {showAdvancedSettings ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <SidebarLabel>Style Prompt</SidebarLabel>
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
                          className="h-6 text-[10px] gap-1 font-mono"
                          onClick={fetchWorldSummary}
                          disabled={isFetchingSummary || !currentProject}
                        >
                          {isFetchingSummary ? <Loader2 size={10} className="animate-spin" /> : <BookOpen size={10} />}
                          Fetch
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Import style from Storyteller World Bible</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <SidebarTextarea
                    value={masterPrompt}
                    onChange={e => handleMasterPromptChange(e.target.value)}
                    placeholder="Define the overall art style and aesthetic..."
                    className="h-24"
                  />
                  {activeStyleUrls.length > 0 && (
                    <div className="space-y-1.5">
                      <SidebarLabel>Style Reference Image</SidebarLabel>
                      <div className="flex flex-wrap gap-1.5">
                        {activeStyleUrls.map((url, idx) => {
                          const isSelected = idx === Math.min(selectedStyleUrlIndex, activeStyleUrls.length - 1)
                          return (
                            <button
                              key={url}
                              onClick={() => handleSelectStyleUrl(idx)}
                              className={[
                                'relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-150',
                                isSelected
                                  ? 'border-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.3)] scale-105'
                                  : 'border-border/50 hover:border-primary/60 hover:scale-105 opacity-60 hover:opacity-100',
                              ].join(' ')}
                              title={`Style reference ${idx + 1}`}
                            >
                              <img
                                src={url}
                                alt={`Style reference ${idx + 1}`}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                              {isSelected && (
                                <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                                  <div className="h-2 w-2 rounded-full bg-primary shadow" />
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </SidebarSection>
          </div>
        </div>
      )}

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
  )
}
