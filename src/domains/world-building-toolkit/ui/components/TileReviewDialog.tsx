'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/Dialog'
import { Button } from '@/components/Button'
import { Check, X, Loader2, GripVertical } from 'lucide-react'
import {
  KeyboardKey,
  TileReviewLog,
  TileReviewDomEvent,
  type TileReviewType,
} from '../constants/tile-review-dialog'
import { useTileReviewDialog } from '../hooks/useTileReviewDialog'

export type { TileReviewType } from '../constants/tile-review-dialog'

interface TileReviewDialogProps {
  open: boolean
  onClose: () => void
  tileX: number
  tileY: number
  newUrl: string
  variantUrls?: string[]
  originalUrl?: string // Optional for first tile generation
  type: TileReviewType
  queueLength?: number // How many items in queue after this one
  tokenId?: string
}

// Comparison slider component
const ComparisonSlider: React.FC<{
  originalUrl: string
  newUrl: string
  newLabel: string
}> = ({ originalUrl, newUrl, newLabel }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [sliderPosition, setSliderPosition] = useState(50) // percentage
  const [isDragging, setIsDragging] = useState(false)
  const [originalError, setOriginalError] = useState(false)
  const [newError, setNewError] = useState(false)

  // Debug logging
  useEffect(() => {
    console.log(TileReviewLog.ComparisonSliderUrls, { originalUrl, newUrl })
  }, [originalUrl, newUrl])

  const updateSliderPosition = useCallback((clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setSliderPosition(percentage)
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    updateSliderPosition(e.clientX)
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return
      updateSliderPosition(e.clientX)
    },
    [isDragging, updateSliderPosition]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    updateSliderPosition(e.touches[0].clientX)
  }

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging) return
      updateSliderPosition(e.touches[0].clientX)
    },
    [isDragging, updateSliderPosition]
  )

  useEffect(() => {
    if (isDragging) {
      window.addEventListener(TileReviewDomEvent.MouseMove, handleMouseMove)
      window.addEventListener(TileReviewDomEvent.MouseUp, handleMouseUp)
      window.addEventListener(TileReviewDomEvent.TouchMove, handleTouchMove)
      window.addEventListener(TileReviewDomEvent.TouchEnd, handleMouseUp)
    }
    return () => {
      window.removeEventListener(TileReviewDomEvent.MouseMove, handleMouseMove)
      window.removeEventListener(TileReviewDomEvent.MouseUp, handleMouseUp)
      window.removeEventListener(TileReviewDomEvent.TouchMove, handleTouchMove)
      window.removeEventListener(TileReviewDomEvent.TouchEnd, handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove])

  return (
    <div
      ref={containerRef}
      className="relative aspect-square bg-muted rounded-lg overflow-hidden cursor-ew-resize select-none"
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Original image (bottom layer, full width) */}
      <div className="absolute inset-0">
        {originalError && (
          <div className="w-full h-full flex items-center justify-center text-destructive text-sm">
            Failed to load original
          </div>
        )}
        <img
          src={originalUrl}
          alt="Original"
          className="w-full h-full object-contain pointer-events-none"
          draggable={false}
          onLoad={() => {
            console.log(TileReviewLog.OriginalLoaded)
          }}
          onError={() => {
            console.error(TileReviewLog.OriginalFailed, originalUrl)
            setOriginalError(true)
          }}
        />
      </div>

      {/* New image (top layer, clipped by slider using clip-path) */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        {newError && (
          <div className="w-full h-full flex items-center justify-center text-destructive text-sm">
            Failed to load new
          </div>
        )}
        <img
          src={newUrl}
          alt="New"
          className="w-full h-full object-contain pointer-events-none"
          draggable={false}
          onLoad={() => {
            console.log(TileReviewLog.NewLoaded)
          }}
          onError={() => {
            console.error(TileReviewLog.NewFailed, newUrl)
            setNewError(true)
          }}
        />
      </div>

      {/* Slider handle */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.5)] cursor-ew-resize z-10"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
      >
        {/* Handle grip */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border border-border">
          <GripVertical size={14} className="text-muted-foreground" />
        </div>
      </div>

      {/* Labels */}
      <div
        className="absolute top-2 left-2 px-2 py-1 bg-black/70 rounded text-xs text-white font-medium font-mono pointer-events-none transition-opacity"
        style={{ opacity: sliderPosition > 15 ? 1 : 0 }}
      >
        {newLabel}
      </div>
      <div
        className="absolute top-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-white font-medium font-mono pointer-events-none transition-opacity"
        style={{ opacity: sliderPosition < 85 ? 1 : 0 }}
      >
        Original
      </div>

      {/* Instruction hint - fades out after interaction */}
      {!isDragging && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 rounded text-xs text-white/80 pointer-events-none animate-pulse">
          ← Drag to compare →
        </div>
      )}
    </div>
  )
}

