/** Storyteller sidebar footer copy and class tokens. */

export enum StorytellerSidebarStorageKey {
  Panel = 'storyteller',
}

export enum StorytellerSidebarCopy {
  BusyEpisode = 'Can\'t change episode while agents are working',
  SelectProject = 'Please select a project to start.',
}

export enum StorytellerSidebarFooterCopy {
  Fix = 'Fix inconsistencies',
  Export = 'Export',
  Html = 'HTML',
  HtmlExt = '.html',
  Pdf = 'PDF',
  PdfExt = '.pdf',
}

export function isFixInconsistenciesStartDisabled(hasBible: boolean, chatBusy: boolean): boolean {
  return !hasBible || chatBusy
}

export enum StorytellerSidebarFooterClass {
  Bar = 'relative flex gap-[7px] px-3.5 pt-3 pb-3.5 border-t border-border/70',
  Ghost = 'flex-1 inline-flex items-center justify-center gap-2 h-[34px] rounded-lg shadow-[inset_0_0_0_1px_hsl(var(--border)/0.85)] text-[12.5px] text-foreground/85 transition-all duration-150 ease-in-out hover:bg-accent/70 disabled:text-muted-foreground/45 disabled:shadow-[inset_0_0_0_1px_hsl(var(--border)/0.5)] disabled:pointer-events-none',
  Export = 'flex-1 inline-flex items-center justify-center gap-2 h-[34px] rounded-lg bg-primary/14 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.45)] text-[12.5px] text-primary transition-all duration-150 ease-in-out hover:bg-primary/20 disabled:bg-transparent disabled:text-muted-foreground/45 disabled:shadow-[inset_0_0_0_1px_hsl(var(--border)/0.5)] disabled:pointer-events-none',
  Menu = 'w-[172px] p-1.5 rounded-[10px] border border-border bg-popover shadow-[0_16px_36px_rgba(0,0,0,0.6)]',
  Row = 'flex items-center gap-[9px] px-[9px] py-2 rounded-[7px] text-[12.5px] text-foreground/90 cursor-pointer',
  Ext = 'font-mono text-[9px] tracking-[0.1em] text-muted-foreground/70 ml-auto',
}