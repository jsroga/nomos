import { ContentType, UrlScheme } from '@/shared/data/constants/protocol'
import { resolveProjectAssetUrl } from '@/shared/workspace/io/project-assets-api'
import { AssetKind, AssetUploadStatus } from '@/shared/workspace/constants/asset-upload'
import type { AssetUploadQueueItem } from '@/shared/workspace/asset-upload-queue'
import {
  FileUploaderItemStatus,
  FileUploaderKind,
  type FileUploaderItem,
} from '@/components/FileUploader'
import { fileStem } from '@/components/ThreeDAssets'
import type { Asset } from '@/domains/2d-canvas/core/world-types'
import { AssetDragPayloadType, AssetDragEffect } from './three-d-assets-library-copy'

function toUploaderKind(kind: AssetKind): FileUploaderKind {
  return kind === AssetKind.ThreeD ? FileUploaderKind.ThreeD : FileUploaderKind.TwoD
}

function toUploaderStatus(status: AssetUploadStatus): FileUploaderItemStatus {
  if (status === AssetUploadStatus.Uploading) return FileUploaderItemStatus.Uploading
  if (status === AssetUploadStatus.Error) return FileUploaderItemStatus.Failed
  return FileUploaderItemStatus.Queued
}

function modelUrl(projectId: string, modelFilename: string): string {
  if (modelFilename.startsWith(UrlScheme.Http) || modelFilename.startsWith(UrlScheme.Https)) {
    return modelFilename
  }
  return resolveProjectAssetUrl(projectId, modelFilename)
}

export function queueItemToUploader(item: AssetUploadQueueItem): FileUploaderItem {
  return {
    id: item.id,
    caption: fileStem(item.fileName),
    kind: toUploaderKind(item.kind),
    status: toUploaderStatus(item.status),
    uploading: item.status === AssetUploadStatus.Uploading,
    progress: item.progress,
  }
}

export function readyAssetToUploader(input: {
  asset: Asset
  projectId: string
  selected: boolean
}): FileUploaderItem {
  const { asset, projectId, selected } = input
  const has3d = Boolean(asset.model_filename)
  const thumb = asset.image_filename
    ? resolveProjectAssetUrl(projectId, asset.image_filename)
    : undefined
  return {
    id: asset.id,
    src: thumb,
    caption: fileStem(asset.image_filename || asset.model_filename || asset.id),
    kind: has3d ? FileUploaderKind.ThreeD : FileUploaderKind.TwoD,
    selected,
    draggable: has3d,
    onDragStart: has3d
      ? event => {
          const modelFilename = asset.model_filename
          event.dataTransfer.setData(
            ContentType.Json,
            JSON.stringify({
              type: AssetDragPayloadType.Asset,
              assetId: asset.id,
              glbUrl: modelFilename ? modelUrl(projectId, modelFilename) : undefined,
              thumbnailUrl: resolveProjectAssetUrl(projectId, asset.image_filename),
              has3D: has3d,
            }),
          )
          event.dataTransfer.effectAllowed = AssetDragEffect.Copy
        }
      : undefined,
  }
}

export function uploadingIndexFromQueue(queue: AssetUploadQueueItem[]): {
  current: number
  total: number
} | null {
  if (queue.length === 0) return null
  const uploadingIndex = queue.findIndex(item => item.status === AssetUploadStatus.Uploading)
  return {
    current: uploadingIndex >= 0 ? uploadingIndex + 1 : 1,
    total: queue.length,
  }
}
