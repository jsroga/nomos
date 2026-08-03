'use client'

import React, { useState } from 'react'
import {
  MJ_VARIANT_PICKER_COPY,
  MjVariantLabel,
  MjVariantPosition,
} from '@/domains/2d-canvas/ui/constants/mj-variant-picker'
import { X, Loader2 } from 'lucide-react'
import { upscaleService } from '../../state/client-services/upscale-service'
import toast from 'react-hot-toast'
import { getErrorMessage } from '@/shared/errors/error-utils'

interface MjVariantPickerProps {
  tileId: string
  tileX: number
  tileY: number
  gridImageUrl: string
  buttons: unknown[]
  taskId: string
  onClose: () => void
  onSelected: () => void
}

export const MjVariantPicker: React.FC<MjVariantPickerProps> = ({
  tileId,
  tileX,
  tileY,
  gridImageUrl,
  onClose,
  onSelected,
}) => {
  const [selecting, setSelecting] = useState<number | null>(null)

  const handleSelectVariant = async (index: 1 | 2 | 3 | 4) => {
    setSelecting(index)
    try {
      await upscaleService.selectMjVariant(tileId, index)
      toast.success(`Variant ${index} selected - processing...`)
      onSelected()
      onClose()
    } catch (error: unknown) {
      console.error(MJ_VARIANT_PICKER_COPY.FAILED_SELECT_VARIANT_LOG, error)
      toast.error(getErrorMessage(error) || MJ_VARIANT_PICKER_COPY.FAILED_SELECT_VARIANT_TOAST)
      setSelecting(null)
    }
  }

  const handleCancel = () => {
    upscaleService.clearMjGrid(tileId)
    onClose()
  }

  // Map variant positions in the 2x2 grid
  // 1 = top-left, 2 = top-right, 3 = bottom-left, 4 = bottom-right
  const variantPositions = [
    { index: 1 as const, label: MjVariantLabel.U1, position: MjVariantPosition.TopLeft },
    { index: 2 as const, label: MjVariantLabel.U2, position: MjVariantPosition.TopRight },
    { index: 3 as const, label: MjVariantLabel.U3, position: MjVariantPosition.BottomLeft },
    { index: 4 as const, label: MjVariantLabel.U4, position: MjVariantPosition.BottomRight },
  ]

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold">Select Midjourney Variant</h2>
            <p className="text-sm text-muted-foreground">
              Tile ({tileX}, {tileY}) - Click on a variant to upscale
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-accent rounded-md transition-colors"
            disabled={selecting !== null}
          >
            <X size={20} />
          </button>
        </div>

        {/* Grid Image with Clickable Regions */}
        <div className="p-4">
          <div className="relative aspect-square w-full max-w-lg mx-auto">
            <img
              src={gridImageUrl}
              alt="Midjourney variants"
              className="w-full h-full object-contain rounded-lg"
            />

            {/* Clickable overlay buttons for each quadrant */}
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1">
              {variantPositions.map(({ index, label }) => (
                <button
                  key={index}
                  onClick={() => handleSelectVariant(index)}
                  disabled={selecting !== null}
                  className={`
                    relative group transition-all duration-200
                    hover:bg-primary/20 hover:ring-2 hover:ring-primary
                    rounded-md
                    ${selecting === index ? 'bg-primary/30 ring-2 ring-primary' : ''}
                    ${selecting !== null && selecting !== index ? 'opacity-50' : ''}
                  `}
                >
                  <div
                    className={`
                    absolute inset-0 flex items-center justify-center
                    opacity-0 group-hover:opacity-100 transition-opacity
                    ${selecting === index ? 'opacity-100' : ''}
                  `}
                  >
                    {selecting === index ? (
                      <div className="bg-primary text-primary-foreground px-3 py-2 rounded-md flex items-center gap-2">
                        <Loader2 className="animate-spin" size={16} />
                        Selecting...
                      </div>
                    ) : (
                      <div className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium font-mono shadow-lg">
                        Select {label}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <p className="text-center text-sm text-muted-foreground mt-4">
            Click on any quadrant to select that variant for upscaling
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <button
            onClick={handleCancel}
            disabled={selecting !== null}
            className="px-4 py-2 text-sm rounded-md hover:bg-accent transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
