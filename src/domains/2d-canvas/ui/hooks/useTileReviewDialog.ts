import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useWorldStore } from '@/domains/2d-canvas'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { tileGenerationService } from '@/domains/2d-canvas/state/client-services/tile-generation-service'
import {
  DomEventType,
  KeyboardKey,
  TILE_REVIEW_INFO_TOAST_ICON,
  TileReviewAcceptLabel,
  TileReviewToast,
  TileReviewTypeLabel,
  VariantSelectionAction,
  WorldGenReviewType,
} from '../constants/tile-review-dialog'
import type { TileReviewType } from '../constants/tile-review-dialog'
import { findVariantIndex } from '../utils/tile-review-variant'
import { persistFirstTileStyleAnchor } from '@/domains/2d-canvas/state/utils/persist-style-anchor'
import { getWorldUiStore } from '@/domains/2d-canvas/state/useWorldUiStore'

const TYPE_LABELS = {
  [WorldGenReviewType.Generation]: {
    title: TileReviewTypeLabel.Generated,
    accept: TileReviewAcceptLabel.Generation,
    new: TileReviewTypeLabel.Generated,
  },
  [WorldGenReviewType.Fidelity]: {
    title: TileReviewTypeLabel.Enhanced,
    accept: TileReviewAcceptLabel.Enhancement,
    new: TileReviewTypeLabel.Enhanced,
  },
  [WorldGenReviewType.Upscale]: {
    title: TileReviewTypeLabel.Upscaled,
    accept: TileReviewAcceptLabel.Upscale,
    new: TileReviewTypeLabel.Upscaled,
  },
} as const

interface UseTileReviewDialogParams {
  open: boolean
  onClose: () => void
  tileX: number
  tileY: number
  newUrl: string
  variantUrls?: string[]
  originalUrl?: string
  type: TileReviewType
  tokenId?: string
  runId?: string
}

