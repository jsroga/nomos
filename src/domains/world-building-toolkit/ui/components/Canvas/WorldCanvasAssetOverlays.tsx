import React from 'react'
import type { Asset } from '@/domains/world-building-toolkit/core/world-types'
import { ASSET_OVERLAY_COLORS } from '@/domains/world-building-toolkit/constants/asset-overlay-colors'

interface WorldCanvasAssetOverlaysProps {
  projectId: string
  assets: Asset[]
  previewAssetId: string | null
  showAllAssetMasks: boolean
}

export const WorldCanvasAssetOverlays: React.FC<WorldCanvasAssetOverlaysProps> = ({
  projectId,
  assets,
  previewAssetId,
  showAllAssetMasks,
}) => {
  return (
    <>
      {assets.map((asset, index) => {
        const isPreview = previewAssetId === asset.id
        const shouldShow = isPreview || showAllAssetMasks

        if (!shouldShow || !asset.metadata?.bounds) return null

        const bounds = asset.metadata.bounds
        const color = ASSET_OVERLAY_COLORS[index % ASSET_OVERLAY_COLORS.length]
        const imageSrc = asset.image_filename.startsWith('http')
          ? asset.image_filename
          : `/projects/${projectId}/assets/${asset.image_filename}`

        return (
          <div
            key={asset.id}
            className={`absolute pointer-events-none transition-all ${isPreview ? 'z-20' : 'z-5'}`}
            style={{
              left: bounds.x,
              top: bounds.y,
              width: bounds.width,
              height: bounds.height,
            }}
          >
            <div
              className="absolute inset-0 rounded-sm"
              style={{
                backgroundColor: color.glow,
                mixBlendMode: 'screen',
              }}
            />
            <img
              src={imageSrc}
              alt="Asset"
              className="w-full h-full relative"
              style={{
                filter: isPreview
                  ? `brightness(1.5) contrast(1.1) drop-shadow(0 0 12px ${color.border})`
                  : `brightness(1.3) contrast(1.05) drop-shadow(0 0 6px ${color.border})`,
                objectFit: 'fill',
              }}
            />
            <div
              className="absolute inset-0 rounded-sm"
              style={{
                border: `3px solid ${color.border}`,
                boxShadow: isPreview
                  ? `0 0 20px ${color.glow}, inset 0 0 10px ${color.glow}`
                  : `0 0 10px ${color.glow}`,
              }}
            />
            {isPreview && (
              <div
                className="absolute -top-6 left-0 text-xs font-bold px-2 py-0.5 rounded"
                style={{ backgroundColor: color.border, color: 'white' }}
              >
                PREVIEW
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
