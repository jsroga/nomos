import React from 'react'
import type { ScreenRect } from './world-canvas-box-geometry'

interface SelectedMaskBounds {
  x: number
  y: number
  width: number
  height: number
}

interface SelectedMaskOverlay {
  imageUrl?: string
  bounds: SelectedMaskBounds
}

interface WorldCanvasSelectOverlaysProps {
  previewBox: ScreenRect | null
  finalizedBox: ScreenRect | null
  selectedMask: SelectedMaskOverlay | null
}

export const WorldCanvasSelectOverlays: React.FC<WorldCanvasSelectOverlaysProps> = ({
  previewBox,
  finalizedBox,
  selectedMask,
}) => (
  <>
    {previewBox && (
      <div
        className="absolute border-2 border-dashed border-blue-400 bg-blue-400/20 pointer-events-none z-10"
        style={{
          left: previewBox.x,
          top: previewBox.y,
          width: previewBox.width,
          height: previewBox.height,
        }}
      />
    )}

    {finalizedBox && !selectedMask && (
      <div
        className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none z-10"
        style={{
          left: finalizedBox.x,
          top: finalizedBox.y,
          width: finalizedBox.width,
          height: finalizedBox.height,
        }}
      />
    )}

    {selectedMask?.imageUrl && (
      <div
        className="absolute pointer-events-none z-10"
        style={{
          left: selectedMask.bounds.x,
          top: selectedMask.bounds.y,
          width: selectedMask.bounds.width,
          height: selectedMask.bounds.height,
        }}
      >
        <img src={selectedMask.imageUrl} alt="Selected Mask" className="w-full h-full" />
        <div className="absolute inset-0 border-2 border-primary rounded-sm" />
      </div>
    )}
  </>
)
