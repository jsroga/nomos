import { describe, expect, it, vi } from 'vitest'
import { WorldCanvasToolShortcut } from '../constants/world-canvas'
import { isWorldCanvasSpaceRelease, worldCanvasEventKey } from '../world-canvas-keyboard'
import { enterPanMode, handleEscapeKey } from '../useWorldCanvasKeyboard'
import type { RepaintResult } from '@/domains/2d-canvas/constants/repaint-service'

const REPAINT_RESULT: RepaintResult = {
  imageUrl: 'data:image/png;base64,AA==',
  bounds: { x: 0, y: 0, width: 64, height: 64 },
  paintBounds: { x: 0, y: 0, width: 32, height: 32 },
}

function keyboardParams() {
  return {
    isRepaintMode: true,
    isSelectMode: false,
    repaintResult: null,
    selectedMask: null,
    setRepaintMode: vi.fn(),
    setSelectMode: vi.fn(),
    setRepaintResult: vi.fn(),
    clearRepaintStrokes: vi.fn(),
    setDebugInfo: vi.fn(),
    clearSelectBox: vi.fn(),
    setSelectedMask: vi.fn(),
    spacePanRef: { current: false },
    setSpacePan: vi.fn(),
  }
}

describe('worldCanvasEventKey', () => {
  it('lowercases a defined key', () => {
    expect(worldCanvasEventKey('V')).toBe(WorldCanvasToolShortcut.Pan)
  })

  it('returns undefined when autocomplete omits key', () => {
    expect(worldCanvasEventKey(undefined)).toBeUndefined()
  })
})

describe('isWorldCanvasSpaceRelease', () => {
  it('ignores keyup with no key', () => {
    expect(isWorldCanvasSpaceRelease(undefined, false)).toBe(false)
  })

  it('ignores space while typing in the tile prompt', () => {
    expect(isWorldCanvasSpaceRelease(' ', true)).toBe(false)
  })

  it('releases pan on space outside fields', () => {
    expect(isWorldCanvasSpaceRelease(' ', false)).toBe(true)
  })
})

describe('enterPanMode', () => {
  it('leaves paint without clearing the mask', () => {
    const params = keyboardParams()
    enterPanMode(params)
    expect(params.setRepaintMode).toHaveBeenCalledWith(false)
    expect(params.setSelectMode).toHaveBeenCalledWith(false)
    expect(params.clearRepaintStrokes).not.toHaveBeenCalled()
    expect(params.setRepaintResult).not.toHaveBeenCalled()
  })
})

describe('handleEscapeKey', () => {
  it('exits paint without clearing the mask', () => {
    const params = keyboardParams()
    handleEscapeKey(params)
    expect(params.setRepaintMode).toHaveBeenCalledWith(false)
    expect(params.clearRepaintStrokes).not.toHaveBeenCalled()
  })

  it('discards the generated review overlay', () => {
    const params = { ...keyboardParams(), repaintResult: REPAINT_RESULT }
    handleEscapeKey(params)
    expect(params.setRepaintResult).toHaveBeenCalledWith(null)
    expect(params.clearRepaintStrokes).toHaveBeenCalled()
  })
})
