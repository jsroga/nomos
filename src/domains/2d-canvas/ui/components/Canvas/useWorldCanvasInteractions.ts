import React, { useRef, useState, type RefObject } from 'react'
import { useWorldStore } from '@/domains/2d-canvas'
import { useWorkspaceProjectStore } from '@/shared/workspace/workspace-project-store'
import { selectModeService } from '@/domains/2d-canvas/state/client-services/select-mode-service'
import { getErrorMessage } from '@/shared/errors/error-utils'
import {
  WORLD_CANVAS_API_CALLING_STATUS,
  WORLD_CANVAS_SEGMENTATION_FAILED_LOG,
} from './constants/world-canvas'
import {
  boxFromDragPoints,
  boxFromSelectBox,
  type ScreenRect,
} from './world-canvas-box-geometry'

const MIN_BOX_SIZE = 10
const PROMPT_FOCUS_DELAY_MS = 50

interface PendingBox {
  x1: number
  y1: number
  x2: number
  y2: number
}

interface WorldPoint {
  x: number
  y: number
}

function screenToWorld(
  containerRef: RefObject<HTMLDivElement | null>,
  screenX: number,
  screenY: number,
  viewport: { x: number; y: number; scale: number }
): WorldPoint {
  const rect = containerRef.current?.getBoundingClientRect()
  if (!rect) return { x: 0, y: 0 }

  const mouseX = screenX - rect.left - rect.width / 2
  const mouseY = screenY - rect.top - rect.height / 2

  return {
    x: (mouseX - viewport.x) / viewport.scale,
    y: (mouseY - viewport.y) / viewport.scale,
  }
}

function worldBoxToScreenPosition(
  containerRef: RefObject<HTMLDivElement | null>,
  boxStart: WorldPoint,
  boxEnd: WorldPoint,
  viewport: { x: number; y: number; scale: number }
): { x: number; y: number } | null {
  const rect = containerRef.current?.getBoundingClientRect()
  if (!rect) return null

  const boxMaxX = Math.max(boxEnd.x, boxStart.x)
  const boxMaxY = Math.max(boxEnd.y, boxStart.y)
  return {
    x: boxMaxX * viewport.scale + viewport.x + rect.width / 2 + rect.left,
    y: boxMaxY * viewport.scale + viewport.y + rect.height / 2 + rect.top,
  }
}

export interface WorldCanvasInteractions {
  isDragging: boolean
  showPromptPopover: boolean
  popoverPosition: { x: number; y: number }
  selectTextPrompt: string
  promptInputRef: React.RefObject<HTMLInputElement | null>
  previewBox: ScreenRect | null
  finalizedBox: ScreenRect | null
  handleMouseDown: (e: React.MouseEvent) => void
  handleMouseMove: (e: React.MouseEvent) => void
  handleMouseUp: (e: React.MouseEvent) => void
  handleMouseLeave: () => void
  handleClick: (e: React.MouseEvent) => void
  handlePromptConfirm: () => void
  handlePromptCancel: () => void
  setSelectTextPrompt: (value: string) => void
}

