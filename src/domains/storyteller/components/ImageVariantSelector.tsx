'use client'

import React, { useState, useRef } from 'react'
import { Loader2, Check } from 'lucide-react'

interface ImageVariantSelectorProps {
  gridImageUrl: string
  onSelect: (variantIndex: 1 | 2 | 3 | 4, dataUrl: string) => void
  onCancel?: () => void
  isProcessing?: boolean
}

export const ImageVariantSelector: React.FC<ImageVariantSelectorProps> = ({
  gridImageUrl,
  onSelect,
  onCancel,
  isProcessing = false,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  const handleSelect = async (index: 1 | 2 | 3 | 4) => {
    if (isProcessing) return
    setSelectedIndex(index)

    // Attempt crop
    let dataUrl = ''
    if (imageRef.current && canvasRef.current) {
      try {
        const img = imageRef.current
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')

        if (ctx) {
          const hw = Math.floor(img.naturalWidth / 2)
          const hh = Math.floor(img.naturalHeight / 2)

          const crops: Record<number, { x: number; y: number }> = {
            1: { x: 0, y: 0 },
            2: { x: hw, y: 0 },
            3: { x: 0, y: hh },
            4: { x: hw, y: hh },
          }

          const { x, y } = crops[index]
          canvas.width = hw
          canvas.height = hh

          ctx.drawImage(img, x, y, hw, hh, 0, 0, hw, hh)
          dataUrl = canvas.toDataURL('image/png')
        }
      } catch (e) {
        console.error('Failed to crop image', e)
      }
    }

    onSelect(index, dataUrl)
  }

  // 1 = top-left, 2 = top-right, 3 = bottom-left, 4 = bottom-right
  const variants = [
    { index: 1 as const, label: 'V1', position: 'top-0 left-0' },
    { index: 2 as const, label: 'V2', position: 'top-0 right-0' },
    { index: 3 as const, label: 'V3', position: 'bottom-0 left-0' },
    { index: 4 as const, label: 'V4', position: 'bottom-0 right-0' },
  ]

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div>
            <h3 className="font-bold text-lg">Select Variation</h3>
            <p className="text-sm text-muted-foreground">
              Click a quadrant to select and upscale that variant
            </p>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <Loader2 className="w-5 h-5 opacity-0 absolute" />{' '}
              {/* Hack to keep imports valid if X not imported yet? Wait, I saw X imported in CharacterCreationDialog but not here */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 18 18" />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto flex-1 flex flex-col items-center justify-center bg-zinc-950/50">
          <div className="relative aspect-square w-full max-w-lg shadow-2xl rounded-lg overflow-hidden ring-1 ring-white/10">
            {/* Hidden canvas for cropping */}
            <canvas ref={canvasRef} className="hidden" />

            <img
              ref={imageRef}
              src={gridImageUrl}
              alt="Variations Grid"
              className="w-full h-full object-contain"
              crossOrigin="anonymous"
              onLoad={() => setImageLoaded(true)}
            />

            {/* Overlay Grid */}
            {imageLoaded && (
              <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-[1px] bg-transparent">
                {variants.map(({ index, label }) => (
                  <button
                    key={index}
                    onClick={() => handleSelect(index)}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    disabled={isProcessing}
                    className={`
                    relative group transition-all duration-200 outline-none
                    ${selectedIndex === index ? 'bg-primary/40 ring-4 ring-inset ring-primary z-10' : 'hover:bg-white/10 hover:ring-2 hover:ring-inset hover:ring-white/50'}
                    ${isProcessing && selectedIndex !== index ? 'opacity-30 cursor-not-allowed' : ''}
                    ${isProcessing && selectedIndex === index ? 'cursor-wait' : ''}
                  `}
                  >
                    {/* Label / Loader Center */}
                    <div
                      className={`
                    absolute inset-0 flex items-center justify-center
                    opacity-0 group-hover:opacity-100 transition-opacity duration-200
                    ${selectedIndex === index ? 'opacity-100' : ''}
                  `}
                    >
                      {isProcessing && selectedIndex === index ? (
                        <div className="bg-background/90 text-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2 font-medium">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          Upscaling...
                        </div>
                      ) : (
                        <div className="bg-background/90 text-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2 font-bold transform scale-90 group-hover:scale-100 transition-transform">
                          <Check className="w-4 h-4 text-primary" />
                          Select {label}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
