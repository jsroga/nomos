/** Tile canvas border class names for generation/upscale/repaint states. */

export enum TileBorderClass {
  Base = 'absolute border border-border/20 transition-all duration-200',
  Selected = 'border-primary border-2 z-10 shadow-[0_0_15px_rgba(var(--primary),0.5)]',
  Generating = 'border-yellow-500 border-2',
  Upscaling = 'border-orange-500 border-2',
  Repainting = 'border-purple-500 border-2',
  Enhancing = 'border-violet-500 border-2',
  Error = 'border-red-500 border-2',
}
