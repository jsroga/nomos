import { useEffect } from 'react'
import {
  WORLD_CANVAS_APPLY_REPAINT_FAILED_LOG,
  WorldCanvasDomEvent,
  WorldCanvasDomTag,
  WorldCanvasKey,
} from '@/domains/world-building-toolkit/ui/components/Canvas/constants/world-canvas'
import type { SelectResult } from '@/domains/world-building-toolkit/state/client-services/select-mode-service'

interface RepaintResult {
  imageUrl: string
  bounds: { x: number; y: number; width: number; height: number }
}

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
}

async function applyRepaintResult(repaintResult: RepaintResult): Promise<void> {
  const { repaintService } =
    await import('@/domains/world-building-toolkit/state/client-services/repaint-service')
  await repaintService.applyRepaint(repaintResult)
}

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.tagName === WorldCanvasDomTag.Input ||
      target.tagName === WorldCanvasDomTag.Textarea ||
      target.isContentEditable)
  )
}

function handleEscapeKey(params: UseWorldCanvasKeyboardParams): void {
  if (params.repaintResult) {
    params.setRepaintResult(null)
    params.clearRepaintStrokes()
    params.setDebugInfo(null)
  }
  if (params.isRepaintMode) {
    params.setRepaintMode(false)
    params.clearRepaintStrokes()
    params.setDebugInfo(null)
  }
  if (params.isSelectMode) {
    if (params.selectedMask) {
      params.setSelectedMask(null)
    } else {
      params.setSelectMode(false)
      params.clearSelectBox()
    }
  }
}

export function useWorldCanvasKeyboard({
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
}: UseWorldCanvasKeyboardParams): void {
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return

      if ((e.key === 'P' || e.key === 'p') && !isRepaintMode && !isSelectMode) {
        e.preventDefault()
        setRepaintMode(true)
      }

      if ((e.key === 'S' || e.key === 's') && !isSelectMode && !isRepaintMode) {
        e.preventDefault()
        setSelectMode(true)
      }

      if (e.key === WorldCanvasKey.Escape) {
        e.preventDefault()
        handleEscapeKey({
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
      }

      if (e.key === WorldCanvasKey.Enter && repaintResult) {
        e.preventDefault()
        try {
          await applyRepaintResult(repaintResult)
          setRepaintResult(null)
          clearRepaintStrokes()
          setDebugInfo(null)
        } catch (error) {
          console.error(WORLD_CANVAS_APPLY_REPAINT_FAILED_LOG, error)
        }
      }
    }

    window.addEventListener(WorldCanvasDomEvent.KeyDown, handleKeyDown)
    return () => {
      window.removeEventListener(WorldCanvasDomEvent.KeyDown, handleKeyDown)
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
}
