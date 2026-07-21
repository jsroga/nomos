interface Point {
  x: number
  y: number
}

interface AxisAlignedBox {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface ScreenRect {
  x: number
  y: number
  width: number
  height: number
}

export function boxFromDragPoints(start: Point, end: Point): ScreenRect {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  }
}

export function boxFromSelectBox(selectBox: AxisAlignedBox): ScreenRect {
  return boxFromDragPoints(
    { x: selectBox.x1, y: selectBox.y1 },
    { x: selectBox.x2, y: selectBox.y2 }
  )
}
