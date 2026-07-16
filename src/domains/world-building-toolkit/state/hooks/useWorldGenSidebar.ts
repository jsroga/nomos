import { useRef, useEffect, useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { useWorldStore, type Tile } from '@/domains/world-building-toolkit'
import { assembleContextImage, type ContextImageVariant } from '@/shared/ai/contextAssembler'
import { upscaleService } from '@/domains/world-building-toolkit/state/client-services/upscale-service'
import { settingsApi } from '@/domains/world-building-toolkit/core/io/settings.api'
import { fetchUrlAsDataUrl, uploadTileBase64 } from '@/domains/world-building-toolkit/core/io/world-data.api'
import { fetchStorytellerWorldSummary } from '@/domains/storyteller/core/io/storyteller.api'
import { fileReaderText, readString, recordFromJson } from '@/shared/data/json-guards'
import {
  tileGenerationService,
  type FollowUpContextPayload,
} from '@/domains/world-building-toolkit/state/client-services/tile-generation-service'
import { fidelityService } from '@/domains/world-building-toolkit/state/client-services/fidelity-service'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import { STYLE_PRESETS_MAP } from '@/shared/data/constants/style-presets'
import { parseUpscaleProvider, UpscaleProvider } from '../../core/upscale-provider-wire'
import { useWorldUiStore } from '@/domains/world-building-toolkit/state/useWorldUiStore'
import type { MjGridPayload } from '@/domains/world-building-toolkit/state/constants/world-ui-store'
import {
  CHAT_DEBUG_ADMIN_PIN,
  ContextAssemblyVariant,
  UrlScheme,
  WorldGenDataUrlCheck,
  WorldGenDefaultFidelityPrompt,
  WorldGenSidebarError,
  WorldGenSidebarLog,
  WorldGenSidebarToast,
  WorldGenStylePresetFallback,
  WorldGenStyleUrlStoragePrefix,
  WorldGenTileProvider,
} from '../../ui/constants/sidebar'

export function useWorldGenSidebar() {
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
      ? localStorage.getItem(LocalStorageKeys.DEBUG_MODE) === CHAT_DEBUG_ADMIN_PIN
      : false
  )
  const [upscaleProvider, setUpscaleProvider] = useState<UpscaleProvider>(() => {
    if (typeof window !== 'undefined') {
      return parseUpscaleProvider(localStorage.getItem(LocalStorageKeys.AI_ACTIVE_UPSCALER))
    }
    return UpscaleProvider.Stability
  })

  useEffect(() => {
    if (typeof window !== 'undefined' && currentProject?.id) {
      const savedPrompt = localStorage.getItem(
        `${LocalStorageKeys.MASTER_PROMPT}-${currentProject.id}`
      )
      setMasterPrompt(savedPrompt || defaultMasterPrompt)
    }
  }, [currentProject?.id])

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

  const styleUrlLocalStorageKey = currentProject?.id
    ? `${WorldGenStyleUrlStoragePrefix.Index}${currentProject.id}-${currentProject.stylePreset || WorldGenStylePresetFallback.Custom}`
    : null

  const [selectedStyleUrlIndex, setSelectedStyleUrlIndex] = useState<number>(0)

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

  const activeStyleUrls = useMemo(() => {
    if (currentProject?.stylePreset) {
      const preset = STYLE_PRESETS_MAP[currentProject.stylePreset]
      if (preset && preset.urls.length > 0) return preset.urls
    }
    return styleReferenceUrls
  }, [currentProject?.stylePreset, styleReferenceUrls])

  const effectiveStyleUrls = useMemo(() => {
    if (activeStyleUrls.length === 0) return []
    const idx = Math.min(selectedStyleUrlIndex, activeStyleUrls.length - 1)
    return [activeStyleUrls[idx]]
  }, [activeStyleUrls, selectedStyleUrlIndex])

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [fidelityPrompt] = useState(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem(LocalStorageKeys.FIDELITY_PROMPT) ||
        WorldGenDefaultFidelityPrompt.Default
      )
    }
    return WorldGenDefaultFidelityPrompt.Default
  })
  const [fidelityCreativity, setFidelityCreativity] = useState(0.3)

  const [mjGridData, setMjGridData] = useState<MjGridPayload | null>(null)
  const mjGridVersion = useWorldUiStore(state => state.mjGridVersion)
  const pendingMjGrid = useWorldUiStore(state => state.pendingMjGrid)

  useEffect(() => {
    if (!pendingMjGrid || mjGridVersion === 0) return
    console.log(WorldGenSidebarLog.MjGridReady, pendingMjGrid)
    setMjGridData(pendingMjGrid)
  }, [pendingMjGrid, mjGridVersion])

  useEffect(() => {
    if (currentProject?.id) {
      settingsApi
        .fetchProject(currentProject.id)
        .then(data => {
          if (data.styleReferenceUrls?.length) {
            setStyleReferenceUrls(data.styleReferenceUrls)
          }
        })
        .catch(err => console.error(WorldGenSidebarLog.FailedToLoadProjectStyleRefs, err))
    }
  }, [currentProject?.id])

  useEffect(() => {
    tileGenerationService.resumePendingGenerations()
    upscaleService.resumePendingUpscales()
    fidelityService.resumePendingEnhancements()
  }, [])

  const blobToRawBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const dataUrl = fileReaderText(reader.result)
        if (!dataUrl || !dataUrl.includes(WorldGenDataUrlCheck.Comma))
          reject(new Error(WorldGenSidebarError.InvalidDataUrl))
        else resolve(dataUrl.split(WorldGenDataUrlCheck.Comma)[1])
      }
      reader.onerror = () => reject(new Error(WorldGenSidebarError.FileReaderError))
      reader.readAsDataURL(blob)
    })

  const blobToDataUrl = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!blob || blob.size === 0) {
        console.error(WorldGenSidebarLog.BlobToDataUrlInvalidBlob, { blob, size: blob?.size })
        reject(new Error(WorldGenSidebarError.InvalidBlob))
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        const dataUrl = fileReaderText(reader.result)
        if (dataUrl) resolve(dataUrl)
        else reject(new Error(WorldGenSidebarError.FileReaderError))
      }
      reader.onerror = () => reject(new Error(WorldGenSidebarError.FileReaderError))
      reader.readAsDataURL(blob)
    })
  }

  const loadImageAsDataUrl = async (
    tile: Tile | undefined
  ): Promise<(Tile & { imageUrl?: string }) | undefined> => {
    if (!tile || !currentProject || !tile.image_filename) return tile

    const imageUrl = tile.image_filename.startsWith(UrlScheme.Http)
      ? tile.image_filename
      : `${window.location.origin}/projects/${currentProject.id}/${tile.image_filename}`

    try {
      const loadedUrl = await fetchUrlAsDataUrl(imageUrl)
      if (loadedUrl) {
        return { ...tile, imageUrl: loadedUrl }
      }
      return undefined
    } catch (loadError) {
      console.error(WorldGenSidebarLog.FailedToLoadNeighborImage, loadError)
      return undefined
    }
  }

  const fetchWorldSummary = async () => {
    if (!currentProject) return
    setIsFetchingSummary(true)
    try {
      const data = await fetchStorytellerWorldSummary(currentProject.id)

      const worldGenPrompt = readString(data.worldGenPrompt)
      if (worldGenPrompt) {
        handleMasterPromptChange(worldGenPrompt)
        toast.success(WorldGenSidebarToast.MasterPromptUpdated)
      }

      const summarize = readString(data.summarize)
      if (summarize) {
        console.log(WorldGenSidebarLog.WorldSummary, summarize)
      }
    } catch (summaryError) {
      console.error(WorldGenSidebarLog.FailedToFetchWorldSummary, summaryError)
      toast.error(WorldGenSidebarToast.FailedToFetchWorldInfo)
    } finally {
      setIsFetchingSummary(false)
    }
  }

  const generateSingleTile = async (x: number, y: number) => {
    if (!currentProject) return

    try {
      const hasNeighbors = [
        tiles[`${x},${y - 1}`],
        tiles[`${x},${y + 1}`],
        tiles[`${x - 1},${y}`],
        tiles[`${x + 1},${y}`],
      ].some(Boolean)

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
        const preferredVariant: ContextImageVariant = ContextAssemblyVariant.CanonicalFullContext
        const canonicalContext = await assembleContextImage(
          contextInput,
          1024,
          ContextAssemblyVariant.CanonicalFullContext
        )

        if (canonicalContext.directNeighborCount === 0) {
          throw new Error(WorldGenSidebarError.FailedToLoadNeighborContext)
        }

        const [canonicalBase64, maskBase64] = await Promise.all([
          blobToRawBase64(canonicalContext.imageBlob),
          blobToRawBase64(canonicalContext.maskBlob),
        ])
        followUpContext = {
          images: { canonicalFullContext: canonicalBase64 },
          maskBase64,
          preferredVariant,
        }

        const getImageUrl = (neighborTile: (Tile & { imageUrl?: string }) | undefined) =>
          neighborTile?.imageUrl
        blobToDataUrl(canonicalContext.imageBlob)
          .then(assembledContext =>
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
              provider: WorldGenTileProvider.NanoBanana,
            })
          )
          .catch(() => {})
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
          else reject(new Error(WorldGenSidebarError.FileReaderError))
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const data = await uploadTileBase64({
        projectId: currentProject.id,
        x: tile.x,
        y: tile.y,
        imageBase64,
        prompt: tilePrompt || `Uploaded tile at (${tile.x}, ${tile.y})`,
      })

      const tileRecord = recordFromJson(data.tile)

      useWorldStore.setState({
        tiles: {
          ...useWorldStore.getState().tiles,
          [`${tile.x},${tile.y}`]: {
            id: readString(tileRecord.id) ?? `tile-${tile.x}-${tile.y}`,
            project_id: currentProject.id,
            x: tile.x,
            y: tile.y,
        tile_prompt: readString(tileRecord.tile_prompt) ?? null,
        image_filename: readString(data.filename) ?? null,
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

  const handleUpscale = async () => {
    if (!selectedTile) return
    const fullTile = tiles[`${selectedTile.x},${selectedTile.y}`]
    if (!fullTile) return
    await toast.promise(
      upscaleService.upscale(fullTile, upscaleCreativity, effectiveStyleUrls, upscaleProvider),
      {
        loading: WorldGenSidebarToast.Upscaling,
        success: WorldGenSidebarToast.UpscaleQueued,
        error: WorldGenSidebarToast.UpscaleFailed,
      }
    )
  }

  const handleEnhanceFidelity = async () => {
    if (!selectedTile) return
    const fullTile = tiles[`${selectedTile.x},${selectedTile.y}`]
    if (!fullTile) return
    await toast.promise(
      fidelityService.enhance(fullTile, fidelityPrompt, fidelityCreativity, effectiveStyleUrls),
      {
        loading: WorldGenSidebarToast.EnhancingFidelity,
        success: WorldGenSidebarToast.FidelityQueued,
        error: err => `Enhancement failed: ${err.message}`,
      }
    )
  }

  const handleDeleteTile = async () => {
    if (selectedTiles.length === 0) return
    const tile = selectedTiles[0]
    if (!confirm(`Delete tile at (${tile.x}, ${tile.y})?`)) return
    try {
      await useWorldStore.getState().removeTile(tile.x, tile.y)
      toast.success(`Tile (${tile.x}, ${tile.y}) deleted`)
    } catch {
      toast.error(WorldGenSidebarToast.DeleteTileFailed)
    }
  }

  const handleUpscaleProviderChange = (value: string) => {
    const provider = parseUpscaleProvider(value)
    setUpscaleProvider(provider)
    localStorage.setItem(LocalStorageKeys.AI_ACTIVE_UPSCALER, provider)
  }

  return {
    currentProject,
    assets,
    showAllAssetMasks,
    setShowAllAssetMasks,
    masterPrompt,
    tilePrompt,
    setTilePrompt,
    error,
    upscaleCreativity,
    setUpscaleCreativity,
    showDebug,
    setShowDebug,
    showAdvancedSettings,
    setShowAdvancedSettings,
    isDebugMode,
    upscaleProvider,
    handleUpscaleProviderChange,
    handleMasterPromptChange,
    selectedTiles,
    selectedTile,
    tiles,
    generatingTiles,
    generationDebugInfo,
    setGenerationDebugInfo,
    upscalingTiles,
    enhancingTiles,
    isUploading,
    isFetchingSummary,
    activeStyleUrls,
    effectiveStyleUrls,
    selectedStyleUrlIndex,
    handleSelectStyleUrl,
    fileInputRef,
    fidelityPrompt,
    fidelityCreativity,
    setFidelityCreativity,
    mjGridData,
    setMjGridData,
    fetchWorldSummary,
    handleGenerate,
    handleUploadTile,
    handleUpscale,
    handleEnhanceFidelity,
    handleDeleteTile,
  }
}

export type WorldGenSidebarState = ReturnType<typeof useWorldGenSidebar>
