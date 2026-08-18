'use client'

import { useRef, useState, type DragEvent } from 'react'
import { ImagePlus, Plus, Upload } from 'lucide-react'
import { HtmlElementType } from '@/shared/data/constants/protocol'
import { cn } from '@/shared/data/utils'
import { FileUploaderCell } from './FileUploaderCell'
import {
  FileUploaderClass,
  FileUploaderCopy,
  canFileUploaderAdd,
  type FileUploaderKind,
  type FileUploaderItemStatus,
} from './constants/file-uploader'

export interface FileUploaderItem {
  id: string
  src?: string
  caption?: string
  uploading?: boolean
  progress?: number
  kind?: FileUploaderKind
  status?: FileUploaderItemStatus
  selected?: boolean
  draggable?: boolean
  onDragStart?: (event: DragEvent<HTMLDivElement>) => void
}

export interface FileUploaderProps {
  items: FileUploaderItem[]
  onPick?: (files: FileList) => void
  onRemove?: (id: string) => void
  onSelect?: (id: string) => void
  onDownload?: (id: string) => void
  onCancel?: (id: string) => void
  onRetry?: (id: string) => void
  accept?: string
  multiple?: boolean
  maxCount?: number
  emptyTitle?: string
  emptyAction?: string
  emptyMeta?: string
  emptyActive?: boolean
  helper?: string
  addLabel?: string
  disabled?: boolean
  addDisabled?: boolean
  allowUpload?: boolean
}

export function FileUploader({
  items,
  onPick,
  onRemove,
  onSelect,
  onDownload,
  onCancel,
  onRetry,
  accept,
  multiple = true,
  maxCount,
  emptyTitle = FileUploaderCopy.DropImages,
  emptyAction = FileUploaderCopy.ChooseImages,
  emptyMeta,
  emptyActive = false,
  helper,
  addLabel = FileUploaderCopy.Add,
  disabled = false,
  addDisabled = false,
  allowUpload = true,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const underCap = maxCount === undefined || items.length < maxCount
  const canAdd = canFileUploaderAdd({
    allowUpload,
    disabled,
    addDisabled,
    underCap,
  })

  const openPicker = () => {
    if (!canAdd) return
    inputRef.current?.click()
  }

  const handleFiles = (list: FileList | null) => {
    if (!list || list.length === 0 || !canAdd || !onPick) return
    onPick(list)
  }

  return (
    <div>
      {allowUpload ? (
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className={FileUploaderClass.HiddenInput}
          disabled={disabled}
          onChange={event => {
            handleFiles(event.target.files)
            event.target.value = ''
          }}
        />
      ) : null}
      {items.length === 0 ? (
        allowUpload ? (
        <button
          type={HtmlElementType.Button}
          disabled={disabled}
          onClick={openPicker}
          onDragOver={event => {
            event.preventDefault()
            event.stopPropagation()
            if (!disabled) setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={event => {
            event.preventDefault()
            event.stopPropagation()
            setDragging(false)
            handleFiles(event.dataTransfer.files)
          }}
          className={cn(
            FileUploaderClass.Empty,
            (dragging || emptyActive) && FileUploaderClass.EmptyActive,
          )}
        >
          <Upload size={18} strokeWidth={1.6} className={FileUploaderClass.EmptyIcon} />
          <span className={FileUploaderClass.EmptyTitle}>{emptyTitle}</span>
          <span className={FileUploaderClass.Choose}>
            <ImagePlus size={13} strokeWidth={1.7} />
            {emptyAction}
          </span>
          {emptyMeta ? <span className={FileUploaderClass.EmptyMeta}>{emptyMeta}</span> : null}
          {helper ? <span className={FileUploaderClass.EmptyMeta}>{helper}</span> : null}
        </button>
        ) : null
      ) : (
        <ul className={FileUploaderClass.Grid}>
          {items.map(item => (
            <li key={item.id}>
              <FileUploaderCell
                item={item}
                onRemove={onRemove}
                onSelect={onSelect}
                onDownload={onDownload}
                onCancel={onCancel}
                onRetry={onRetry}
              />
            </li>
          ))}
          {allowUpload && underCap ? (
            <li>
              <button
                type={HtmlElementType.Button}
                disabled={disabled || addDisabled}
                onClick={openPicker}
                className={addDisabled ? FileUploaderClass.AddCellDimmed : FileUploaderClass.AddCell}
              >
                <Plus size={15} strokeWidth={1.7} />
                <span className={FileUploaderClass.AddLabel}>{addLabel}</span>
              </button>
            </li>
          ) : null}
        </ul>
      )}
    </div>
  )
}
