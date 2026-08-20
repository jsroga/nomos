import { describe, expect, it } from 'vitest'
import {
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  SidebarPosition,
} from '@/components/DomainSidebar/constants/domain-sidebar'
import { clampSidebarWidth, sidebarWidthFromPointer } from '../sidebar-width'

describe('clampSidebarWidth', () => {
  it('clamps below the minimum', () => {
    expect(clampSidebarWidth(SIDEBAR_MIN_WIDTH - 40)).toBe(SIDEBAR_MIN_WIDTH)
  })

  it('clamps above the maximum', () => {
    expect(clampSidebarWidth(SIDEBAR_MAX_WIDTH + 80)).toBe(SIDEBAR_MAX_WIDTH)
  })

  it('keeps a width inside the range', () => {
    expect(clampSidebarWidth(330)).toBe(330)
  })
})

describe('sidebarWidthFromPointer', () => {
  it('measures from the left edge for a left sidebar', () => {
    expect(
      sidebarWidthFromPointer({
        position: SidebarPosition.Left,
        clientX: 400,
        left: 0,
        right: 330,
      }),
    ).toBe(400)
  })

  it('measures from the right edge for a right sidebar', () => {
    expect(
      sidebarWidthFromPointer({
        position: SidebarPosition.Right,
        clientX: 900,
        left: 700,
        right: 1280,
      }),
    ).toBe(380)
  })
})
