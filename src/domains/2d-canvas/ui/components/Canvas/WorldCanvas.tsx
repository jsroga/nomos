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
import type { WorldGenSidebarState } from '@/domains/2d-canvas/state/hooks/useWorldGenSidebar'
import { WorldCanvasCursor } from './constants/world-canvas'
import { TileActionBar } from './TileActionBar'
import { TileActionBarAccept, TileActionBarClass } from '@/domains/2d-canvas/ui/constants/tile-action-bar'

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

export const WorldCanvas: React.FC<{
  tileBar: Omit<WorldGenSidebarState, 'fileInputRef'>
  fileInputRef: React.RefObject<HTMLInputElement | null>
}> = ({ tileBar, fileInputRef }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const spacePanRef = useRef(false)
  const [spacePan, setSpacePan] = useState(false)
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
    let frame = 0
    const update = () => {
      setViewSize({ width: el.clientWidth || 1920, height: el.clientHeight || 1080 })
    }
    update()
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    })
    ro.observe(el)
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
    }
  }, [])

  useWorldCanvasTour()
  useWorldCanvasWheelZoom(containerRef)

  const interactions = useWorldCanvasInteractions(containerRef, spacePanRef)

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
    spacePanRef,
    setSpacePan,
  })

  const panCursor = interactions.isDragging ? WorldCanvasCursor.Grabbing : WorldCanvasCursor.Grab
  const toolCursor = spacePan
    ? panCursor
    : isRepaintMode || isSelectMode
      ? WorldCanvasCursor.Crosshair
      : panCursor

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-background overflow-hidden relative"
      style={{
        cursor: toolCursor,
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
            showSelectedMask={showAllAssetMasks}
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

      <TileActionBar
        selectedTile={tileBar.selectedTile}
        tiles={tileBar.tiles}
        generatingTiles={tileBar.generatingTiles}
        upscalingTiles={tileBar.upscalingTiles}
        enhancingTiles={tileBar.enhancingTiles}
        tilePrompt={tileBar.tilePrompt}
        setTilePrompt={tileBar.setTilePrompt}
        generationMode={tileBar.generationMode}
        fidelityCreativity={tileBar.fidelityCreativity}
        setFidelityCreativity={tileBar.setFidelityCreativity}
        isUploading={tileBar.isUploading}
        onGenerate={() => {
          void tileBar.handleGenerate()
        }}
        onUpscale={() => {
          void tileBar.handleUpscale()
        }}
        onUploadClick={() => fileInputRef.current?.click()}
        onDelete={() => {
          void tileBar.handleDeleteTile()
        }}
        onCancelBusy={tileBar.handleCancelBusy}
        onEnhance={creativity => {
          void tileBar.handleEnhanceFidelity(creativity)
        }}
        viewWidth={viewSize.width}
        viewHeight={viewSize.height}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={TileActionBarAccept.Image}
        onChange={event => {
          void tileBar.handleUploadTile(event)
        }}
        className={TileActionBarClass.HiddenInput}
      />

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
