import { useRef, useEffect, useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { useWorldStore } from '@/domains/2d-canvas'
import { useWorkspaceProjectStore } from '@/shared/workspace/workspace-project-store'
import { upscaleService } from '@/domains/2d-canvas/state/client-services/upscale-service'
import { settingsApi } from '@/domains/2d-canvas/core/io/settings.api'
import { uploadTileBase64 } from '@/domains/2d-canvas/core/io/world-data.api'
import { fetchWorldGenSummary } from '@/shared/data/io/world-summary.api'
import { fileReaderText, readString, recordFromJson } from '@/shared/data/json-guards'
import { tileGenerationService } from '@/domains/2d-canvas/state/client-services/tile-generation-service'
import { fidelityService } from '@/domains/2d-canvas/state/client-services/fidelity-service'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import { browserStorage } from '@/shared/data/browser-storage'
import { STYLE_PRESETS_MAP } from '@/shared/data/constants/style-presets'
import { parseUpscaleProvider, UpscaleProvider } from '../../core/upscale-provider-wire'
import { useWorldUiStore } from '@/domains/2d-canvas/state/useWorldUiStore'
import type { MjGridPayload } from '@/domains/2d-canvas/state/constants/world-ui-store'
import {
  CHAT_DEBUG_ADMIN_PIN,
  WorldGenDefaultFidelityPrompt,
  WorldGenSidebarError,
  WorldGenSidebarLog,
  WorldGenSidebarToast,
  WorldGenStylePresetFallback,
  WorldGenStyleUrlStoragePrefix,
} from '../../ui/constants/sidebar'
import { generateSingleWorldTile } from './generate-single-world-tile'

export function useWorldGenSidebar() {
  const defaultMasterPrompt = ''

  const currentProject = useWorkspaceProjectStore(state => state.currentProject)
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
      ? browserStorage.getString(LocalStorageKeys.DEBUG_MODE) === CHAT_DEBUG_ADMIN_PIN
      : false
  )
  const [upscaleProvider, setUpscaleProvider] = useState<UpscaleProvider>(() => {
    if (typeof window !== 'undefined') {
      return parseUpscaleProvider(browserStorage.getString(LocalStorageKeys.AI_ACTIVE_UPSCALER))
    }
    return UpscaleProvider.Stability
  })

  useEffect(() => {
    if (typeof window !== 'undefined' && currentProject?.id) {
      const savedPrompt = browserStorage.getString(
        `${LocalStorageKeys.MASTER_PROMPT}-${currentProject.id}`
      )
      setMasterPrompt(savedPrompt || defaultMasterPrompt)
    }
  }, [currentProject?.id])

  const handleMasterPromptChange = (value: string) => {
    setMasterPrompt(value)
    if (typeof window !== 'undefined' && currentProject?.id) {
      browserStorage.setString(`${LocalStorageKeys.MASTER_PROMPT}-${currentProject.id}`, value)
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
    const saved = browserStorage.getString(styleUrlLocalStorageKey)
    setSelectedStyleUrlIndex(saved !== null ? parseInt(saved, 10) : 0)
  }, [styleUrlLocalStorageKey])

  const handleSelectStyleUrl = (index: number) => {
    setSelectedStyleUrlIndex(index)
    if (styleUrlLocalStorageKey) {
      browserStorage.setString(styleUrlLocalStorageKey, String(index))
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
        browserStorage.getString(LocalStorageKeys.FIDELITY_PROMPT) ||
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

  const generateSingleTile = async (x: number, y: number) => {
    if (!currentProject) return
    await generateSingleWorldTile({
      projectId: currentProject.id,
      x,
      y,
      tiles,
      tilePrompt,
      masterPrompt,
      effectiveStyleUrls,
      setError,
      setGenerationDebugInfo,
    })
  }

  const fetchWorldSummary = async () => {
    if (!currentProject) return
    setIsFetchingSummary(true)
    try {
      const data = await fetchWorldGenSummary(currentProject.id)

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
    browserStorage.setString(LocalStorageKeys.AI_ACTIVE_UPSCALER, provider)
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
