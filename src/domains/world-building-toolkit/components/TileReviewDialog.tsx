'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Check, X, Loader2, GripVertical } from 'lucide-react'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import toast from 'react-hot-toast'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { tileGenerationService } from '@/domains/world-building-toolkit/services/TileGenerationService'

export type TileReviewType = 'generation' | 'fidelity' | 'upscale'

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
  const [originalLoaded, setOriginalLoaded] = useState(false)
  const [newLoaded, setNewLoaded] = useState(false)
  const [originalError, setOriginalError] = useState(false)
  const [newError, setNewError] = useState(false)

  // Debug logging
  useEffect(() => {
    console.log('[ComparisonSlider] URLs:', { originalUrl, newUrl })
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
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      window.addEventListener('touchmove', handleTouchMove)
      window.addEventListener('touchend', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleMouseUp)
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
            console.log('[ComparisonSlider] Original loaded successfully')
            setOriginalLoaded(true)
          }}
          onError={e => {
            console.error('[ComparisonSlider] Original image failed to load:', originalUrl)
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
            console.log('[ComparisonSlider] New image loaded successfully')
            setNewLoaded(true)
          }}
          onError={e => {
            console.error('[ComparisonSlider] New image failed to load:', newUrl)
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
  const [isAccepting, setIsAccepting] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [selectedVariantUrl, setSelectedVariantUrl] = useState<string | null>(null)
  const [isUpscaling, setIsUpscaling] = useState(false)

  const acceptGeneration = useWorldStore(state => state.acceptGeneration)
  const rejectGeneration = useWorldStore(state => state.rejectGeneration)
  const acceptFidelity = useWorldStore(state => state.acceptFidelity)
  const rejectFidelity = useWorldStore(state => state.rejectFidelity)
  const acceptUpscale = useWorldStore(state => state.acceptUpscale)
  const rejectUpscale = useWorldStore(state => state.rejectUpscale)

  const typeLabels = {
    generation: { title: 'Generated', accept: 'Accept Generation', new: 'Generated' },
    fidelity: { title: 'Enhanced', accept: 'Accept Enhancement', new: 'Enhanced' },
    upscale: { title: 'Upscaled', accept: 'Accept Upscale', new: 'Upscaled' },
  }

  const labels = typeLabels[type]
  const title = `Review ${labels.title} Tile (${tileX}, ${tileY})`
  const requiresVariantSelection = type === 'generation' && !!variantUrls?.length

  useEffect(() => {
    if (!open) return
    setSelectedVariantUrl(null)
  }, [open, tileX, tileY, variantUrls])

  const handleAccept = async () => {
    if (requiresVariantSelection && !selectedVariantUrl) {
      toast.error('Select a variant before accepting.')
      return
    }

    setIsAccepting(true)
    try {
      if (tokenId && requiresVariantSelection) {
        // MJ variant selection: complete token with chosen action
        const variantIndex = variantUrls!.findIndex(url => url === selectedVariantUrl || url.split('?')[0] === selectedVariantUrl!.split('?')[0])
        await tileGenerationService.completeVariantSelection(tokenId, 'accept', variantIndex === -1 ? 0 : variantIndex)
        toast.success('Using selected variant...')
        onClose()
      } else if (type === 'generation') {
        await acceptGeneration(tileX, tileY, selectedVariantUrl || undefined)
        toast.success('Generation accepted!')
        onClose()
      } else if (type === 'fidelity') {
        await acceptFidelity(tileX, tileY)
        toast.success('Enhancement accepted!')
        onClose()
      } else {
        await acceptUpscale(tileX, tileY)
        toast.success('Upscale accepted!')
        onClose()
      }
    } catch (error: unknown) {
      toast.error(`Failed to accept: ${getErrorMessage(error)}`)
    } finally {
      setIsAccepting(false)
    }
  }

  const handleUpscale = async () => {
    if (!tokenId || !selectedVariantUrl || !variantUrls) return
    const variantIndex = variantUrls.findIndex(url => url === selectedVariantUrl || url.split('?')[0] === selectedVariantUrl.split('?')[0])
    if (variantIndex === -1) {
      toast.error('Could not determine variant index')
      return
    }
    setIsUpscaling(true)
    try {
      await tileGenerationService.completeVariantSelection(tokenId, 'upscale', variantIndex)
      toast.success('Upscaling variant...')
      onClose()
    } catch (error: unknown) {
      toast.error(`Failed to upscale: ${getErrorMessage(error)}`)
    } finally {
      setIsUpscaling(false)
    }
  }

  const handleReject = () => {
    setIsRejecting(true)
    try {
      if (type === 'generation') {
        rejectGeneration(tileX, tileY)
        toast('Generation rejected', { icon: 'ℹ️' })
      } else if (type === 'fidelity') {
        rejectFidelity(tileX, tileY)
        toast('Enhancement rejected', { icon: 'ℹ️' })
      } else {
        rejectUpscale(tileX, tileY)
        toast('Upscale rejected', { icon: 'ℹ️' })
      }
      onClose()
    } finally {
      setIsRejecting(false)
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        if (requiresVariantSelection && !selectedVariantUrl) return
        handleAccept()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleReject()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, requiresVariantSelection, selectedVariantUrl])

  const hasOriginal = !!originalUrl && !requiresVariantSelection

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
          {requiresVariantSelection ? (
            <VariantPicker
              variantUrls={variantUrls!}
              selectedVariantUrl={selectedVariantUrl}
              onSelect={setSelectedVariantUrl}
            />
          ) : hasOriginal ? (
            <ComparisonSlider originalUrl={originalUrl!} newUrl={newUrl} newLabel={labels.new} />
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
              <kbd className="px-2 py-1 bg-muted rounded border border-border">Enter</kbd> to accept
              • <kbd className="px-2 py-1 bg-muted rounded border border-border">Esc</kbd> to reject
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

              {tokenId && requiresVariantSelection ? (
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
