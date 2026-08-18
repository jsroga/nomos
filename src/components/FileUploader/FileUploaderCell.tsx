'use client'

import { Box, Download, X } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { HtmlElementType } from '@/shared/data/constants/protocol'
import { cn } from '@/shared/data/utils'
import type { FileUploaderItem } from './FileUploader'
import {
  FileUploaderAriaRole,
  FileUploaderClass,
  FileUploaderCopy,
  FileUploaderItemStatus,
  FileUploaderKey,
  FileUploaderKind,
  FILE_UPLOADER_PROGRESS_MAX,
  FILE_UPLOADER_PROGRESS_MIN,
  formatFileUploaderPercent,
  isFileUploaderUploading,
} from './constants/file-uploader'

export function FileUploaderCell({
  item,
  onRemove,
  onSelect,
  onDownload,
  onCancel,
  onRetry,
}: {
  item: FileUploaderItem
  onRemove?: (id: string) => void
  onSelect?: (id: string) => void
  onDownload?: (id: string) => void
  onCancel?: (id: string) => void
  onRetry?: (id: string) => void
}) {
  if (isFileUploaderUploading(item)) {
    return <UploadingCell item={item} onCancel={onCancel} />
  }
  if (item.status === FileUploaderItemStatus.Queued) {
    return (
      <div className={FileUploaderClass.Queued}>
        <span className={FileUploaderClass.QueuedLabel}>{FileUploaderCopy.Queued}</span>
      </div>
    )
  }
  if (item.status === FileUploaderItemStatus.Failed) {
    return (
      <div className={FileUploaderClass.Failed}>
        <span className={FileUploaderClass.FailedLabel}>{FileUploaderCopy.Failed}</span>
        {onRetry ? (
          <button
            type={HtmlElementType.Button}
            className={FileUploaderClass.Retry}
            onClick={() => onRetry(item.id)}
          >
            {FileUploaderCopy.Retry}
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <ReadyCell
      item={item}
      onRemove={onRemove}
      onSelect={onSelect}
      onDownload={onDownload}
    />
  )
}

function UploadingCell({
  item,
  onCancel,
}: {
  item: FileUploaderItem
  onCancel?: (id: string) => void
}) {
  const hasProgress = item.progress !== undefined && item.progress > FILE_UPLOADER_PROGRESS_MIN
  const progress = hasProgress
    ? Math.min(FILE_UPLOADER_PROGRESS_MAX, item.progress ?? FILE_UPLOADER_PROGRESS_MIN)
    : FILE_UPLOADER_PROGRESS_MIN
  return (
    <div
      className={cn(FileUploaderClass.Uploading, FileUploaderClass.Group)}
      role={FileUploaderAriaRole.Progressbar}
      aria-valuenow={progress}
      aria-valuemin={FILE_UPLOADER_PROGRESS_MIN}
      aria-valuemax={FILE_UPLOADER_PROGRESS_MAX}
    >
      <span className={FileUploaderClass.UploadingSpinner} />
      {hasProgress ? (
        <span className={FileUploaderClass.UploadingPct}>{formatFileUploaderPercent(progress)}</span>
      ) : null}
      <span className={FileUploaderClass.UploadingTrack}>
        <span className={FileUploaderClass.UploadingFill} style={{ width: formatFileUploaderPercent(progress) }} />
      </span>
      {onCancel ? (
        <button
          type={HtmlElementType.Button}
          aria-label={FileUploaderCopy.Cancel}
          className={FileUploaderClass.Remove}
          onClick={() => onCancel(item.id)}
        >
          <X size={10} strokeWidth={2.4} />
        </button>
      ) : null}
    </div>
  )
}

function ReadyCell({
  item,
  onRemove,
  onSelect,
  onDownload,
}: {
  item: FileUploaderItem
  onRemove?: (id: string) => void
  onSelect?: (id: string) => void
  onDownload?: (id: string) => void
}) {
  const isAsset = item.kind !== undefined
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === FileUploaderKey.Enter && onSelect) {
      event.preventDefault()
      onSelect(item.id)
      return
    }
    if (
      (event.key === FileUploaderKey.Delete || event.key === FileUploaderKey.Backspace) &&
      onRemove
    ) {
      event.preventDefault()
      onRemove(item.id)
    }
  }

  return (
    <div
      className={cn(
        item.selected ? FileUploaderClass.ThumbSelected : FileUploaderClass.Thumb,
        FileUploaderClass.Group,
      )}
      role={onSelect ? HtmlElementType.Button : undefined}
      tabIndex={onSelect ? 0 : undefined}
      draggable={item.draggable}
      onDragStart={item.onDragStart}
      onClick={onSelect ? () => onSelect(item.id) : undefined}
      onKeyDown={onSelect || onRemove ? handleKeyDown : undefined}
    >
      <ReadyCellMedia item={item} />
      <ReadyCellChrome
        item={item}
        isAsset={isAsset}
        onDownload={onDownload}
        onRemove={onRemove}
      />
    </div>
  )
}

function ReadyCellMedia({ item }: { item: FileUploaderItem }) {
  if (item.src) {
    return (
      <img
        src={item.src}
        alt={item.caption ?? item.id}
        draggable={false}
        className={FileUploaderClass.Cover}
      />
    )
  }
  return (
    <div className={FileUploaderClass.ThumbFill}>
      {item.kind === FileUploaderKind.ThreeD ? <Box size={17} strokeWidth={1.5} /> : null}
    </div>
  )
}

function ReadyCellChrome({
  item,
  isAsset,
  onDownload,
  onRemove,
}: {
  item: FileUploaderItem
  isAsset: boolean
  onDownload?: (id: string) => void
  onRemove?: (id: string) => void
}) {
  return (
    <>
      {isAsset ? <span className={FileUploaderClass.Scrim} /> : null}
      {item.kind === FileUploaderKind.TwoD ? (
        <span className={FileUploaderClass.Chip2d}>{FileUploaderCopy.Chip2d}</span>
      ) : null}
      {item.kind === FileUploaderKind.ThreeD ? (
        <span className={FileUploaderClass.Chip3d}>{FileUploaderCopy.Chip3d}</span>
      ) : null}
      {item.caption ? (
        <span className={isAsset ? FileUploaderClass.AssetCaption : FileUploaderClass.Caption}>
          {item.caption}
        </span>
      ) : null}
      {isAsset && onDownload ? (
        <button
          type={HtmlElementType.Button}
          aria-label={FileUploaderCopy.Download}
          className={FileUploaderClass.Download}
          onClick={event => {
            event.stopPropagation()
            onDownload(item.id)
          }}
        >
          <Download size={10} strokeWidth={2.4} />
        </button>
      ) : null}
      {onRemove ? (
        <button
          type={HtmlElementType.Button}
          aria-label={FileUploaderCopy.Remove}
          className={FileUploaderClass.Remove}
          onClick={event => {
            event.stopPropagation()
            onRemove(item.id)
          }}
        >
          <X size={10} strokeWidth={2.4} />
        </button>
      ) : null}
    </>
  )
}
