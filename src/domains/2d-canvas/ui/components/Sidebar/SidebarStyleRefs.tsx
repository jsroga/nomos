import React, { useRef, useState } from 'react'
import { ImagePlus, Upload, X } from 'lucide-react'
import { Button } from '@/components/Button'
import { SidebarLabel } from '@/components/DomainSidebar'
import { cn } from '@/shared/data/utils'
import {
  remainingStyleRefSlots,
  STYLE_REF_FILE_ACCEPT,
  STYLE_REFERENCE_URL_MAX,
} from '@/domains/2d-canvas/constants/mj-sref'
import { WorldGenSidebarWorldCopy } from '../../constants/sidebar'

interface SidebarStyleRefsProps {
  urls: string[]
  isUploading: boolean
  onAddFiles: (files: Iterable<File>) => void
  onRemove: (index: number) => void
  onClear: () => void
}

export const SidebarStyleRefs: React.FC<SidebarStyleRefsProps> = ({
  urls,
  isUploading,
  onAddFiles,
  onRemove,
  onClear,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const remaining = remainingStyleRefSlots(urls.length)
  const canAdd = remaining > 0 && !isUploading

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (canAdd) setIsDragging(true)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    if (!canAdd) return
    onAddFiles(event.dataTransfer.files)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <SidebarLabel>{WorldGenSidebarWorldCopy.StyleImagesLabel}</SidebarLabel>
        {urls.length > 0 ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-1 text-xs text-muted-foreground"
            onClick={onClear}
            disabled={isUploading}
          >
            {WorldGenSidebarWorldCopy.StyleImagesClear}
          </Button>
        ) : null}
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug">
        {WorldGenSidebarWorldCopy.StyleImagesHint}
      </p>
      {urls.length > 0 ? (
        <div className="grid grid-cols-3 gap-1.5">
          {urls.map((url, index) => (
            <div key={`${url}-${index}`} className="relative aspect-square rounded-md overflow-hidden border border-border bg-muted/30">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                className="absolute top-0.5 right-0.5 rounded-sm bg-black/70 p-0.5 text-white hover:bg-black"
                onClick={() => onRemove(index)}
                disabled={isUploading}
                aria-label={WorldGenSidebarWorldCopy.StyleImagesRemove}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'flex flex-col items-center gap-1 rounded-md border border-dashed px-2 py-3 text-center transition-colors',
          isDragging ? 'border-primary bg-primary/10' : 'border-border bg-muted/20',
          !canAdd ? 'opacity-60' : 'hover:border-primary/50',
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={STYLE_REF_FILE_ACCEPT}
          multiple
          className="hidden"
          disabled={!canAdd}
          onChange={event => {
            onAddFiles(event.target.files ?? [])
            event.target.value = ''
          }}
        />
        <Upload size={14} className="text-muted-foreground" />
        <p className="text-[11px] text-muted-foreground">
          {remaining === 0
            ? WorldGenSidebarWorldCopy.StyleImagesFull
            : WorldGenSidebarWorldCopy.StyleImagesDrop}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-xs gap-1"
          disabled={!canAdd}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus size={12} />
          {WorldGenSidebarWorldCopy.StyleImagesChoose}
        </Button>
        <span className="text-[10px] font-mono text-muted-foreground">
          {urls.length}/{STYLE_REFERENCE_URL_MAX}
        </span>
      </div>
    </div>
  )
}
