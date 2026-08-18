export enum WorldGenToolLabel {
  Toolbar = 'Canvas tools',
  Pan = 'Pan',
  Select = 'Select',
  Paint = 'Paint',
}

export enum WorldGenToolbarClass {
  Root = 'flex w-[54px] flex-col items-center gap-1.5 rounded-xl bg-black p-1.5',
  Tool = 'flex h-[38px] w-[38px] items-center justify-center rounded-lg text-muted-foreground transition-all duration-150 ease-in-out hover:bg-muted/55 hover:text-foreground',
  ToolActive = 'flex h-[38px] w-[38px] items-center justify-center rounded-lg bg-primary/20 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.45)]',
  Shortcut = 'ml-2 rounded-sm bg-muted px-1 font-mono text-[10px] tracking-[0.08em] text-muted-foreground',
}
