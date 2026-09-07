/** Tour overlay chrome — `fixed` so highlights sit above the workspace shell. */

export enum TourOverlayClass {
  Dim = 'fixed inset-0 z-[210] overflow-hidden bg-black/50',
  Highlight = 'fixed z-[211] border-2 border-muted-foreground pointer-events-none',
  Card = 'fixed z-[212] rounded-lg border bg-background p-4 shadow-lg',
  Meta = 'absolute right-4 top-4 flex items-center gap-2 text-xs text-muted-foreground',
  Close = 'hover:text-foreground -mr-2 -mt-1 p-1 transition-colors',
}

export const TOUR_POSITION_RETRY_MS = 500
