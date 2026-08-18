import type { FileUploaderItem } from '@/components/FileUploader'
import { FileUploaderItemStatus, FileUploaderKind } from '@/components/FileUploader'
import { PLACEHOLDER_THUMB } from './media'

export function readyAsset(id: string, caption: string): FileUploaderItem {
  return {
    id,
    src: PLACEHOLDER_THUMB,
    caption,
    status: FileUploaderItemStatus.Ready,
    kind: FileUploaderKind.TwoD,
  }
}

export const uploadingAsset: FileUploaderItem = {
  id: 'uploading',
  caption: 'keep-wall.webp',
  status: FileUploaderItemStatus.Uploading,
  uploading: true,
  progress: 42,
}

export const queuedAsset: FileUploaderItem = {
  id: 'queued',
  caption: 'gate-north.webp',
  status: FileUploaderItemStatus.Queued,
}

export const failedAsset: FileUploaderItem = {
  id: 'failed',
  caption: 'broken.webp',
  status: FileUploaderItemStatus.Failed,
}
