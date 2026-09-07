// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { TourStepId } from '@/shared/tours/constants/tour-step-ids'
import {
  getElementPosition,
  isClickWithinTourArea,
} from '../tour-position'
import { TourOverlayClass } from '../constants/tour-overlay'
import { readFileSync } from 'node:fs'

describe('getElementPosition', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('uses viewport coordinates for a visible target', () => {
    const node = document.createElement('div')
    node.id = TourStepId.STORYTELLER_MASTER_PROMPT
    node.getBoundingClientRect = () => ({
      top: 80,
      left: 24,
      width: 280,
      height: 120,
      bottom: 200,
      right: 304,
      x: 24,
      y: 80,
      toJSON: () => ({}),
    })
    document.body.append(node)

    expect(getElementPosition(TourStepId.STORYTELLER_MASTER_PROMPT)).toEqual({
      top: 80,
      left: 24,
      width: 280,
      height: 120,
    })
  })

  it('ignores hidden tour targets so a closed overlay is not highlighted', () => {
    const node = document.createElement('aside')
    node.id = TourStepId.STORYTELLER_CHAT
    node.hidden = true
    node.getBoundingClientRect = () => ({
      top: 0,
      left: 0,
      width: 0,
      height: 0,
      bottom: 0,
      right: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
    document.body.append(node)

    expect(getElementPosition(TourStepId.STORYTELLER_CHAT)).toBeNull()
  })
})

describe('isClickWithinTourArea', () => {
  it('uses client coordinates to match a fixed overlay', () => {
    expect(
      isClickWithinTourArea(
        { clientX: 40, clientY: 90 },
        { top: 80, left: 24, width: 280, height: 120 },
      ),
    ).toBe(true)
    expect(
      isClickWithinTourArea(
        { clientX: 10, clientY: 90 },
        { top: 80, left: 24, width: 280, height: 120 },
      ),
    ).toBe(false)
  })
})

describe('tour overlay chrome', () => {
  it('pins the spotlight above workspace header and chat overlay stacking', () => {
    expect(TourOverlayClass.Dim).toContain('fixed')
    expect(TourOverlayClass.Dim).toContain('z-[210]')
    expect(TourOverlayClass.Highlight).toContain('fixed')
    expect(TourOverlayClass.Card).toContain('fixed')
    expect(readFileSync('src/components/shell/Tour/TourOverlay.tsx', 'utf8')).toContain(
      'TourOverlayClass.Dim',
    )
  })
})

describe('storyteller chat tour step', () => {
  it('opens the workspace overlay before highlighting chat', () => {
    const src = readFileSync('src/shared/tours/storyteller-tour.tsx', 'utf8')
    expect(src).toContain('setOverlayOpen(true)')
    expect(src).toContain('TOUR_STEP_IDS.STORYTELLER_CHAT')
    const overlay = readFileSync(
      'src/shared/chat/ui/WorkspaceChatOverlay/WorkspaceChatOverlay.tsx',
      'utf8',
    )
    expect(overlay).toContain('id={TOUR_STEP_IDS.STORYTELLER_CHAT}')
  })
})
