import { describe, expect, it } from 'vitest'
import { CORK_BOARD_LOADING_PLACEHOLDER_COUNT } from '../constants/cork-board'
import {
  CorkBoardListMode,
  corkBoardIsAwaitingBeats,
  corkBoardListMode,
  corkBoardLoadingPlaceholderCount,
  corkBoardShowsLoadingPlaceholders,
} from '../cork-board-list-mode'

describe('corkBoardListMode', () => {
  it('shows the empty screen only when the board is idle and has no beats', () => {
    const mode = corkBoardListMode({
      beatCount: 0,
      isAwaitingBeats: false,
    })

    expect(mode).toBe(CorkBoardListMode.Empty)
  })

  it('keeps the empty Generate Beat Board CTAs while unrelated chat is busy', () => {
    expect(
      corkBoardIsAwaitingBeats({
        awaitingBoardRefresh: false,
        pendingBoardHydration: false,
      }),
    ).toBe(false)
    expect(
      corkBoardListMode({
        beatCount: 0,
        isAwaitingBeats: false,
      }),
    ).toBe(CorkBoardListMode.Empty)
  })

  it('keeps the grid during Add-to-world hydration so placeholders can render', () => {
    const mode = corkBoardListMode({
      beatCount: 0,
      isAwaitingBeats: corkBoardIsAwaitingBeats({
        awaitingBoardRefresh: false,
        pendingBoardHydration: true,
      }),
    })

    expect(mode).toBe(CorkBoardListMode.Grid)
  })

  it('keeps the grid while this board is waiting for beat text', () => {
    const mode = corkBoardListMode({
      beatCount: 0,
      isAwaitingBeats: corkBoardIsAwaitingBeats({
        awaitingBoardRefresh: true,
        pendingBoardHydration: false,
      }),
    })

    expect(mode).toBe(CorkBoardListMode.Grid)
  })

  it('keeps the grid once beats exist, even if hydration is still flagged', () => {
    const mode = corkBoardListMode({
      beatCount: 2,
      isAwaitingBeats: true,
    })

    expect(mode).toBe(CorkBoardListMode.Grid)
  })
})

describe('corkBoardShowsLoadingPlaceholders', () => {
  it('shows placeholders only while this board is writing or hydrating beats', () => {
    expect(corkBoardShowsLoadingPlaceholders(true)).toBe(true)
    expect(corkBoardShowsLoadingPlaceholders(false)).toBe(false)
  })
})

describe('corkBoardLoadingPlaceholderCount', () => {
  it('renders three loading cards when the grid is hydrating', () => {
    const count = corkBoardLoadingPlaceholderCount(true)

    expect(count).toBe(CORK_BOARD_LOADING_PLACEHOLDER_COUNT)
    expect(count).toBe(3)
  })

  it('renders no loading cards when hydration is off', () => {
    const count = corkBoardLoadingPlaceholderCount(false)

    expect(count).toBe(0)
  })
})
