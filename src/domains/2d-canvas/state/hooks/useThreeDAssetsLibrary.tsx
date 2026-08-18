'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { HttpMethod, HtmlElementType } from '@/shared/data/constants/protocol'
import { fetchJsonRecord } from '@/shared/data/fetch-json-record'
import { joinUrlPath } from '@/shared/data/url-builder'
import { deleteProjectAssetImage, resolveProjectAssetUrl } from '@/shared/workspace/io/project-assets-api'
import { ASSET_FILE_ACCEPT, ASSET_UPLOAD_FILE_SIZE_ERROR, AssetUploadReject } from '@/shared/workspace/constants/asset-upload'
import {
  cancelAssetUpload,
  enqueueAssetUploads,
  retryAssetUpload,
} from '@/shared/workspace/asset-upload-queue'
import { useAssetUploadQueue } from '@/shared/workspace/hooks/useAssetUploadQueue'
import { useWorkspaceProjectStore } from '@/shared/workspace/workspace-project-store'
import {
  THREE_D_ASSETS_UNDO_MS,
  ThreeDAssetsCopy,
  formatUploadingLabel,
} from '@/components/ThreeDAssets'
import { useWorldStore, type Asset } from '@/domains/2d-canvas/state/useWorldStore'
import { ASSETS_PANEL_COPY } from '@/domains/2d-canvas/ui/constants/assets-panel'
import { AssetApiRoute, AssetDownloadRel, ThreeDAssetsLibraryClass, ThreeDAssetsLibraryToast } from './three-d-assets-library-copy'
import {
  queueItemToUploader,
  readyAssetToUploader,
  uploadingIndexFromQueue,
} from './map-three-d-assets-items'
import { hasActiveFalSegments } from './has-active-fal-segments'
import {
  isAssetOverlayVisible,
  nextAssetOverlayEyeToggle,
} from './asset-overlay-visibility'

const pendingDeleteTimers = new Map<string, ReturnType<typeof setTimeout>>()

function downloadHref(url: string, filename: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = AssetDownloadRel.Noopener
  link.click()
}

function undoPendingDelete(id: string, asset: Asset, addAsset: (asset: Asset) => void) {
  const pending = pendingDeleteTimers.get(id)
  if (pending) clearTimeout(pending)
  pendingDeleteTimers.delete(id)
  addAsset(asset)
}

