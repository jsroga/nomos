import { CORK_BOARD_LOADING_PLACEHOLDER_COUNT } from './constants/cork-board'

export enum CorkBoardListMode {
  Empty = 'empty',
  Grid = 'grid',
}

export function corkBoardIsAwaitingBeats(input: {
  awaitingBoardRefresh: boolean
  pendingBoardHydration: boolean
}): boolean {
  return input.awaitingBoardRefresh || input.pendingBoardHydration
}

export function corkBoardListMode(input: {
  beatCount: number
  isAwaitingBeats: boolean
}): CorkBoardListMode {
  if (input.beatCount === 0 && !input.isAwaitingBeats) {
    return CorkBoardListMode.Empty
  }
  return CorkBoardListMode.Grid
}

export function corkBoardShowsLoadingPlaceholders(isAwaitingBeats: boolean): boolean {
  return isAwaitingBeats
}

export function corkBoardLoadingPlaceholderCount(showLoadingCard: boolean): number {
  return showLoadingCard ? CORK_BOARD_LOADING_PLACEHOLDER_COUNT : 0
}
