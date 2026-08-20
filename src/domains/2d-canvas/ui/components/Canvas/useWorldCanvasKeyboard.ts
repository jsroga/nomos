import { useEffect, type MutableRefObject } from 'react'
import {
  WORLD_CANVAS_APPLY_REPAINT_FAILED_LOG,
  WorldCanvasDomEvent,
  WorldCanvasKey,
  WorldCanvasToolShortcut,
  WorldCanvasWindowEvent,
} from '@/domains/2d-canvas/ui/components/Canvas/constants/world-canvas'
import {
  REPAINT_APPLY_FAILED_TOAST,
  REPAINT_CHANGES_APPLIED_TOAST,
} from '@/domains/2d-canvas/ui/constants/repaint-toolbar'
import toast from 'react-hot-toast'
import type { RepaintResult } from '@/domains/2d-canvas/constants/repaint-service'
import type { SelectResult } from '@/domains/2d-canvas/state/client-services/select-mode-service'
import {
  isWorldCanvasTypingTarget,
  worldCanvasEventKey,
  isWorldCanvasSpaceRelease,
} from '@/domains/2d-canvas/ui/components/Canvas/world-canvas-keyboard'

interface DebugInfo {
  image: string
  mask: string
}

interface UseWorldCanvasKeyboardParams {
  isRepaintMode: boolean
  isSelectMode: boolean
  repaintResult: RepaintResult | null
  selectedMask: SelectResult | null
  setRepaintMode: (value: boolean) => void
  setSelectMode: (value: boolean) => void
  setRepaintResult: (value: RepaintResult | null) => void
  clearRepaintStrokes: () => void
  setDebugInfo: (value: DebugInfo | null) => void
  clearSelectBox: () => void
  setSelectedMask: (value: SelectResult | null) => void
  spacePanRef: MutableRefObject<boolean>
  setSpacePan: (value: boolean) => void
}

async function applyRepaintResult(repaintResult: RepaintResult): Promise<void> {
  const { repaintService } =
    await import('@/domains/2d-canvas/state/client-services/repaint-service')
  await repaintService.applyRepaint(repaintResult)
}

export function enterPanMode(params: UseWorldCanvasKeyboardParams): void {
  params.setRepaintMode(false)
  params.setSelectMode(false)
  params.setSelectedMask(null)
  params.clearSelectBox()
}

export function handleEscapeKey(params: UseWorldCanvasKeyboardParams): void {
  if (params.repaintResult) {
    params.setRepaintResult(null)
    params.clearRepaintStrokes()
    params.setDebugInfo(null)
  }
  if (params.isRepaintMode) {
    params.setRepaintMode(false)
    params.setDebugInfo(null)
  }
  if (params.isSelectMode) {
    if (params.selectedMask) {
      params.setSelectedMask(null)
      return
    }
    params.setSelectMode(false)
    params.clearSelectBox()
  }
}

export function useWorldCanvasKeyboard(params: UseWorldCanvasKeyboardParams): void {
  const {
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
  } = params

  useEffect(() => {
    const snapshot: UseWorldCanvasKeyboardParams = {
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
    }

    const handleKeyDown = async (e: KeyboardEvent) => {
      if (isWorldCanvasTypingTarget(e.target)) return

      const key = worldCanvasEventKey(e.key)
      if (!key) return

      if (key === WorldCanvasToolShortcut.Space) {
        e.preventDefault()
        if (!spacePanRef.current) {
          spacePanRef.current = true
          setSpacePan(true)
        }
        return
      }

      if (key === WorldCanvasToolShortcut.Pan) {
        e.preventDefault()
        enterPanMode(snapshot)
        return
      }

      if (key === WorldCanvasToolShortcut.Select) {
        e.preventDefault()
        setSelectMode(true)
        setRepaintMode(false)
        return
      }

      if (key === WorldCanvasToolShortcut.Paint) {
        e.preventDefault()
        setSelectMode(false)
        clearSelectBox()
        setSelectedMask(null)
        setRepaintMode(true)
        return
      }

      if (e.key === WorldCanvasKey.Escape) {
        e.preventDefault()
        handleEscapeKey(snapshot)
      }

      if (e.key === WorldCanvasKey.Enter && repaintResult) {
        e.preventDefault()
        try {
          await applyRepaintResult(repaintResult)
          toast.success(REPAINT_CHANGES_APPLIED_TOAST)
          setRepaintResult(null)
          clearRepaintStrokes()
          setDebugInfo(null)
          setRepaintMode(false)
        } catch (error) {
          console.error(WORLD_CANVAS_APPLY_REPAINT_FAILED_LOG, error)
          toast.error(REPAINT_APPLY_FAILED_TOAST)
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!isWorldCanvasSpaceRelease(e.key, isWorldCanvasTypingTarget(e.target))) return
      spacePanRef.current = false
      setSpacePan(false)
    }

    window.addEventListener(WorldCanvasDomEvent.KeyDown, handleKeyDown)
    window.addEventListener(WorldCanvasWindowEvent.KeyUp, handleKeyUp)
    return () => {
      window.removeEventListener(WorldCanvasDomEvent.KeyDown, handleKeyDown)
      window.removeEventListener(WorldCanvasWindowEvent.KeyUp, handleKeyUp)
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
    spacePanRef,
    setSpacePan,
  ])
}
