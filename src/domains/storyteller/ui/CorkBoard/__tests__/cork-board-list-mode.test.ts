import { describe, expect, it } from 'vitest'
import { CORK_BOARD_LOADING_PLACEHOLDER_COUNT } from '../constants/cork-board'
import {
  CorkBoardListMode,
  corkBoardListMode,
  corkBoardLoadingPlaceholderCount,
  corkBoardShowsLoadingPlaceholders,
} from '../cork-board-list-mode'

describe('corkBoardListMode', () => {
  it('shows the empty screen only when the board is idle and has no beats', () => {
    const mode = corkBoardListMode({
      beatCount: 0,
      isChatBusy: false,
      pendingBoardHydration: false,
    })

    expect(mode).toBe(CorkBoardListMode.Empty)
  })

  it('keeps the grid during Add-to-world hydration so placeholders can render', () => {
    const mode = corkBoardListMode({
      beatCount: 0,
      isChatBusy: false,
      pendingBoardHydration: true,
    })

    expect(mode).toBe(CorkBoardListMode.Grid)
  })

  it('keeps the grid while chat is busy even with no beats yet', () => {
    const mode = corkBoardListMode({
      beatCount: 0,
      isChatBusy: true,
      pendingBoardHydration: false,
    })

    expect(mode).toBe(CorkBoardListMode.Grid)
  })

  it('keeps the grid once beats exist, even if hydration is still flagged', () => {
    const mode = corkBoardListMode({
      beatCount: 2,
      isChatBusy: false,
      pendingBoardHydration: true,
    })

    expect(mode).toBe(CorkBoardListMode.Grid)
  })
})

describe('corkBoardShowsLoadingPlaceholders', () => {
  it('shows placeholders while chat is writing beats', () => {
    const show = corkBoardShowsLoadingPlaceholders({
      isChatBusy: true,
      pendingBoardHydration: false,
    })

    expect(show).toBe(true)
  })

  it('shows placeholders while Add to world is committing the board', () => {
    const show = corkBoardShowsLoadingPlaceholders({
      isChatBusy: false,
      pendingBoardHydration: true,
    })

    expect(show).toBe(true)
  })

  it('hides placeholders when the board is idle', () => {
    const show = corkBoardShowsLoadingPlaceholders({
      isChatBusy: false,
      pendingBoardHydration: false,
    })

    expect(show).toBe(false)
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
