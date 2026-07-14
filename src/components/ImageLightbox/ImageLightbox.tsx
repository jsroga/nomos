'use client'

import React, { useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/Button'
import { Dialog, DialogContent, DialogTitle } from '@/components/Dialog'

import {
  IMAGE_LIGHTBOX_DOM_EVENT_KEYDOWN,
  IMAGE_LIGHTBOX_KEYBOARD_KEY,
} from './constants/image-lightbox-keys'

interface ImageLightboxProps {
  isOpen: boolean
  onClose: () => void
  imageSrc: string
  imageAlt?: string
  onNext?: () => void
  onPrev?: () => void
  hasNext?: boolean
  hasPrev?: boolean
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  isOpen,
  onClose,
  imageSrc,
  imageAlt,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
}) => {
  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === IMAGE_LIGHTBOX_KEYBOARD_KEY.ARROW_RIGHT && hasNext && onNext) {
        onNext()
      } else if (e.key === IMAGE_LIGHTBOX_KEYBOARD_KEY.ARROW_LEFT && hasPrev && onPrev) {
        onPrev()
      }
    },
    [isOpen, hasNext, hasPrev, onNext, onPrev]
  )

  useEffect(() => {
    window.addEventListener(IMAGE_LIGHTBOX_DOM_EVENT_KEYDOWN, handleKeyDown)
    return () => window.removeEventListener(IMAGE_LIGHTBOX_DOM_EVENT_KEYDOWN, handleKeyDown)
  }, [handleKeyDown])

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      {/* We use a custom content wrapper to bypass standard dialog restriction if needed, but DialogContent is easier */}
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-fit h-fit p-0 border-none bg-black/90 text-white overflow-hidden flex flex-col items-center justify-center focus:outline-none focus-visible:ring-0 gap-0 shadow-2xl">
        {/* Hidden Title for accessibility */}
        <DialogTitle className="sr-only">Image Lightbox</DialogTitle>

        <div className="relative w-full h-full flex items-center justify-center group">
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-50 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>

          {/* Navigation Arrows */}
          {hasPrev && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 rounded-full bg-black/30 text-white hover:bg-black/60 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity w-12 h-12"
              onClick={e => {
                e.stopPropagation()
                onPrev?.()
              }}
            >
              <ChevronLeft className="w-8 h-8" />
            </Button>
          )}

          {hasNext && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 rounded-full bg-black/30 text-white hover:bg-black/60 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity w-12 h-12"
              onClick={e => {
                e.stopPropagation()
                onNext?.()
              }}
            >
              <ChevronRight className="w-8 h-8" />
            </Button>
          )}

          {/* Image */}
          <div className="relative flex items-center justify-center w-full h-full p-2">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={imageAlt || 'Lightbox Image'}
                className="max-w-full max-h-[90vh] object-contain rounded shadow-lg select-none"
              />
            ) : null}
          </div>

          {imageAlt && (
            <div className="absolute bottom-4 left-0 right-0 text-center px-8 pointer-events-none">
              <span className="bg-black/60 text-white/90 px-3 py-1.5 rounded-full text-sm backdrop-blur-sm inline-block">
                {imageAlt}
              </span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
