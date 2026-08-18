/** Tile canvas border class names for selection, busy, and error states. */

export enum TileBorderClass {
  Base = 'absolute border border-border/20',
  Selected = 'z-10 rounded-[2px]',
  Busy = 'z-10 rounded-[2px] bg-gradient-to-br from-primary/12 to-card',
  Error = 'border-red-500 border-2',
  Ring = 'pointer-events-none absolute inset-0 rounded-[2px] shadow-[inset_0_0_0_2px_hsl(var(--primary))]',
  RingBusy = 'pointer-events-none absolute inset-0 rounded-[2px] shadow-[inset_0_0_0_2px_hsl(var(--primary)/0.6)]',
}
