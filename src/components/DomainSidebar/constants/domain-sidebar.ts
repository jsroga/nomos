/** DomainSidebar layout and DOM event wire constants. */

export enum SidebarPosition {
  Left = 'left',
  Right = 'right',
}

export enum DomMouseEvent {
  MouseMove = 'mousemove',
  MouseUp = 'mouseup',
}

export enum DomKeyboardEvent {
  KeyDown = 'keydown',
}

export enum SidebarLabelVariant {
  Default = 'default',
  Small = 'small',
}

export const SIDEBAR_DEFAULT_WIDTH = 330
export const SIDEBAR_MIN_WIDTH = 280
export const SIDEBAR_MAX_WIDTH = 500
export const SIDEBAR_COLLAPSED_WIDTH = 56

export enum SidebarCollapseShortcut {
  Key = '\\',
}

export enum SidebarEditableTag {
  Input = 'INPUT',
  Textarea = 'TEXTAREA',
  Select = 'SELECT',
}

export enum SidebarCollapsedStorage {
  True = '1',
  False = '0',
}

export enum SidebarCollapseCopy {
  Collapse = 'Collapse panel',
  Expand = 'Expand panel',
}

export enum SidebarSectionClass {
  Title = 'font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground/80 flex items-center gap-2',
  TitleButton = 'font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground/80 flex items-center gap-1.5 hover:text-foreground transition-all duration-150 ease-in-out w-full text-left',
}

export enum SidebarHeaderClass {
  Wordmark = 'font-mono text-[12.5px] font-normal uppercase tracking-[0.16em] text-foreground/85',
}

export enum SidebarShellClass {
  Root = 'h-full bg-[#101010] flex flex-col relative shrink-0',
  HeaderBand = 'h-[50px] shrink-0 flex items-center gap-2.5 pl-[22px] pr-3.5 border-b border-border/70',
  Body = 'px-3.5 pt-4 pb-[18px]',
  CollapseButton = 'w-8 h-[30px] rounded-lg shadow-[inset_0_0_0_1px_hsl(var(--border)/0.8)] text-muted-foreground/80 flex items-center justify-center transition-all duration-150 ease-in-out hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  CollapsedWordmark = 'font-mono text-[10px] tracking-[0.22em] text-muted-foreground/45 [writing-mode:vertical-rl]',
  Resizing = 'select-none overflow-hidden [&_[data-radix-scroll-area-scrollbar]]:hidden [&_[data-radix-scroll-area-corner]]:hidden',
}
