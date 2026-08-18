'use client'

import { useState, type DragEvent } from 'react'
import { Box, Eye, EyeOff } from 'lucide-react'
import { HtmlElementType } from '@/shared/data/constants/protocol'
import { FileUploader, FileUploaderItemStatus, isFileUploaderUploading, type FileUploaderItem, type FileUploaderProps } from '@/components/FileUploader'
import {
  ThreeDAssetsClass,
  ThreeDAssetsCopy,
} from './constants/three-d-assets'

export interface ThreeDAssetsProps {
  items: FileUploaderItem[]
  onPick?: FileUploaderProps['onPick']
  onRemove?: FileUploaderProps['onRemove']
  onSelect?: FileUploaderProps['onSelect']
  onDownload?: FileUploaderProps['onDownload']
  onCancel?: FileUploaderProps['onCancel']
  onRetry?: FileUploaderProps['onRetry']
  accept?: string
  count?: number
  showEye?: boolean
  eyeOn?: boolean
  onToggleEye?: () => void
  uploadingLabel?: string
  emptyHelper?: string
  liveMessage?: string
  allowUpload?: boolean
}

export function ThreeDAssets({
  items,
  onPick,
  onRemove,
  onSelect,
  onDownload,
  onCancel,
  onRetry,
  accept,
  count,
  showEye = true,
  eyeOn = false,
  onToggleEye,
  uploadingLabel,
  emptyHelper = ThreeDAssetsCopy.EmptyHelper,
  liveMessage,
  allowUpload = true,
}: ThreeDAssetsProps) {
  const readyCount =
    count ??
    items.filter(
      item =>
        !isFileUploaderUploading(item) &&
        item.status !== FileUploaderItemStatus.Queued &&
        item.status !== FileUploaderItemStatus.Failed,
    ).length
  const isEmpty = items.length === 0
  const isUploading = Boolean(uploadingLabel)
  const [dragging, setDragging] = useState(false)

  const handleRootDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!allowUpload) return
    event.preventDefault()
    if (isEmpty) setDragging(true)
  }

  const handleRootDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!allowUpload) return
    event.preventDefault()
    setDragging(false)
    const files = event.dataTransfer.files
    if (files.length > 0) onPick?.(files)
  }

  return (
    <div
      className={ThreeDAssetsClass.Root}
      onDragOver={allowUpload ? handleRootDragOver : undefined}
      onDragLeave={allowUpload ? () => setDragging(false) : undefined}
      onDrop={allowUpload ? handleRootDrop : undefined}
    >
      <div className={ThreeDAssetsClass.Header}>
        <span className={ThreeDAssetsClass.Label}>
          <Box size={12} strokeWidth={1.7} />
          {ThreeDAssetsCopy.Label}
        </span>
        {isUploading ? (
          <span className={ThreeDAssetsClass.UploadingLabel}>{uploadingLabel}</span>
        ) : (
          <span className={ThreeDAssetsClass.Meta}>
            <span className={ThreeDAssetsClass.Count}>{readyCount}</span>
            {showEye && onToggleEye ? (
              <button
                type={HtmlElementType.Button}
                className={ThreeDAssetsClass.Eye}
                aria-label={eyeOn ? ThreeDAssetsCopy.HideOnCanvas : ThreeDAssetsCopy.ShowOnCanvas}
                onClick={onToggleEye}
              >
                {eyeOn ? <EyeOff size={13} strokeWidth={1.7} /> : <Eye size={13} strokeWidth={1.7} />}
              </button>
            ) : null}
          </span>
        )}
      </div>
      {isEmpty ? <p className={ThreeDAssetsClass.EmptyHelper}>{emptyHelper}</p> : null}
      <FileUploader
        items={items}
        onPick={onPick}
        onRemove={onRemove}
        onSelect={onSelect}
        onDownload={onDownload}
        onCancel={onCancel}
        onRetry={onRetry}
        accept={accept}
        emptyTitle={ThreeDAssetsCopy.Drop}
        emptyAction={ThreeDAssetsCopy.Choose}
        emptyMeta={ThreeDAssetsCopy.EmptyMeta}
        emptyActive={dragging}
        allowUpload={allowUpload}
      />
      {isUploading ? <p className={ThreeDAssetsClass.QueueHelper}>{ThreeDAssetsCopy.UploadingHelper}</p> : null}
      <div className={ThreeDAssetsClass.Live} aria-live="polite">
        {liveMessage ?? ''}
      </div>
    </div>
  )
}
