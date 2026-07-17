import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Check, GripVertical } from 'lucide-react'
import { TileReviewLog, TileReviewDomEvent } from '../constants/tile-review-dialog'

export const ComparisonSlider: React.FC<{
  originalUrl: string
  newUrl: string
  newLabel: string
}> = ({ originalUrl, newUrl, newLabel }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [sliderPosition, setSliderPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const [originalError, setOriginalError] = useState(false)
  const [newError, setNewError] = useState(false)

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

      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.5)] cursor-ew-resize z-10"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border border-border">
          <GripVertical size={14} className="text-muted-foreground" />
        </div>
      </div>

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

      {!isDragging && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 rounded text-xs text-white/80 pointer-events-none animate-pulse">
          ← Drag to compare →
        </div>
      )}
    </div>
  )
}

export const VariantPicker: React.FC<{
  variantUrls: string[]
  selectedVariantUrl: string | null
  onSelect: (variantUrl: string) => void
}> = ({ variantUrls, selectedVariantUrl, onSelect }) => (
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

interface TileReviewDialogBodyProps {
  requiresVariantSelection: boolean
  pickerVariantUrls?: string[]
  selectedVariantUrl: string | null
  onSelectVariant: (variantUrl: string) => void
  comparisonOriginalUrl?: string
  newUrl: string
  newLabel: string
}

export const TileReviewDialogBody: React.FC<TileReviewDialogBodyProps> = ({
  requiresVariantSelection,
  pickerVariantUrls,
  selectedVariantUrl,
  onSelectVariant,
  comparisonOriginalUrl,
  newUrl,
  newLabel,
}) => {
  if (requiresVariantSelection && pickerVariantUrls) {
    return (
      <VariantPicker
        variantUrls={pickerVariantUrls}
        selectedVariantUrl={selectedVariantUrl}
        onSelect={onSelectVariant}
      />
    )
  }

  if (comparisonOriginalUrl) {
    return (
      <ComparisonSlider
        originalUrl={comparisonOriginalUrl}
        newUrl={newUrl}
        newLabel={newLabel}
      />
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-primary text-center">Generated Tile</p>
      <div className="relative aspect-square bg-muted rounded-lg overflow-hidden border-2 border-primary max-w-md mx-auto">
        <img src={newUrl} alt="Generated tile" className="w-full h-full object-contain" />
      </div>
    </div>
  )
}
