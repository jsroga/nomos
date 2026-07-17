export enum StorybibleToggleLabel {
  Open = 'Open Storybible',
  Close = 'Close Storybible',
  OpenBadge = 'STORYBIBLE',
  OpenStateBadge = 'BIBLE · OPEN',
}

export enum StorybibleToggleTitle {
  UnavailableWhileWorking = 'Storybible unavailable while agents are working',
  LockedReadOnly = 'Storybible Locked by',
  ReadOnlySuffix = '(Read-Only)',
  LockedByFallback = 'Admin',
}

export enum StorybibleToggleClass {
  Base = 'h-7 px-3 gap-1.5 text-[10px] font-bold border transition-colors duration-150 rounded-md uppercase tracking-widest active:scale-[0.98]',
  OpenLocked = 'bg-red-500/15 text-red-400 border-red-500/40 hover:bg-red-500/25',
  OpenUnlocked = 'bg-amber-500/15 text-amber-400 border-amber-500/40 hover:bg-amber-500/25',
  ClosedLocked = 'bg-transparent text-red-400/70 border-red-500/30 hover:bg-red-500/10 hover:text-red-400',
  ClosedDefault = 'bg-transparent text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground',
  Disabled = 'opacity-50 cursor-not-allowed',
}
