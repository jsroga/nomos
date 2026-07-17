import React, { useRef, useState, useEffect } from 'react'
import { useWorldStore } from '@/domains/world-building-toolkit'
import { RepaintCanvas } from './RepaintCanvas'
import { selectModeService } from '@/domains/world-building-toolkit/state/client-services/select-mode-service'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { useTour } from '@/components/shell/Tour'
import {
  WORLD_CANVAS_API_CALLING_STATUS,
  WORLD_CANVAS_SEGMENTATION_FAILED_LOG,
  WorldCanvasDomEvent,
} from './constants/world-canvas'
import { useWorldCanvasKeyboard } from './useWorldCanvasKeyboard'
import { renderWorldCanvasTiles } from './world-canvas-tiles'
import { WorldCanvasAssetOverlays } from './WorldCanvasAssetOverlays'
import { WorldCanvasPromptPopover } from './WorldCanvasPromptPopover'

export const WorldCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })

  // Local state for box drawing preview (before committing to store)
  const [drawingBoxStart, setDrawingBoxStart] = useState<{ x: number; y: number } | null>(null)
  const [drawingBoxEnd, setDrawingBoxEnd] = useState<{ x: number; y: number } | null>(null)

  // Prompt popover state
  const [showPromptPopover, setShowPromptPopover] = useState(false)
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 })
  const [pendingBox, setPendingBox] = useState<{
    x1: number
    y1: number
    x2: number
    y2: number
  } | null>(null)
  const promptInputRef = React.useRef<HTMLInputElement>(null)

  const viewport = useWorldStore(state => state.viewport)
  const setViewport = useWorldStore(state => state.setViewport)
  const tiles = useWorldStore(state => state.tiles)
  const isRepaintMode = useWorldStore(state => state.isRepaintMode)
  const setRepaintMode = useWorldStore(state => state.setRepaintMode)
  const isSelectMode = useWorldStore(state => state.isSelectMode)
  const setSelectMode = useWorldStore(state => state.setSelectMode)
  const selectBox = useWorldStore(state => state.selectBox)
  const setSelectBox = useWorldStore(state => state.setSelectBox)
  const isDrawingBox = useWorldStore(state => state.isDrawingBox)
  const setDrawingBox = useWorldStore(state => state.setDrawingBox)
  const selectedMask = useWorldStore(state => state.selectedMask)
  const setSelectedMask = useWorldStore(state => state.setSelectedMask)
  const setSegmenting = useWorldStore(state => state.setSegmenting)
  const currentProject = useWorldStore(state => state.currentProject)
  const setSelectedTile = useWorldStore(state => state.setSelectedTile)
  const repaintResult = useWorldStore(state => state.repaintResult)
  const setRepaintResult = useWorldStore(state => state.setRepaintResult)
  const clearRepaintStrokes = useWorldStore(state => state.clearRepaintStrokes)
  const setDebugInfo = useWorldStore(state => state.setDebugInfo)
  const clearSelectBox = useWorldStore(state => state.clearSelectBox)

  // Assets state for overlays
  const assets = useWorldStore(state => state.assets)
  const previewAssetId = useWorldStore(state => state.previewAssetId)
  const showAllAssetMasks = useWorldStore(state => state.showAllAssetMasks)

  // Text prompt for segmentation
  const selectTextPrompt = useWorldStore(state => state.selectTextPrompt)
  const setSelectTextPrompt = useWorldStore(state => state.setSelectTextPrompt)

  // Tour integration: Auto-select (0,0) when reaching the Canvas step
  const { currentStep, isActive: isTourOpen } = useTour()
  const selectedTile = useWorldStore(state => state.selectedTile)

  useEffect(() => {
    // Step 1 is "Your Canvas" (index 1)
    if (isTourOpen && currentStep === 1) {
      // Only set if not already selected to avoid loop
      if (!selectedTile || selectedTile.x !== 0 || selectedTile.y !== 0) {
        setSelectedTile({ x: 0, y: 0 })
      }
    }
  }, [currentStep, isTourOpen, selectedTile, setSelectedTile])

  // Helper to convert screen coordinates to world coordinates
  const screenToWorld = (screenX: number, screenY: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }

    const mouseX = screenX - rect.left - rect.width / 2
    const mouseY = screenY - rect.top - rect.height / 2

    return {
      x: (mouseX - viewport.x) / viewport.scale,
      y: (mouseY - viewport.y) / viewport.scale,
    }
  }

  // Handle Panning and Box Drawing
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isSelectMode && e.button === 0) {
      // Close popover if open and start new selection
      if (showPromptPopover) {
        setShowPromptPopover(false)
        setPendingBox(null)
      }

      // Start drawing bounding box
      const worldPos = screenToWorld(e.clientX, e.clientY)
      setDrawingBoxStart(worldPos)
      setDrawingBoxEnd(worldPos)
      setDrawingBox(true)
      // Clear previous selection
      setSelectBox(null)
      setSelectedMask(null)
      return
    }

    if (isRepaintMode) {
      return
    }

    if (e.button === 0) {
      // Left click for panning
      setIsDragging(true)
      setLastMousePos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    // Handle box drawing
    if (isSelectMode && isDrawingBox && drawingBoxStart) {
      const worldPos = screenToWorld(e.clientX, e.clientY)
      setDrawingBoxEnd(worldPos)
      return
    }

    // Handle panning
    if (isDragging) {
      const dx = e.clientX - lastMousePos.x
      const dy = e.clientY - lastMousePos.y

      setViewport({
        ...viewport,
        x: viewport.x + dx,
        y: viewport.y + dy,
      })

      setLastMousePos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseUp = (_e: React.MouseEvent) => {
    // Finalize box drawing
    if (isSelectMode && isDrawingBox && drawingBoxStart && drawingBoxEnd) {
      const boxWidth = Math.abs(drawingBoxEnd.x - drawingBoxStart.x)
      const boxHeight = Math.abs(drawingBoxEnd.y - drawingBoxStart.y)

      // Only create box if it's larger than a minimum threshold (e.g., 10 world units)
      if (boxWidth > 10 && boxHeight > 10) {
        const box = {
          x1: drawingBoxStart.x,
          y1: drawingBoxStart.y,
          x2: drawingBoxEnd.x,
          y2: drawingBoxEnd.y,
        }

        // Store the box but don't trigger segmentation yet
        setPendingBox(box)
        setSelectBox(box)

        // Position the popover near the box (bottom-right corner in screen coords)
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) {
          const boxMaxX = Math.max(drawingBoxEnd.x, drawingBoxStart.x)
          const boxMaxY = Math.max(drawingBoxEnd.y, drawingBoxStart.y)
          // Convert world to screen
          const screenX = boxMaxX * viewport.scale + viewport.x + rect.width / 2 + rect.left
          const screenY = boxMaxY * viewport.scale + viewport.y + rect.height / 2 + rect.top
          setPopoverPosition({ x: screenX, y: screenY })
        }

        setShowPromptPopover(true)
        // Focus the input after a short delay
        setTimeout(() => promptInputRef.current?.focus(), 50)
      }

      setDrawingBoxStart(null)
      setDrawingBoxEnd(null)
      setDrawingBox(false)
      return
    }

    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    // Cancel box drawing if mouse leaves canvas
    if (isDrawingBox) {
      setDrawingBoxStart(null)
      setDrawingBoxEnd(null)
      setDrawingBox(false)
    }
    setIsDragging(false)
  }

  const handleClick = (_e: React.MouseEvent) => {
    // Don't handle click in select mode (we use mousedown/mouseup for box drawing)
    if (isSelectMode) {
      return
    }

    setSelectedTile(null) // Deselect on background click if not in special mode
  }

  // Handle prompt confirmation and trigger segmentation
  const handlePromptConfirm = () => {
    if (!pendingBox) return

    setShowPromptPopover(false)
    triggerSegmentation(pendingBox)
    setPendingBox(null)
  }

  // Cancel the pending selection
  const handlePromptCancel = () => {
    setShowPromptPopover(false)
    setPendingBox(null)
    setSelectBox(null)
    setSelectTextPrompt('')
  }

  // Trigger segmentation with bounding box
  const triggerSegmentation = async (box: { x1: number; y1: number; x2: number; y2: number }) => {
    if (!currentProject) return

    const textPrompt = useWorldStore.getState().selectTextPrompt

    setSegmenting(true)
    useWorldStore.getState().setSelectDebugInfo({
      box,
      apiResponse: { status: WORLD_CANVAS_API_CALLING_STATUS, textPrompt },
    })

    try {
      const result = await selectModeService.segmentObject(
        box,
        tiles,
        currentProject.id,
        textPrompt
      )
      setSelectedMask(result)

      if (result.debugInfo) {
        useWorldStore.getState().setSelectDebugInfo(result.debugInfo)
      }
    } catch (error: unknown) {
      console.error(WORLD_CANVAS_SEGMENTATION_FAILED_LOG, error)
      useWorldStore.getState().setSelectDebugInfo({
        box,
        apiResponse: { error: getErrorMessage(error) || String(error) },
      })
    } finally {
      setSegmenting(false)
    }
  }

  // Handle Zooming with proper event listener (not passive)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      // Block zooming in repaint mode (and maybe select mode? let's allow zoom in select mode for precision)
      if (isRepaintMode) {
        e.preventDefault()
        return
      }

      e.preventDefault()

      const scaleChange = e.deltaY * -0.001
      const newScale = Math.max(0.1, Math.min(5, viewport.scale + scaleChange))

      // Get mouse position relative to container
      const rect = container.getBoundingClientRect()
      const mouseX = e.clientX - rect.left - rect.width / 2
      const mouseY = e.clientY - rect.top - rect.height / 2

      // Calculate how much the viewport needs to shift to keep the point under the cursor stationary
      const scaleFactor = newScale / viewport.scale
      const newViewportX = mouseX - scaleFactor * (mouseX - viewport.x)
      const newViewportY = mouseY - scaleFactor * (mouseY - viewport.y)

      setViewport({
        x: newViewportX,
        y: newViewportY,
        scale: newScale,
      })
    }

    // Add event listener with passive: false to allow preventDefault
    container.addEventListener(WorldCanvasDomEvent.Wheel, handleWheel, { passive: false })

    return () => {
      container.removeEventListener(WorldCanvasDomEvent.Wheel, handleWheel)
    }
  }, [viewport, setViewport, isRepaintMode])

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

  const previewBox =
    drawingBoxStart && drawingBoxEnd
      ? {
          x: Math.min(drawingBoxStart.x, drawingBoxEnd.x),
          y: Math.min(drawingBoxStart.y, drawingBoxEnd.y),
          width: Math.abs(drawingBoxEnd.x - drawingBoxStart.x),
          height: Math.abs(drawingBoxEnd.y - drawingBoxStart.y),
        }
      : null

  const finalizedBox = selectBox
    ? {
        x: Math.min(selectBox.x1, selectBox.x2),
        y: Math.min(selectBox.y1, selectBox.y2),
        width: Math.abs(selectBox.x2 - selectBox.x1),
        height: Math.abs(selectBox.y2 - selectBox.y1),
      }
    : null

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-background overflow-hidden relative"
      style={{
        cursor: isRepaintMode || isSelectMode ? 'crosshair' : isDragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
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

        {/* Select Mode Overlay */}
        {isSelectMode && (
          <>
            {/* Drawing Box Preview (while dragging) */}
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

            {/* Finalized Box (after mouse up, before/during segmentation) */}
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

            {/* Mask Overlay */}
            {selectedMask && selectedMask.imageUrl && (
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
                {/* Border around mask bounds */}
                <div className="absolute inset-0 border-2 border-primary rounded-sm" />
              </div>
            )}
          </>
        )}

        {/* Asset Overlays - shown when previewing or showAllAssetMasks */}
        {currentProject && (
          <WorldCanvasAssetOverlays
            projectId={currentProject.id}
            assets={assets}
            previewAssetId={previewAssetId}
            showAllAssetMasks={showAllAssetMasks}
          />
        )}
      </div>

      {/* UI Overlay for Scale */}
      <div className="absolute bottom-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-xs pointer-events-none">
        {Math.round(viewport.scale * 100)}%
      </div>

      <RepaintCanvas />

      <WorldCanvasPromptPopover
        show={showPromptPopover}
        position={popoverPosition}
        selectTextPrompt={selectTextPrompt}
        promptInputRef={promptInputRef}
        onPromptChange={setSelectTextPrompt}
        onConfirm={handlePromptConfirm}
        onCancel={handlePromptCancel}
      />
    </div>
  )
}
