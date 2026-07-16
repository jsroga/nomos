export interface LiquidGLOptions {
  target: string
  snapshot?: string | HTMLElement | null
  resolution?: number
  refraction?: number
  bevelDepth?: number
  bevelWidth?: number
  intensity?: number
  specular?: boolean
  frost?: number
  text?: string | null
}

export interface LiquidGLLens {
  options: LiquidGLOptions
  updateMetrics?: () => void
}

export interface LiquidGLRenderer {
  _uploadTexture?: (canvas: HTMLCanvasElement) => void
}

declare global {
  interface Window {
    liquidGL: (options: LiquidGLOptions) => LiquidGLLens
    __liquidGLRenderer__?: LiquidGLRenderer
    html2canvas?: (element: HTMLElement, options?: Record<string, unknown>) => Promise<HTMLCanvasElement>
  }
}

export {}