export function useWorldCanvasInteractions(
  containerRef: RefObject<HTMLDivElement | null>
): WorldCanvasInteractions {
  const [isDragging, setIsDragging] = useState(false)
  const lastMousePosRef = useRef({ x: 0, y: 0 })
  const [drawingBoxStart, setDrawingBoxStart] = useState<WorldPoint | null>(null)
  const [drawingBoxEnd, setDrawingBoxEnd] = useState<WorldPoint | null>(null)
  const [showPromptPopover, setShowPromptPopover] = useState(false)
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 })
  const [pendingBox, setPendingBox] = useState<PendingBox | null>(null)
  const promptInputRef = React.useRef<HTMLInputElement>(null)

  // UI-facing flags; handlers use getState() for viewport to avoid pan re-renders.
  const selectBox = useWorldStore(state => state.selectBox)
  const selectTextPrompt = useWorldStore(state => state.selectTextPrompt)
  const setSelectTextPrompt = useWorldStore(state => state.setSelectTextPrompt)
  const currentProject = useWorkspaceProjectStore(state => state.currentProject)

  const triggerSegmentation = async (box: PendingBox) => {
    if (!currentProject) return

    const { selectTextPrompt: textPrompt, tiles, setSegmenting, setSelectedMask, setSelectDebugInfo } =
      useWorldStore.getState()

    setSegmenting(true)
    setSelectDebugInfo({
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
        setSelectDebugInfo(result.debugInfo)
      }
    } catch (error: unknown) {
      console.error(WORLD_CANVAS_SEGMENTATION_FAILED_LOG, error)
      setSelectDebugInfo({
        box,
        apiResponse: { error: getErrorMessage(error) || String(error) },
      })
    } finally {
      setSegmenting(false)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    const {
      viewport,
      isSelectMode: selectMode,
      isRepaintMode: repaintMode,
      setDrawingBox,
      setSelectBox,
      setSelectedMask,
    } = useWorldStore.getState()

    if (selectMode && e.button === 0) {
      if (showPromptPopover) {
        setShowPromptPopover(false)
        setPendingBox(null)
      }

      const worldPos = screenToWorld(containerRef, e.clientX, e.clientY, viewport)
      setDrawingBoxStart(worldPos)
      setDrawingBoxEnd(worldPos)
      setDrawingBox(true)
      setSelectBox(null)
      setSelectedMask(null)
      return
    }

    if (repaintMode) {
      return
    }

    if (e.button === 0) {
      setIsDragging(true)
      lastMousePosRef.current = { x: e.clientX, y: e.clientY }
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const { viewport, setViewport, isSelectMode: selectMode, isDrawingBox: drawing } =
      useWorldStore.getState()

    if (selectMode && drawing && drawingBoxStart) {
      const worldPos = screenToWorld(containerRef, e.clientX, e.clientY, viewport)
      setDrawingBoxEnd(worldPos)
      return
    }

    if (isDragging) {
      const last = lastMousePosRef.current
      const dx = e.clientX - last.x
      const dy = e.clientY - last.y

      setViewport({
        ...viewport,
        x: viewport.x + dx,
        y: viewport.y + dy,
      })

      lastMousePosRef.current = { x: e.clientX, y: e.clientY }
    }
  }

  const finalizeBoxDrawing = () => {
    const {
      viewport,
      isSelectMode: selectMode,
      isDrawingBox: drawing,
      setSelectBox,
      setDrawingBox,
    } = useWorldStore.getState()

    if (!selectMode || !drawing || !drawingBoxStart || !drawingBoxEnd) {
      return false
    }

    const boxWidth = Math.abs(drawingBoxEnd.x - drawingBoxStart.x)
    const boxHeight = Math.abs(drawingBoxEnd.y - drawingBoxStart.y)

    if (boxWidth > MIN_BOX_SIZE && boxHeight > MIN_BOX_SIZE) {
      const box: PendingBox = {
        x1: drawingBoxStart.x,
        y1: drawingBoxStart.y,
        x2: drawingBoxEnd.x,
        y2: drawingBoxEnd.y,
      }

      setPendingBox(box)
      setSelectBox(box)

      const screenPosition = worldBoxToScreenPosition(
        containerRef,
        drawingBoxStart,
        drawingBoxEnd,
        viewport
      )
      if (screenPosition) {
        setPopoverPosition(screenPosition)
      }

      setShowPromptPopover(true)
      setTimeout(() => promptInputRef.current?.focus(), PROMPT_FOCUS_DELAY_MS)
    }

    setDrawingBoxStart(null)
    setDrawingBoxEnd(null)
    setDrawingBox(false)
    return true
  }

  const handleMouseUp = (_e: React.MouseEvent) => {
    if (finalizeBoxDrawing()) {
      return
    }

    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    const { isDrawingBox: drawing, setDrawingBox } = useWorldStore.getState()
    if (drawing) {
      setDrawingBoxStart(null)
      setDrawingBoxEnd(null)
      setDrawingBox(false)
    }
    setIsDragging(false)
  }

  const handleClick = (_e: React.MouseEvent) => {
    if (useWorldStore.getState().isSelectMode) {
      return
    }

    useWorldStore.getState().setSelectedTile(null)
  }

  const handlePromptConfirm = () => {
    if (!pendingBox) return

    setShowPromptPopover(false)
    void triggerSegmentation(pendingBox)
    setPendingBox(null)
  }

  const handlePromptCancel = () => {
    setShowPromptPopover(false)
    setPendingBox(null)
    useWorldStore.getState().setSelectBox(null)
    setSelectTextPrompt('')
  }

  const previewBox =
    drawingBoxStart && drawingBoxEnd ? boxFromDragPoints(drawingBoxStart, drawingBoxEnd) : null

  const finalizedBox = selectBox ? boxFromSelectBox(selectBox) : null

  return {
    isDragging,
    showPromptPopover,
    popoverPosition,
    selectTextPrompt,
    promptInputRef,
    previewBox,
    finalizedBox,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleClick,
    handlePromptConfirm,
    handlePromptCancel,
    setSelectTextPrompt,
  }
}