const VariantPicker: React.FC<{
  variantUrls: string[]
  selectedVariantUrl: string | null
  onSelect: (variantUrl: string) => void
}> = ({ variantUrls, selectedVariantUrl, onSelect }) => {
  return (
    <div className="space-y-3">
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-primary">Choose 1 of 4 variants</p>
        <p className="text-xs text-muted-foreground">
          Select a Midjourney option, then confirm with Accept or Reject.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {variantUrls.map((variantUrl, index) => {
          const isSelected = selectedVariantUrl === variantUrl

          return (
            <button
              key={variantUrl}
              type="button"
              onClick={() => onSelect(variantUrl)}
              className={`group rounded-xl border p-2 text-left transition ${
                isSelected
                  ? 'border-primary bg-primary/10 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]'
                  : 'border-border/60 bg-muted/20 hover:border-primary/50 hover:bg-muted/40'
              }`}
            >
              <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                <img
                  src={variantUrl}
                  alt={`Variant ${index + 1}`}
                  className="h-full w-full object-contain"
                />
                <div className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-1 text-[10px] font-mono text-white">
                  Variant {index + 1}
                </div>
                {isSelected && (
                  <div className="absolute right-2 top-2 rounded-full bg-primary p-1 text-primary-foreground">
                    <Check size={12} />
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export const TileReviewDialog: React.FC<TileReviewDialogProps> = ({
  open,
  onClose,
  tileX,
  tileY,
  newUrl,
  variantUrls,
  originalUrl,
  type,
  queueLength = 0,
  tokenId,
}) => {
  const {
    labels,
    title,
    requiresVariantSelection,
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
    showMjActions,
  } = useTileReviewDialog({
    open,
    onClose,
    tileX,
    tileY,
    newUrl,
    variantUrls,
    originalUrl,
    type,
    tokenId,
  })

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl bg-background/80 backdrop-blur-2xl border-border/50 rounded-2xl shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{title}</DialogTitle>
            {queueLength > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                +{queueLength} more in queue
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {requiresVariantSelection && pickerVariantUrls ? (
            <VariantPicker
              variantUrls={pickerVariantUrls}
              selectedVariantUrl={selectedVariantUrl}
              onSelect={setSelectedVariantUrl}
            />
          ) : comparisonOriginalUrl ? (
            <ComparisonSlider originalUrl={comparisonOriginalUrl} newUrl={newUrl} newLabel={labels.new} />
          ) : (
            /* Single image for first tile */
            <div className="space-y-2">
              <p className="text-sm font-medium text-primary text-center">Generated Tile</p>
              <div className="relative aspect-square bg-muted rounded-lg overflow-hidden border-2 border-primary max-w-md mx-auto">
                <img src={newUrl} alt="Generated tile" className="w-full h-full object-contain" />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4">
            <div className="text-xs text-muted-foreground">
              <kbd className="px-2 py-1 bg-muted rounded border border-border">{KeyboardKey.Enter}</kbd> to accept
              • <kbd className="px-2 py-1 bg-muted rounded border border-border">{KeyboardKey.Escape}</kbd> to reject
              {requiresVariantSelection && !selectedVariantUrl && (
                <span className="ml-2 text-amber-500">Select a variant first</span>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleReject}
                disabled={isAccepting || isRejecting || isUpscaling}
                className="gap-2"
              >
                {isRejecting ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                Reject
              </Button>

              {showMjActions ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleAccept}
                    disabled={isAccepting || isRejecting || isUpscaling || !selectedVariantUrl}
                    className="gap-2"
                  >
                    {isAccepting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    Use this
                  </Button>
                  <Button
                    onClick={handleUpscale}
                    disabled={isAccepting || isRejecting || isUpscaling || !selectedVariantUrl}
                    className="gap-2"
                  >
                    {isUpscaling ? <Loader2 size={16} className="animate-spin" /> : null}
                    Upscale this
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleAccept}
                  disabled={
                    isAccepting || isRejecting || (requiresVariantSelection && !selectedVariantUrl)
                  }
                  className="gap-2"
                >
                  {isAccepting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {labels.accept}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
