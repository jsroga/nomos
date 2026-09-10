export const TILE_ACTION_BAR_HEIGHT_PX = 44
export const TILE_ACTION_BAR_GAP_PX = 12
export const TILE_ACTION_BAR_VIEWPORT_MARGIN_PX = 8
export const TILE_ACTION_BAR_ENHANCE_WIDTH_PX = 236
export const TILE_ACTION_BAR_ENHANCE_OFFSET_PX = 8
export const FIDELITY_CREATIVITY_MIN = 0
export const FIDELITY_CREATIVITY_MAX = 1
export const FIDELITY_CREATIVITY_STEP = 0.05

export enum TileActionBarVariant {
  Hidden = 'hidden',
  Empty = 'empty',
  Ready = 'ready',
  Busy = 'busy',
}

export enum TileActionBarCopy {
  Generate = 'Generate',
  Upscale = 'Upscale 4×',
  Enhance = 'Enhance',
  EnhanceFidelity = 'Enhance Fidelity',
  Creativity = 'CREATIVITY',
  Upload = 'Upload image',
  Clear = 'Clear tile',
  ClearTitle = 'Clear this tile?',
  ClearDescription = 'This removes the art on the selected tile.',
  Generating = 'Generating…',
  Upscaling = 'Upscaling…',
  Enhancing = 'Enhancing…',
  Cancel = 'Cancel',
  PlaceholderReady = 'church, forest, river…',
  PlaceholderEmpty = 'describe this tile…',
}

export enum TileActionBarClass {
  Root = 'absolute z-20 box-border flex h-11 items-center gap-1.5 rounded-[11px] border border-border bg-popover px-1.5 shadow-[0_18px_40px_rgba(0,0,0,0.65)]',
  RootBusy = 'absolute z-20 box-border flex h-11 items-center gap-2.5 rounded-[11px] border border-primary/40 bg-popover pl-3 pr-1.5 shadow-[0_18px_40px_rgba(0,0,0,0.65)]',
  Coords = 'px-2 pl-1.5 font-mono text-[10px] tracking-[0.1em] text-muted-foreground/70',
  Divider = 'h-[22px] w-px bg-border',
  Input = 'flex h-8 w-[186px] shrink-0 items-center gap-2 rounded-lg bg-background px-2.5 font-mono text-[11.5px] text-foreground/85 shadow-[inset_0_0_0_1px_hsl(var(--border)/0.8)] placeholder:text-muted-foreground/55 focus:outline-none focus:shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.5)]',
  InputEmpty = 'flex h-8 w-[150px] shrink-0 items-center gap-2 rounded-lg bg-background px-2.5 font-mono text-[11.5px] text-foreground/85 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.5)] placeholder:text-muted-foreground/55 focus:outline-none',
  Generate = 'inline-flex h-8 items-center gap-[7px] rounded-lg bg-primary/20 px-3 text-[12.5px] font-medium text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.45)] transition-all duration-150 ease-in-out hover:bg-primary/30',
  Ghost = 'inline-flex h-8 items-center gap-[7px] rounded-lg px-[11px] text-[12.5px] text-foreground/85 transition-all duration-150 ease-in-out hover:bg-accent/70',
  EnhanceOpen = 'inline-flex h-8 items-center gap-[7px] rounded-lg bg-accent/80 px-[11px] text-[12.5px] text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))]',
  IconBtn = 'flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-all duration-150 ease-in-out hover:bg-accent/70',
  Clear = 'flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg text-[#f87171] transition-all duration-150 ease-in-out hover:bg-[rgba(248,113,113,0.12)]',
  Cancel = 'inline-flex h-8 items-center rounded-lg px-[11px] text-[12.5px] text-muted-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))]',
  Spinner = 'h-[13px] w-[13px] shrink-0 rounded-full shadow-[inset_0_0_0_2px_hsl(var(--primary)/0.35)] border-t-2 border-primary animate-spin',
  Status = 'text-[12.5px]',
  Popover = 'w-[236px] rounded-[11px] border border-border bg-popover p-3.5 shadow-[0_18px_40px_rgba(0,0,0,0.65)]',
  PopoverHeader = 'mb-[11px] flex items-center justify-between',
  PopoverLabel = 'font-mono text-[9.5px] tracking-[0.18em] text-muted-foreground/80',
  PopoverValue = 'font-mono text-[11px] text-foreground',
  Confirm = 'mt-3.5 inline-flex h-[34px] w-full items-center justify-center gap-2 rounded-lg bg-primary/20 text-[12.5px] font-medium text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.45)] hover:bg-primary/30',
  HiddenInput = 'sr-only',
}

export enum TileActionBarAccept {
  Image = 'image/*',
}

export function formatTileCoords(x: number, y: number): string {
  return `${x},${y}`
}

export function formatCreativityValue(value: number): string {
  return value.toFixed(2)
}
