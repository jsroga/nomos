/** Shared master-prompt field copy and class tokens. */

export enum MasterPromptFieldCopy {
  Suggest = 'Suggest an idea',
  SuggestTitle = 'Get a random creative world prompt idea',
  Suggested = 'Suggested idea',
  Accept = 'Accept',
  Reject = 'Reject',
  Next = 'Next',
  NextTitle = 'Try another idea',
  Save = 'Save',
  ShowAll = 'Show all',
  ShowLess = 'Show less',
  Chars = 'CHARS',
}

export enum MasterPromptSuggestMode {
  Iterate = 'iterate',
  Menu = 'menu',
}

export interface MasterPromptSuggestItem {
  id: string
  label: string
  description?: string
}

export const MASTER_PROMPT_CLAMP_MAX_PX = 100
export const MASTER_PROMPT_EXPAND_PX = 240
export const MASTER_PROMPT_FADE_HEIGHT_PX = 48
export const MASTER_PROMPT_IDEA_PREVIEW_MAX = 88
export const MASTER_PROMPT_IDEA_PREVIEW_SUFFIX = '…'

export enum MasterPromptFieldClass {
  Root = 'flex flex-col',
  LabelRow = 'flex items-center justify-between gap-2 mb-2.5',
  Label = 'inline-flex items-center gap-2 font-mono text-[10.5px] tracking-[0.16em] uppercase text-muted-foreground/80 whitespace-nowrap shrink-0',
  Actions = 'flex shrink-0 items-center gap-1.5',
  Suggest = 'inline-flex items-center gap-1.5 px-[9px] py-1 rounded-[7px] shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.35)] text-primary text-[11.5px] whitespace-nowrap transition-all duration-150 ease-in-out hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  Body = 'w-full appearance-none resize-none px-3.5 py-3 font-mono text-xs leading-[1.7] placeholder:text-muted-foreground/55 focus:outline-none',
  BodyText = 'text-foreground/85',
  BodyChrome = 'border border-border/70 rounded-[9px] bg-card/40 focus:border-primary/70 focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)] transition-all duration-150 ease-in-out',
  Frame = 'relative isolate rounded-[9px] border border-border/70 bg-card/40 transition-all duration-150 ease-in-out focus-within:border-primary/70 focus-within:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]',
  BodyOnFrame = 'bg-transparent rounded-[9px]',
  BodyCollapsed = 'absolute inset-0 z-[2] h-full bg-transparent text-transparent caret-[hsl(var(--foreground))] [-webkit-text-fill-color:transparent]',
  FrameClamped = 'overflow-hidden w-full shrink-0 h-[100px] min-h-[100px] max-h-[100px]',
  FrameExpanded = 'overflow-hidden w-full shrink-0 h-[240px] min-h-[240px] max-h-[240px]',
  Preview = 'h-full overflow-hidden px-3.5 py-3 font-mono text-xs leading-[1.7] text-foreground/85 whitespace-pre-wrap break-words [mask-image:linear-gradient(to_bottom,#000_calc(100%-48px),transparent)] [-webkit-mask-image:linear-gradient(to_bottom,#000_calc(100%-48px),transparent)]',
  Fade = 'pointer-events-none absolute inset-x-px bottom-0 z-[3] h-[48px] rounded-b-[8px] bg-gradient-to-b from-transparent to-black/80',
  BodyFillFrame = 'h-full',
  BodyExpanded = 'h-full overflow-y-auto',
  MinRowsDefault = 'min-h-[88px]',
  MinRowsPage = 'min-h-[72px]',
  Suggestion = 'px-3.5 py-3 border border-primary/35 rounded-[9px] bg-card/40 space-y-3',
  SuggestionLabel = 'flex items-center gap-2 font-mono text-[10.5px] tracking-[0.16em] uppercase text-primary',
  SuggestionText = 'font-mono text-xs leading-[1.7] text-foreground/80',
  GhostAction = 'px-[11px] py-1.5 rounded-lg text-[12.5px] text-muted-foreground hover:bg-accent/70 hover:text-foreground transition-all duration-150 ease-in-out',
  PrimaryAction = 'inline-flex items-center gap-1 px-[13px] py-1.5 rounded-lg bg-primary/20 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.45)] text-primary text-[12.5px] font-medium hover:bg-primary/30 transition-all duration-150 ease-in-out',
  SuggestBusy = 'inline-flex items-center gap-1.5 px-[9px] py-1 rounded-[7px] shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.2)] text-primary/45 text-[11.5px] whitespace-nowrap',
  SuggestSpinner = 'h-[11px] w-[11px] shrink-0 rounded-full shadow-[inset_0_0_0_2px_hsl(var(--primary)/0.3)] border-t-2 border-primary animate-spin',
  BodyLoading = 'flex flex-col gap-2 px-3.5 py-3 border border-primary/35 rounded-[9px] bg-card/40',
  SkeletonBar = 'h-[9px] rounded-[3px] bg-muted/75',
  Footer = 'mt-[7px] flex items-center gap-2',
  CharCount = 'font-mono text-[10px] tracking-[0.1em] text-muted-foreground/60 whitespace-nowrap',
  ShowAll = 'ml-auto shrink-0 whitespace-nowrap text-[11.5px] text-primary transition-all duration-150 ease-in-out hover:text-primary/80',
  IdeaMenu = 'z-[200] max-h-80 w-80 overflow-y-auto',
  IdeaItem = 'flex flex-col items-start gap-0.5 py-2',
  IdeaItemLabel = 'text-sm font-medium',
  IdeaItemHint = 'text-xs text-muted-foreground whitespace-normal',
}