export function useThreeDAssetsLibrary() {
  const currentProject = useWorkspaceProjectStore(state => state.currentProject)
  const assets = useWorldStore(state => state.assets)
  const previewAssetId = useWorldStore(state => state.previewAssetId)
  const setPreviewAssetId = useWorldStore(state => state.setPreviewAssetId)
  const selectedMask = useWorldStore(state => state.selectedMask)
  const showAllAssetMasks = useWorldStore(state => state.showAllAssetMasks)
  const setShowAllAssetMasks = useWorldStore(state => state.setShowAllAssetMasks)
  const fetchAssets = useWorldStore(state => state.fetchAssets)
  const removeAsset = useWorldStore(state => state.removeAsset)
  const addAsset = useWorldStore(state => state.addAsset)
  const queue = useAssetUploadQueue()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [exportingCount, setExportingCount] = useState<number | null>(null)
  const [liveMessage, setLiveMessage] = useState('')
  const projectId = currentProject?.id
  const projectQueue = useMemo(
    () => queue.filter(item => item.projectId === projectId),
    [queue, projectId],
  )

  useEffect(() => {
    if (projectId) void fetchAssets()
  }, [projectId, fetchAssets])

  const persistDelete = useCallback(
    async (asset: Asset) => {
      if (!projectId) return
      try {
        await fetchJsonRecord(joinUrlPath(AssetApiRoute.Root, asset.id), {
          method: HttpMethod.Delete,
        })
        await deleteProjectAssetImage(projectId, asset.image_filename)
      } catch (error: unknown) {
        console.error(ASSETS_PANEL_COPY.ERROR_DELETING_ASSET_LOG, error)
        addAsset(asset)
        toast.error(ASSETS_PANEL_COPY.FAILED_DELETE_ASSET_TOAST)
      }
    },
    [addAsset, projectId],
  )

  const onPick = useCallback(
    (files: FileList) => {
      if (!projectId) return
      const rejected = enqueueAssetUploads({
        projectId,
        files,
        onComplete: () => {
          void fetchAssets()
          setLiveMessage(ThreeDAssetsCopy.UploadComplete)
        },
      })
      const [first] = rejected
      if (!first) return
      toast.error(
        first.reason === AssetUploadReject.Size
          ? ASSET_UPLOAD_FILE_SIZE_ERROR
          : ThreeDAssetsLibraryToast.Unsupported,
      )
    },
    [fetchAssets, projectId],
  )

  const onRemove = useCallback(
    (id: string) => {
      const asset = assets.find(entry => entry.id === id)
      if (!asset) {
        cancelAssetUpload(id)
        return
      }
      removeAsset(id)
      setSelectedIds(current => current.filter(entry => entry !== id))
      const timer = setTimeout(() => {
        pendingDeleteTimers.delete(id)
        void persistDelete(asset)
      }, THREE_D_ASSETS_UNDO_MS)
      pendingDeleteTimers.set(id, timer)
      toast(
        toastId => (
          <span className={ThreeDAssetsLibraryClass.Toast}>
            <span>{ThreeDAssetsCopy.Removed}</span>
            <button
              type={HtmlElementType.Button}
              className={ThreeDAssetsLibraryClass.Undo}
              onClick={() => {
                undoPendingDelete(id, asset, addAsset)
                toast.dismiss(toastId.id)
              }}
            >
              {ThreeDAssetsCopy.Undo}
            </button>
          </span>
        ),
        { duration: THREE_D_ASSETS_UNDO_MS },
      )
    },
    [addAsset, assets, persistDelete, removeAsset],
  )

  const onSelect = useCallback(
    (id: string) => {
      if (projectQueue.some(item => item.id === id)) return
      const isSelecting = previewAssetId !== id
      setPreviewAssetId(isSelecting ? id : null)
      setSelectedIds(isSelecting ? [id] : [])
      if (!isSelecting) setShowAllAssetMasks(false)
    },
    [previewAssetId, projectQueue, setPreviewAssetId, setShowAllAssetMasks],
  )

  const onDownload = useCallback(
    (id: string) => {
      if (!projectId) return
      const asset = assets.find(entry => entry.id === id)
      if (!asset) return
      const fileName = asset.model_filename || asset.image_filename
      downloadHref(resolveProjectAssetUrl(projectId, fileName), fileName)
    },
    [assets, projectId],
  )

  const items = useMemo(() => {
    const queued = projectQueue.map(queueItemToUploader)
    if (!projectId) return queued
    const ready = assets.map(asset =>
      readyAssetToUploader({
        asset,
        projectId,
        selected: selectedIds.includes(asset.id) || previewAssetId === asset.id,
      }),
    )
    return [...ready, ...queued]
  }, [assets, previewAssetId, projectId, projectQueue, selectedIds])

  const uploading = uploadingIndexFromQueue(projectQueue)

  const exportSelected = useCallback(async () => {
    if (!projectId) return
    const ids = selectedIds.length > 0 ? selectedIds : assets.map(asset => asset.id)
    if (ids.length === 0) return
    setExportingCount(ids.length)
    await new Promise<void>(resolve => {
      requestAnimationFrame(() => resolve())
    })
    try {
      for (const id of ids) {
        const asset = assets.find(entry => entry.id === id)
        if (!asset) continue
        const fileName = asset.model_filename || asset.image_filename
        downloadHref(resolveProjectAssetUrl(projectId, fileName), fileName)
      }
    } finally {
      setExportingCount(null)
    }
  }, [assets, projectId, selectedIds])

  const onToggleEye = useCallback(() => {
    const next = nextAssetOverlayEyeToggle(showAllAssetMasks, previewAssetId)
    setShowAllAssetMasks(next.showAllAssetMasks)
    setPreviewAssetId(next.previewAssetId)
    if (!next.showAllAssetMasks && next.previewAssetId === null) setSelectedIds([])
  }, [previewAssetId, setPreviewAssetId, setShowAllAssetMasks, showAllAssetMasks])

  const selectAll = useCallback(() => {
    setSelectedIds(assets.map(asset => asset.id))
  }, [assets])

  const clearSelection = useCallback(() => {
    setSelectedIds([])
    setPreviewAssetId(null)
  }, [setPreviewAssetId])

  return {
    items,
    onPick,
    onRemove,
    onSelect,
    onDownload,
    onCancel: cancelAssetUpload,
    onRetry: retryAssetUpload,
    accept: ASSET_FILE_ACCEPT,
    count: assets.length,
    showEye: hasActiveFalSegments(assets, selectedMask),
    eyeOn: isAssetOverlayVisible(showAllAssetMasks, previewAssetId),
    onToggleEye,
    uploadingLabel: uploading
      ? formatUploadingLabel(uploading.current, uploading.total)
      : undefined,
    liveMessage,
    selectedCount: selectedIds.length,
    readyCount: assets.length,
    selectAll,
    clearSelection,
    exportSelected,
    exportingCount,
    hasSelection: selectedIds.length > 0,
  }
}
