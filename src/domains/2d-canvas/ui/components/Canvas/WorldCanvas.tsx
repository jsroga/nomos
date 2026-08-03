import React, { memo, useEffect, useRef, useState } from 'react'
import { useWorldStore } from '@/domains/2d-canvas'
import { useWorkspaceProjectStore } from '@/shared/workspace/workspace-project-store'
import { RepaintCanvas } from './RepaintCanvas'
import { useWorldCanvasKeyboard } from './useWorldCanvasKeyboard'
import { useWorldCanvasTour } from './useWorldCanvasTour'
import { useWorldCanvasWheelZoom } from './useWorldCanvasWheelZoom'
import { useWorldCanvasInteractions } from './useWorldCanvasInteractions'
import { WorldCanvasTilesLayer } from './world-canvas-tiles'
import { WorldCanvasAssetOverlays } from './WorldCanvasAssetOverlays'
import { WorldCanvasPromptPopover } from './WorldCanvasPromptPopover'
import { WorldCanvasSelectOverlays } from './WorldCanvasSelectOverlays'

const WorldCanvasViewportTransform = memo(function WorldCanvasViewportTransform({
  children,
}: {
  children: React.ReactNode
}) {
  const viewport = useWorldStore(state => state.viewport)
  return (
    <div
      className="absolute origin-center will-change-transform"
      style={{
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
        width: 0,
        height: 0,
        left: '50%',
        top: '50%',
      }}
    >
      {children}
    </div>
  )
})

const WorldCanvasZoomBadge = memo(function WorldCanvasZoomBadge() {
  const scale = useWorldStore(state => state.viewport.scale)
  return (
    <div className="absolute bottom-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-xs pointer-events-none">
      {Math.round(scale * 100)}%
    </div>
  )
})

export const WorldCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewSize, setViewSize] = useState({ width: 1920, height: 1080 })

  const isRepaintMode = useWorldStore(state => state.isRepaintMode)
  const isSelectMode = useWorldStore(state => state.isSelectMode)
  const selectedMask = useWorldStore(state => state.selectedMask)
  const setRepaintMode = useWorldStore(state => state.setRepaintMode)
  const setSelectMode = useWorldStore(state => state.setSelectMode)
  const repaintResult = useWorldStore(state => state.repaintResult)
  const setRepaintResult = useWorldStore(state => state.setRepaintResult)
  const clearRepaintStrokes = useWorldStore(state => state.clearRepaintStrokes)
  const setDebugInfo = useWorldStore(state => state.setDebugInfo)
  const clearSelectBox = useWorldStore(state => state.clearSelectBox)
  const setSelectedMask = useWorldStore(state => state.setSelectedMask)
  const assets = useWorldStore(state => state.assets)
  const previewAssetId = useWorldStore(state => state.previewAssetId)
  const showAllAssetMasks = useWorldStore(state => state.showAllAssetMasks)
  const currentProject = useWorkspaceProjectStore(state => state.currentProject)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => {
      setViewSize({ width: el.clientWidth || 1920, height: el.clientHeight || 1080 })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useWorldCanvasTour()
  useWorldCanvasWheelZoom(containerRef)

  const interactions = useWorldCanvasInteractions(containerRef)

  useWorldCanvasKeyboard({
    isRepaintMode,
    isSelectMode,
    repaintResult,
    selectedMask,
    setRepaintMode,
    setSelectMode,
    setRepaintResult,
    clearRepaintStrokes,
    setDebugInfo,
    clearSelectBox,
    setSelectedMask,
  })

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-background overflow-hidden relative"
      style={{
        cursor:
          isRepaintMode || isSelectMode
            ? 'crosshair'
            : interactions.isDragging
              ? 'grabbing'
              : 'grab',
      }}
      onMouseDown={interactions.handleMouseDown}
      onMouseMove={interactions.handleMouseMove}
      onMouseUp={interactions.handleMouseUp}
      onMouseLeave={interactions.handleMouseLeave}
      onClick={interactions.handleClick}
    >
      <WorldCanvasViewportTransform>
        <WorldCanvasTilesLayer viewWidth={viewSize.width} viewHeight={viewSize.height} />

        {isSelectMode && (
          <WorldCanvasSelectOverlays
            previewBox={interactions.previewBox}
            finalizedBox={interactions.finalizedBox}
            selectedMask={selectedMask}
          />
        )}

        {currentProject && (
          <WorldCanvasAssetOverlays
            projectId={currentProject.id}
            assets={assets}
            previewAssetId={previewAssetId}
            showAllAssetMasks={showAllAssetMasks}
          />
        )}
      </WorldCanvasViewportTransform>

      <WorldCanvasZoomBadge />

      <RepaintCanvas />

      <WorldCanvasPromptPopover
        show={interactions.showPromptPopover}
        position={interactions.popoverPosition}
        selectTextPrompt={interactions.selectTextPrompt}
        promptInputRef={interactions.promptInputRef}
        onPromptChange={interactions.setSelectTextPrompt}
        onConfirm={interactions.handlePromptConfirm}
        onCancel={interactions.handlePromptCancel}
      />
    </div>
  )
}
