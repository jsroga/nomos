export const CONTACT_SHEET_GAP = 8

/** Kling start_image must be 16:9. Cells stay 16:9 rectangles inside that frame. */
export const CONTACT_SHEET_FRAME_WIDTH = 1920
export const CONTACT_SHEET_FRAME_HEIGHT = 1080

export const CONTACT_SHEET_BG = { r: 18, g: 18, b: 18 } as const
export const CONTACT_SHEET_NUMBER_FILL = '#ffffff'
export const CONTACT_SHEET_BADGE_FILL = 'rgba(0,0,0,0.7)'

export const CONTACT_SHEET_SVG_NS = 'http://www.w3.org/2000/svg'
export const CONTACT_SHEET_HTTPS_REQUIRED =
  'Storyboard contact sheet must be a public HTTPS URL (set BLOB_READ_WRITE_TOKEN)'

export interface ContactSheetCell {
  index: number
  left: number
  top: number
  width: number
  height: number
}

export interface ContactSheetLayout {
  columns: number
  rows: number
  width: number
  height: number
  cells: ContactSheetCell[]
}

export interface ContactSheetGridChoice {
  columns: number
  rows: number
  cellWidth: number
  cellHeight: number
  leftover: number
}

function sixteenNineCellSize(columns: number, rows: number): { width: number; height: number } {
  const maxInnerWidth = CONTACT_SHEET_FRAME_WIDTH - (columns - 1) * CONTACT_SHEET_GAP
  const maxInnerHeight = CONTACT_SHEET_FRAME_HEIGHT - (rows - 1) * CONTACT_SHEET_GAP
  const widthFromFrame = Math.max(1, Math.floor(maxInnerWidth / columns))
  const heightFromWidth = Math.max(
    1,
    Math.floor((widthFromFrame * CONTACT_SHEET_FRAME_HEIGHT) / CONTACT_SHEET_FRAME_WIDTH),
  )
  const gridHeightFromWidth = heightFromWidth * rows + (rows - 1) * CONTACT_SHEET_GAP
  if (gridHeightFromWidth <= CONTACT_SHEET_FRAME_HEIGHT) {
    return { width: widthFromFrame, height: heightFromWidth }
  }
  const heightFromFrame = Math.max(1, Math.floor(maxInnerHeight / rows))
  const widthFromHeight = Math.max(
    1,
    Math.floor((heightFromFrame * CONTACT_SHEET_FRAME_WIDTH) / CONTACT_SHEET_FRAME_HEIGHT),
  )
  return { width: widthFromHeight, height: heightFromFrame }
}

function gridIsBetter(next: ContactSheetGridChoice, best: ContactSheetGridChoice): boolean {
  const nextArea = next.cellWidth * next.cellHeight
  const bestArea = best.cellWidth * best.cellHeight
  if (nextArea !== bestArea) return nextArea > bestArea
  if (next.leftover !== best.leftover) return next.leftover < best.leftover
  return Math.abs(next.columns - next.rows) < Math.abs(best.columns - best.rows)
}

export function chooseContactSheetGrid(cellCount: number): ContactSheetGridChoice {
  const count = Math.max(1, cellCount)
  let best: ContactSheetGridChoice | null = null
  for (let columns = 1; columns <= count; columns += 1) {
    const rows = Math.max(1, Math.ceil(count / columns))
    const cell = sixteenNineCellSize(columns, rows)
    const candidate: ContactSheetGridChoice = {
      columns,
      rows,
      cellWidth: cell.width,
      cellHeight: cell.height,
      leftover: columns * rows - count,
    }
    if (!best || gridIsBetter(candidate, best)) {
      best = candidate
    }
  }
  if (best) return best
  return {
    columns: 1,
    rows: 1,
    cellWidth: CONTACT_SHEET_FRAME_WIDTH,
    cellHeight: CONTACT_SHEET_FRAME_HEIGHT,
    leftover: 0,
  }
}

export function contactSheetLayout(cellCount: number): ContactSheetLayout {
  const count = Math.max(1, cellCount)
  const grid = chooseContactSheetGrid(count)
  const gridWidth = grid.columns * grid.cellWidth + (grid.columns - 1) * CONTACT_SHEET_GAP
  const gridHeight = grid.rows * grid.cellHeight + (grid.rows - 1) * CONTACT_SHEET_GAP
  const originLeft = Math.floor((CONTACT_SHEET_FRAME_WIDTH - gridWidth) / 2)
  const originTop = Math.floor((CONTACT_SHEET_FRAME_HEIGHT - gridHeight) / 2)
  const cells: ContactSheetCell[] = Array.from({ length: count }, (_, index) => {
    const column = index % grid.columns
    const row = Math.floor(index / grid.columns)
    return {
      index,
      left: originLeft + column * (grid.cellWidth + CONTACT_SHEET_GAP),
      top: originTop + row * (grid.cellHeight + CONTACT_SHEET_GAP),
      width: grid.cellWidth,
      height: grid.cellHeight,
    }
  })
  return {
    columns: grid.columns,
    rows: grid.rows,
    width: CONTACT_SHEET_FRAME_WIDTH,
    height: CONTACT_SHEET_FRAME_HEIGHT,
    cells,
  }
}

export function beatHasImageUrl(imageUrl: string | undefined | null): boolean {
  return Boolean(imageUrl && imageUrl.trim().length > 0)
}