export function useTileReviewDialog({
  open,
  onClose,
  tileX,
  tileY,
  variantUrls,
  originalUrl,
  type,
  tokenId,
  runId,
}: UseTileReviewDialogParams) {
  const [isAccepting, setIsAccepting] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [selectedVariantUrl, setSelectedVariantUrl] = useState<string | null>(null)
  const [isUpscaling, setIsUpscaling] = useState(false)

  const acceptGeneration = useWorldStore(state => state.acceptGeneration)
  const rejectGeneration = useWorldStore(state => state.rejectGeneration)
  const acceptFidelity = useWorldStore(state => state.acceptFidelity)
  const rejectFidelity = useWorldStore(state => state.rejectFidelity)
  const acceptUpscale = useWorldStore(state => state.acceptUpscale)
  const rejectUpscale = useWorldStore(state => state.rejectUpscale)

  const labels = TYPE_LABELS[type]
  const title = `Review ${labels.title} Tile (${tileX}, ${tileY})`
  const requiresVariantSelection =
    type === WorldGenReviewType.Generation && Boolean(variantUrls?.length)
  const hasOriginal = Boolean(originalUrl) && !requiresVariantSelection
  const pickerVariantUrls = requiresVariantSelection ? variantUrls : undefined
  const comparisonOriginalUrl = hasOriginal ? originalUrl : undefined

  useEffect(() => {
    if (!open) return
    setSelectedVariantUrl(null)
  }, [open, tileX, tileY, variantUrls])

  const acceptMjVariant = async (urls: string[], selectedUrl: string) => {
    if (!tokenId || !runId) return
    const variantIndex = findVariantIndex(urls, selectedUrl)
    const pending = getWorldUiStore().getPendingGeneration(tileX, tileY)
    await persistFirstTileStyleAnchor(pending?.isFirstTile === true, selectedUrl)
    await tileGenerationService.completeVariantSelection(
      tokenId,
      VariantSelectionAction.Accept,
      variantIndex === -1 ? 0 : variantIndex,
      runId
    )
    toast.success(TileReviewToast.UsingSelectedVariant)
    onClose()
  }

  const acceptReviewType = async (selectedUrl: string | null) => {
    if (type === WorldGenReviewType.Generation) {
      await acceptGeneration(tileX, tileY, selectedUrl || undefined)
      toast.success(TileReviewToast.GenerationAccepted)
      onClose()
      return
    }
    if (type === WorldGenReviewType.Fidelity) {
      await acceptFidelity(tileX, tileY)
      toast.success(TileReviewToast.EnhancementAccepted)
      onClose()
      return
    }
    await acceptUpscale(tileX, tileY)
    toast.success(TileReviewToast.UpscaleAccepted)
    onClose()
  }

  const handleAccept = async () => {
    if (requiresVariantSelection && !selectedVariantUrl) {
      toast.error(TileReviewToast.SelectVariantFirst)
      return
    }

    setIsAccepting(true)
    try {
      if (tokenId && requiresVariantSelection && pickerVariantUrls && selectedVariantUrl) {
        await acceptMjVariant(pickerVariantUrls, selectedVariantUrl)
        return
      }
      await acceptReviewType(selectedVariantUrl)
    } catch (error: unknown) {
      toast.error(`Failed to accept: ${getErrorMessage(error)}`)
    } finally {
      setIsAccepting(false)
    }
  }

  const handleUpscale = async () => {
    if (!tokenId || !runId || !selectedVariantUrl || !pickerVariantUrls) return
    const variantIndex = findVariantIndex(pickerVariantUrls, selectedVariantUrl)
    if (variantIndex === -1) {
      toast.error(TileReviewToast.CouldNotDetermineVariantIndex)
      return
    }
    setIsUpscaling(true)
    try {
      await tileGenerationService.completeVariantSelection(
        tokenId,
        VariantSelectionAction.Upscale,
        variantIndex,
        runId
      )
      toast.success(TileReviewToast.UpscalingVariant)
      onClose()
    } catch (error: unknown) {
      toast.error(`Failed to upscale: ${getErrorMessage(error)}`)
    } finally {
      setIsUpscaling(false)
    }
  }

  const handleReject = () => {
    setIsRejecting(true)
    try {
      if (type === WorldGenReviewType.Generation) {
        rejectGeneration(tileX, tileY)
        toast(TileReviewToast.GenerationRejected, { icon: TILE_REVIEW_INFO_TOAST_ICON })
      } else if (type === WorldGenReviewType.Fidelity) {
        rejectFidelity(tileX, tileY)
        toast(TileReviewToast.EnhancementRejected, { icon: TILE_REVIEW_INFO_TOAST_ICON })
      } else {
        rejectUpscale(tileX, tileY)
        toast(TileReviewToast.UpscaleRejected, { icon: TILE_REVIEW_INFO_TOAST_ICON })
      }
      onClose()
    } finally {
      setIsRejecting(false)
    }
  }

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === KeyboardKey.Enter) {
        e.preventDefault()
        if (requiresVariantSelection && !selectedVariantUrl) return
        void handleAccept()
      } else if (e.key === KeyboardKey.Escape) {
        e.preventDefault()
        handleReject()
      }
    }

    window.addEventListener(DomEventType.KeyDown, handleKeyDown)
    return () => window.removeEventListener(DomEventType.KeyDown, handleKeyDown)
  }, [open, requiresVariantSelection, selectedVariantUrl])

  return {
    labels,
    title,
    requiresVariantSelection,
    hasOriginal,
    pickerVariantUrls,
    comparisonOriginalUrl,
    selectedVariantUrl,
    setSelectedVariantUrl,
    isAccepting,
    isRejecting,
    isUpscaling,
    handleAccept,
    handleUpscale,
    handleReject,
    showMjActions: Boolean(tokenId && requiresVariantSelection),
  }
}
