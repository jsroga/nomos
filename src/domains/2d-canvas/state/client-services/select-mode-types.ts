export interface SelectBox {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface SelectResult {
  imageUrl: string
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
  debugInfo?: {
    contextImage: string
    box: SelectBox
    apiResponse: unknown
    maskUrl?: string
    error?: string
    scale?: number
    worldBounds?: { x: number; y: number; width: number; height: number }
    pixelBounds?: { x: number; y: number; width: number; height: number }
  }
}
