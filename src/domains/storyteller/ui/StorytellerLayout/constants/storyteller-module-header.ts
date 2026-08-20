/** Storyteller module header (50px) copy and class tokens. */

export enum StorytellerHeaderSlotId {
  BibleChrome = 'storyteller-bible-chrome-slot',
  EpisodeChrome = 'storyteller-episode-chrome-slot',
}

export enum StorytellerHeaderCopy {
  Wordmark = 'STORYTELLER',
  Storybible = 'STORYBIBLE',
  Episodes = 'EPISODES',
  NewEpisode = 'NEW EPISODE',
  EpisodesFromBible = 'EPISODES GENERATE FROM THIS BIBLE',
  Content = 'Content',
  Relationships = 'Relationships',
  Edit = 'Edit',
  Discard = 'Discard',
  Done = 'Done',
  SaveShortcut = '⌘S',
  EditingBible = 'Editing story bible',
  EditingEpisode = 'Editing episode',
}

export enum StorytellerHeaderKey {
  Save = 's',
  Escape = 'Escape',
}

export enum StorytellerHeaderClass {
  Root = 'h-[50px] shrink-0 flex items-center gap-3.5 px-[22px] bg-background border-b border-border/70 z-40 relative',
  RootEditing = 'h-[50px] shrink-0 flex items-center gap-3.5 px-[22px] border-b border-border/70 z-40 relative bg-gradient-to-b from-primary/[0.06] to-primary/[0.02]',
  Switch = 'flex gap-[3px] border border-border/70 rounded-[9px] bg-card/70',
  SwitchDisabled = 'opacity-50 pointer-events-none',
  Segment = 'flex items-center gap-[7px] px-[11px] py-[5px] rounded-md font-mono text-[11px] tracking-[0.1em] uppercase transition-all duration-150 ease-in-out',
  SegmentActive = 'bg-background shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.45)] text-foreground',
  SegmentIdle = 'text-muted-foreground/85 hover:text-foreground',
  SegmentMuted = 'text-muted-foreground/55',
  SegmentTitle = 'max-w-[190px] truncate',
  Divider = 'w-px h-[18px] shrink-0 bg-border/80',
  Tab = 'relative flex items-center gap-[7px] px-[11px] py-[5px] rounded-[7px] font-mono text-[10.5px] tracking-[0.12em] uppercase transition-all duration-150 ease-in-out',
  TabActive = 'bg-primary/16 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.4)] text-primary',
  TabIdle = 'text-muted-foreground/80 hover:text-foreground',
  GhostIcon = 'w-8 h-[30px] rounded-lg shadow-[inset_0_0_0_1px_hsl(var(--border)/0.8)] text-muted-foreground/80 flex items-center justify-center transition-all duration-150 ease-in-out hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  Edit = 'inline-flex items-center gap-[7px] px-3 py-1.5 rounded-lg shadow-[inset_0_0_0_1px_hsl(var(--border)/0.8)] text-[12.5px] text-foreground/85 transition-all duration-150 ease-in-out hover:shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.6)] hover:text-primary',
  Discard = 'px-[11px] py-1.5 rounded-lg text-[12.5px] text-muted-foreground hover:bg-accent/70 hover:text-foreground transition-all duration-150 ease-in-out',
  Done = 'inline-flex items-center gap-[9px] px-[13px] py-1.5 rounded-lg bg-primary/20 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.45)] text-primary text-[12.5px] font-medium hover:bg-primary/30 transition-all duration-150 ease-in-out',
  Helper = 'font-mono text-[10px] tracking-[0.12em] text-muted-foreground/60',
  EditingStatus = 'flex items-center gap-[9px] text-[12.5px]',
}
