import React, { useRef, useState, useEffect } from 'react'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { Tile } from './Tile'
import { RepaintCanvas } from './RepaintCanvas'
import { selectModeService } from '@/domains/world-building-toolkit/services/SelectModeService'
import { Sparkles, X, ArrowRight } from 'lucide-react'
import { getErrorMessage } from '@/lib/error-utils'
import { useTour } from '@/components/tour'

const TILE_SIZE = 512

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

  const handleMouseUp = (e: React.MouseEvent) => {
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

  const handleClick = (e: React.MouseEvent) => {
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
      apiResponse: { status: 'Calling API...', textPrompt },
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
      console.error('Segmentation failed:', error)
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
    container.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [viewport, setViewport, isRepaintMode])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignore shortcuts if typing in an input or textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // P - Enter paint mode
      if ((e.key === 'P' || e.key === 'p') && !isRepaintMode && !isSelectMode) {
        e.preventDefault()
        setRepaintMode(true)
      }

      // S - Enter select mode
      if ((e.key === 'S' || e.key === 's') && !isSelectMode && !isRepaintMode) {
        e.preventDefault()
        setSelectMode(true)
      }

      // ESC - Exit modes
      if (e.key === 'Escape') {
        e.preventDefault()
        if (repaintResult) {
          setRepaintResult(null)
          clearRepaintStrokes()
          setDebugInfo(null)
        }
        if (isRepaintMode) {
          setRepaintMode(false)
          clearRepaintStrokes()
          setDebugInfo(null)
        }
        if (isSelectMode) {
          // If mask exists, clear mask. If no mask, exit mode.
          if (selectedMask) {
            setSelectedMask(null)
          } else {
            setSelectMode(false)
            clearSelectBox()
          }
        }
      }

      // Enter - Apply repaint
      if (e.key === 'Enter' && repaintResult) {
        e.preventDefault()
        try {
          const { repaintService } =
            await import('@/domains/world-building-toolkit/services/RepaintService')
          await repaintService.applyRepaint(repaintResult)
          setRepaintResult(null)
          clearRepaintStrokes()
          setDebugInfo(null)
        } catch (error) {
          console.error('Apply repaint failed:', error)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [
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
  ])

  // Render Visible Tiles Logic (Optimization)
  // For now, render known tiles + immediate neighbors of known tiles
  const renderTiles = () => {
    const renderedTiles = []
    const knownCoords = new Set(Object.keys(tiles))

    // Add known tiles
    Object.values(tiles).forEach(tile => {
      renderedTiles.push(
        <Tile key={`${tile.x},${tile.y}`} x={tile.x} y={tile.y} size={TILE_SIZE} />
      )
    })

    // Add empty neighbor placeholders for potential generation
    // This logic can be refined to only show placeholders near viewport or existing tiles
    const potentialNeighbors = new Set<string>()
    Object.values(tiles).forEach(tile => {
      ;[
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ].forEach(([dx, dy]) => {
        const key = `${tile.x + dx},${tile.y + dy}`
        if (!knownCoords.has(key)) {
          potentialNeighbors.add(key)
        }
      })
    })

    // If no tiles exist, show 0,0
    if (Object.keys(tiles).length === 0) {
      potentialNeighbors.add('0,0')
    }

    potentialNeighbors.forEach(key => {
      const [x, y] = key.split(',').map(Number)
      renderedTiles.push(<Tile key={`empty-${x},${y}`} x={x} y={y} size={TILE_SIZE} />)
    })

    return renderedTiles
  }

  // Calculate preview box dimensions for rendering
  const getPreviewBox = () => {
    if (!drawingBoxStart || !drawingBoxEnd) return null
    return {
      x: Math.min(drawingBoxStart.x, drawingBoxEnd.x),
      y: Math.min(drawingBoxStart.y, drawingBoxEnd.y),
      width: Math.abs(drawingBoxEnd.x - drawingBoxStart.x),
      height: Math.abs(drawingBoxEnd.y - drawingBoxStart.y),
    }
  }

  // Calculate finalized box dimensions for rendering
  const getFinalizedBox = () => {
    if (!selectBox) return null
    return {
      x: Math.min(selectBox.x1, selectBox.x2),
      y: Math.min(selectBox.y1, selectBox.y2),
      width: Math.abs(selectBox.x2 - selectBox.x1),
      height: Math.abs(selectBox.y2 - selectBox.y1),
    }
  }

  const previewBox = getPreviewBox()
  const finalizedBox = getFinalizedBox()

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
        {renderTiles()}

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
        {currentProject &&
          assets.map((asset, index) => {
            const isPreview = previewAssetId === asset.id
            const shouldShow = isPreview || showAllAssetMasks

            if (!shouldShow || !asset.metadata?.bounds) return null

            const bounds = asset.metadata.bounds

            // Cycle through bright colors for each asset
            const colors = [
              {
                border: '#3B82F6',
                glow: 'rgba(59, 130, 246, 0.6)',
                filter: 'hue-rotate(200deg) saturate(2) brightness(1.4)',
              }, // Blue
              {
                border: '#10B981',
                glow: 'rgba(16, 185, 129, 0.6)',
                filter: 'hue-rotate(140deg) saturate(2) brightness(1.4)',
              }, // Green
              {
                border: '#F59E0B',
                glow: 'rgba(245, 158, 11, 0.6)',
                filter: 'hue-rotate(30deg) saturate(2) brightness(1.4)',
              }, // Orange
              {
                border: '#EC4899',
                glow: 'rgba(236, 72, 153, 0.6)',
                filter: 'hue-rotate(320deg) saturate(2) brightness(1.4)',
              }, // Pink
              {
                border: '#8B5CF6',
                glow: 'rgba(139, 92, 246, 0.6)',
                filter: 'hue-rotate(260deg) saturate(2) brightness(1.4)',
              }, // Purple
              {
                border: '#06B6D4',
                glow: 'rgba(6, 182, 212, 0.6)',
                filter: 'hue-rotate(180deg) saturate(2) brightness(1.4)',
              }, // Cyan
            ]
            const color = colors[index % colors.length]

            return (
              <div
                key={asset.id}
                className={`absolute pointer-events-none transition-all ${isPreview ? 'z-20' : 'z-5'
                  }`}
                style={{
                  left: bounds.x,
                  top: bounds.y,
                  width: bounds.width,
                  height: bounds.height,
                }}
              >
                {/* Bright colored overlay behind the image */}
                <div
                  className="absolute inset-0 rounded-sm"
                  style={{
                    backgroundColor: color.glow,
                    mixBlendMode: 'screen',
                  }}
                />
                <img
                  src={asset.image_filename.startsWith('http') ? asset.image_filename : `/projects/${currentProject.id}/assets/${asset.image_filename}`}
                  alt="Asset"
                  className="w-full h-full relative"
                  style={{
                    filter: isPreview
                      ? `brightness(1.5) contrast(1.1) drop-shadow(0 0 12px ${color.border})`
                      : `brightness(1.3) contrast(1.05) drop-shadow(0 0 6px ${color.border})`,
                    objectFit: 'fill',
                  }}
                />
                {/* Bright border */}
                <div
                  className="absolute inset-0 rounded-sm"
                  style={{
                    border: `3px solid ${color.border}`,
                    boxShadow: isPreview
                      ? `0 0 20px ${color.glow}, inset 0 0 10px ${color.glow}`
                      : `0 0 10px ${color.glow}`,
                  }}
                />
                {/* Label */}
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
      </div>

      {/* UI Overlay for Scale */}
      <div className="absolute bottom-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-xs pointer-events-none">
        {Math.round(viewport.scale * 100)}%
      </div>

      <RepaintCanvas />

      {/* Prompt Popover - appears after drawing a box */}
      {showPromptPopover && (
        <div
          className="fixed z-50 animate-in fade-in-0 zoom-in-95 duration-150"
          style={{
            left: Math.min(popoverPosition.x + 8, window.innerWidth - 320),
            top: Math.min(popoverPosition.y + 8, window.innerHeight - 120),
          }}
        >
          <div className="bg-card border border-border rounded-xl shadow-2xl p-3 w-72">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">What do you want to select?</span>
              <button onClick={handlePromptCancel} className="ml-auto p-1 hover:bg-muted rounded">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex gap-2">
              <input
                ref={promptInputRef}
                type="text"
                value={selectTextPrompt}
                onChange={e => setSelectTextPrompt(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handlePromptConfirm()
                  } else if (e.key === 'Escape') {
                    handlePromptCancel()
                  }
                }}
                onMouseDown={e => e.stopPropagation()}
                placeholder="e.g., car, person, tree..."
                className="flex-1 bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
              />
              <button
                onClick={e => {
                  e.stopPropagation()
                  handlePromptConfirm()
                }}
                onMouseDown={e => e.stopPropagation()}
                className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center gap-1"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[10px] text-muted-foreground mt-2">
              Press Enter to segment • Esc to cancel • Leave empty for auto-detect
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
