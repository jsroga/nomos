import { useRef, useEffect, useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { useWorldStore } from '@/domains/2d-canvas'
import { useWorkspaceProjectStore } from '@/shared/workspace/workspace-project-store'
import { upscaleService } from '@/domains/2d-canvas/state/client-services/upscale-service'
import { uploadTileBase64 } from '@/domains/2d-canvas/core/io/world-data.api'
import { fileReaderText, readString, recordFromJson } from '@/shared/data/json-guards'
import { tileGenerationService } from '@/domains/2d-canvas/state/client-services/tile-generation-service'
import { fidelityService } from '@/domains/2d-canvas/state/client-services/fidelity-service'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import { browserStorage } from '@/shared/data/browser-storage'
import { clampStyleReferenceUrls } from '@/domains/2d-canvas/constants/mj-sref'
import { UpscaleProvider } from '../../core/upscale-provider-wire'
import { useWorldUiStore } from '@/domains/2d-canvas/state/useWorldUiStore'
import type { MjGridPayload } from '@/domains/2d-canvas/state/constants/world-ui-store'
import {
  CHAT_DEBUG_ADMIN_PIN,
  WorldGenDefaultFidelityPrompt,
  WorldGenSidebarError,
  WorldGenSidebarLog,
  WorldGenSidebarToast,
} from '../../ui/constants/sidebar'
import { generateSingleWorldTile } from './generate-single-world-tile'
import { useWorldSidebarPrompt } from './useWorldSidebarPrompt'

const UPSCALE_GEMINI_CREATIVITY = 0.3

export function useWorldGenSidebar() {
  const currentProject = useWorkspaceProjectStore(state => state.currentProject)
  const assets = useWorldStore(state => state.assets)
  const showAllAssetMasks = useWorldStore(state => state.showAllAssetMasks)
  const setShowAllAssetMasks = useWorldStore(state => state.setShowAllAssetMasks)

  const {
    masterPrompt,
    handleMasterPromptChange,
    handleSelectGenerationMode,
    handleResetStyleAnchor,
    handleAddStyleRefFiles,
    handleRemoveStyleRef,
    handleClearStyleRefs,
    handleRestoreStyleRefs,
    styleReferenceUrls,
    isUploadingStyleRefs,
    isApplyingGenerationMode,
    generationMode,
    styleAnchorUrl,
  } = useWorldSidebarPrompt(currentProject)

  const [tilePrompt, setTilePrompt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showDebug, setShowDebug] = useState(false)

  const [isDebugMode] = useState(() =>
    typeof window !== 'undefined'
      ? browserStorage.getString(LocalStorageKeys.DEBUG_MODE) === CHAT_DEBUG_ADMIN_PIN
      : false
  )

  const selectedTiles = useWorldStore(state => state.selectedTiles)
  const selectedTile = useWorldStore(state => state.selectedTile)
  const tiles = useWorldStore(state => state.tiles)
  const generatingTiles = useWorldStore(state => state.generatingTiles)
  const generationDebugInfo = useWorldStore(state => state.generationDebugInfo)
  const setGenerationDebugInfo = useWorldStore(state => state.setGenerationDebugInfo)
  const upscalingTiles = useWorldStore(state => state.upscalingTiles)
  const enhancingTiles = useWorldStore(state => state.enhancingTiles)

  const [isUploading, setIsUploading] = useState(false)

  const effectiveStyleUrls = useMemo(
    () => clampStyleReferenceUrls(styleReferenceUrls),
    [styleReferenceUrls],
  )

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
      upscaleService.upscale(
        fullTile,
        UPSCALE_GEMINI_CREATIVITY,
        effectiveStyleUrls,
        UpscaleProvider.Stability,
      ),
      {
        loading: WorldGenSidebarToast.Upscaling,
        success: WorldGenSidebarToast.UpscaleQueued,
        error: WorldGenSidebarToast.UpscaleFailed,
      }
    )
  }

  const handleEnhanceFidelity = async (creativity = fidelityCreativity) => {
    if (!selectedTile) return
    const fullTile = tiles[`${selectedTile.x},${selectedTile.y}`]
    if (!fullTile) return
    setFidelityCreativity(creativity)
    await toast.promise(
      fidelityService.enhance(fullTile, fidelityPrompt, creativity, effectiveStyleUrls),
      {
        loading: WorldGenSidebarToast.EnhancingFidelity,
        success: WorldGenSidebarToast.FidelityQueued,
        error: err => `Enhancement failed: ${err.message}`,
      }
    )
  }

  const handleCancelBusy = () => {
    if (!selectedTile) return
    const key = `${selectedTile.x},${selectedTile.y}`
    const tile = tiles[key]
    if (generatingTiles[key]) {
      tileGenerationService.stopGeneration(selectedTile.x, selectedTile.y)
    }
    if (upscalingTiles[key] && tile) {
      upscaleService.stopUpscale(tile.id)
    }
    if (enhancingTiles[key] && tile) {
      fidelityService.stopEnhancement(tile.id)
    }
  }

  const handleDeleteTile = async () => {
    if (selectedTiles.length === 0) return
    const tile = selectedTiles[0]
    try {
      await useWorldStore.getState().removeTile(tile.x, tile.y)
      toast.success(`Tile (${tile.x}, ${tile.y}) deleted`)
    } catch {
      toast.error(WorldGenSidebarToast.DeleteTileFailed)
    }
  }

  return {
    currentProject,
    assets,
    showAllAssetMasks,
    setShowAllAssetMasks,
    masterPrompt,
    handleMasterPromptChange,
    handleSelectGenerationMode,
    handleResetStyleAnchor,
    handleAddStyleRefFiles,
    handleRemoveStyleRef,
    handleClearStyleRefs,
    handleRestoreStyleRefs,
    styleReferenceUrls,
    isUploadingStyleRefs,
    isApplyingGenerationMode,
    generationMode,
    styleAnchorUrl,
    tilePrompt,
    setTilePrompt,
    error,
    showDebug,
    setShowDebug,
    isDebugMode,
    selectedTiles,
    selectedTile,
    tiles,
    generatingTiles,
    generationDebugInfo,
    setGenerationDebugInfo,
    upscalingTiles,
    enhancingTiles,
    isUploading,
    effectiveStyleUrls,
    fileInputRef,
    fidelityPrompt,
    fidelityCreativity,
    setFidelityCreativity,
    mjGridData,
    setMjGridData,
    handleGenerate,
    handleUploadTile,
    handleUpscale,
    handleEnhanceFidelity,
    handleDeleteTile,
    handleCancelBusy,
  }
}

export type WorldGenSidebarState = ReturnType<typeof useWorldGenSidebar>
