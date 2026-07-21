import React, { useRef } from 'react'
import { useWorldStore } from '@/domains/world-building-toolkit'
import { useWorkspaceProjectStore } from '@/shared/workspace/workspace-project-store'
import { RepaintCanvas } from './RepaintCanvas'
import { useWorldCanvasKeyboard } from './useWorldCanvasKeyboard'
import { useWorldCanvasTour } from './useWorldCanvasTour'
import { useWorldCanvasWheelZoom } from './useWorldCanvasWheelZoom'
import { useWorldCanvasInteractions } from './useWorldCanvasInteractions'
import { renderWorldCanvasTiles } from './world-canvas-tiles'
import { WorldCanvasAssetOverlays } from './WorldCanvasAssetOverlays'
import { WorldCanvasPromptPopover } from './WorldCanvasPromptPopover'
import { WorldCanvasSelectOverlays } from './WorldCanvasSelectOverlays'

export const WorldCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)

  const viewport = useWorldStore(state => state.viewport)
  const tiles = useWorldStore(state => state.tiles)
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
        {renderWorldCanvasTiles(tiles)}

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
      </div>

      <div className="absolute bottom-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-xs pointer-events-none">
        {Math.round(viewport.scale * 100)}%
      </div>

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
