import { CORK_BOARD_LOADING_PLACEHOLDER_COUNT } from './constants/cork-board'

export enum CorkBoardListMode {
  Empty = 'empty',
  Grid = 'grid',
}

export function corkBoardListMode(input: {
  beatCount: number
  isChatBusy: boolean
  pendingBoardHydration: boolean
}): CorkBoardListMode {
  if (input.beatCount === 0 && !input.isChatBusy && !input.pendingBoardHydration) {
    return CorkBoardListMode.Empty
  }
  return CorkBoardListMode.Grid
}

export function corkBoardShowsLoadingPlaceholders(input: {
  isChatBusy: boolean
  pendingBoardHydration: boolean
}): boolean {
  return input.isChatBusy || input.pendingBoardHydration
}

export function corkBoardLoadingPlaceholderCount(showLoadingCard: boolean): number {
  return showLoadingCard ? CORK_BOARD_LOADING_PLACEHOLDER_COUNT : 0
}
