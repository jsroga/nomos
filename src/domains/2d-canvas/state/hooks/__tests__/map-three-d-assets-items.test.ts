import { describe, expect, it } from 'vitest'
import { AssetKind, AssetUploadStatus } from '@/shared/workspace/constants/asset-upload'
import type { AssetUploadQueueItem } from '@/shared/workspace/asset-upload-queue'
import { FileUploaderItemStatus, FileUploaderKind } from '@/components/FileUploader'
import type { Asset } from '@/domains/2d-canvas/core/world-types'
import {
  queueItemToUploader,
  readyAssetToUploader,
  uploadingIndexFromQueue,
} from '../map-three-d-assets-items'

function queueItem(status: AssetUploadStatus): AssetUploadQueueItem {
  return {
    id: 'q1',
    projectId: 'p1',
    fileName: 'ruin.glb',
    kind: AssetKind.ThreeD,
    status,
    progress: 40,
    file: new File(['x'], 'ruin.glb'),
  }
}

function asset(modelFilename: string | null): Asset {
  return {
    id: 'a1',
    project_id: 'p1',
    image_filename: 'chapel_ruin.png',
    model_filename: modelFilename,
    created_at: '2026-01-01',
    metadata: {},
  }
}

describe('queueItemToUploader', () => {
  it('maps queued, uploading, and failed cells', () => {
    expect(queueItemToUploader(queueItem(AssetUploadStatus.Pending)).status).toBe(
      FileUploaderItemStatus.Queued,
    )
    expect(queueItemToUploader(queueItem(AssetUploadStatus.Uploading))).toMatchObject({
      status: FileUploaderItemStatus.Uploading,
      uploading: true,
      kind: FileUploaderKind.ThreeD,
      caption: 'ruin',
    })
    expect(queueItemToUploader(queueItem(AssetUploadStatus.Error)).status).toBe(
      FileUploaderItemStatus.Failed,
    )
  })
})

describe('readyAssetToUploader', () => {
  it('stems the caption and chips 2D vs 3D', () => {
    expect(
      readyAssetToUploader({ asset: asset(null), projectId: 'p1', selected: false }),
    ).toMatchObject({
      kind: FileUploaderKind.TwoD,
      caption: 'chapel_ruin',
      selected: false,
      draggable: false,
    })
    expect(
      readyAssetToUploader({ asset: asset('ruin.glb'), projectId: 'p1', selected: true }),
    ).toMatchObject({
      kind: FileUploaderKind.ThreeD,
      selected: true,
      draggable: true,
    })
  })
})

describe('uploadingIndexFromQueue', () => {
  it('returns null when the queue is empty', () => {
    expect(uploadingIndexFromQueue([])).toBeNull()
  })

  it('reports the current in-flight index', () => {
    expect(
      uploadingIndexFromQueue([
        queueItem(AssetUploadStatus.Uploading),
        queueItem(AssetUploadStatus.Pending),
      ]),
    ).toEqual({ current: 1, total: 2 })
  })
})
