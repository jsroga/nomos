/** Shared file-uploader copy and class tokens. */

export const FILE_UPLOADER_PROGRESS_MIN = 0
export const FILE_UPLOADER_PROGRESS_MAX = 100

export enum FileUploaderCopy {
  DropImages = 'Drop images here',
  ChooseImages = 'Choose images',
  Add = 'Add',
  Remove = 'Remove',
  Download = 'Download',
  Cancel = 'Cancel',
  Retry = 'Retry',
  Queued = 'QUEUED',
  Failed = 'FAILED',
  Chip2d = '2D',
  Chip3d = '3D',
}

export enum FileUploaderKind {
  TwoD = '2d',
  ThreeD = '3d',
}

export enum FileUploaderItemStatus {
  Ready = 'ready',
  Uploading = 'uploading',
  Queued = 'queued',
  Failed = 'failed',
}

export enum FileUploaderKey {
  Enter = 'Enter',
  Delete = 'Delete',
  Backspace = 'Backspace',
}

export enum FileUploaderAriaRole {
  Progressbar = 'progressbar',
}

export enum FileUploaderClass {
  Empty = 'flex w-full flex-col items-center gap-2.5 px-3.5 py-[22px] border border-dashed border-border/85 rounded-[10px] transition-all duration-150 ease-in-out',
  EmptyActive = 'border-primary/60 bg-primary/[0.04]',
  EmptyIcon = 'text-muted-foreground/70',
  EmptyTitle = 'text-xs text-muted-foreground/80',
  Choose = 'inline-flex items-center gap-2 h-8 px-3 rounded-lg shadow-[inset_0_0_0_1px_hsl(var(--border)/0.85)] text-[12.5px] text-foreground/85 transition-all duration-150 ease-in-out hover:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  Grid = 'm-0 list-none grid grid-cols-3 gap-2 p-0 [&>li]:m-0 [&>li]:p-0 [&>li]:min-w-0 [&>li]:aspect-square',
  Thumb = 'relative h-full w-full overflow-hidden rounded-[9px] shadow-[inset_0_0_0_1px_hsl(var(--border)/0.7)] outline-none transition-all duration-150 ease-in-out focus-visible:ring-2 focus-visible:ring-ring',
  ThumbSelected = 'relative h-full w-full overflow-hidden rounded-[9px] shadow-[inset_0_0_0_2px_hsl(var(--primary))] outline-none transition-all duration-150 ease-in-out focus-visible:ring-2 focus-visible:ring-ring',
  ThumbFill = 'flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/75 to-card text-muted-foreground/70',
  Cover = 'h-full w-full object-cover',
  Scrim = 'pointer-events-none absolute inset-x-0 bottom-0 h-[26px] bg-gradient-to-b from-[rgba(9,9,11,0)] to-[rgba(9,9,11,0.72)]',
  Remove = 'absolute top-[5px] right-[5px] w-[19px] h-[19px] rounded-full bg-[rgba(9,9,11,0.82)] shadow-[inset_0_0_0_1px_hsl(var(--border))] text-foreground/90 flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100',
  Download = 'absolute top-[5px] right-[28px] w-[19px] h-[19px] rounded-full bg-[rgba(9,9,11,0.82)] shadow-[inset_0_0_0_1px_hsl(var(--border))] text-foreground/90 flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100',
  AddCell = 'flex h-full w-full flex-col items-center justify-center gap-[5px] rounded-[9px] border border-dashed border-border/85 text-muted-foreground/70 transition-all duration-150 ease-in-out hover:border-primary/50 hover:text-foreground',
  Caption = 'absolute left-1.5 right-1.5 bottom-[5px] font-mono text-[8.5px] tracking-[0.1em] text-foreground/75 truncate',
  AssetCaption = 'pointer-events-none absolute left-[6px] right-[6px] bottom-[5px] font-mono text-[8.5px] tracking-[0.06em] text-foreground/80 truncate',
  Group = 'group',
  AddLabel = 'text-[10px]',
  HiddenInput = 'sr-only',
  EmptyMeta = 'font-mono text-[10.5px] text-muted-foreground/60',
  AddCellDimmed = 'pointer-events-none flex h-full w-full flex-col items-center justify-center gap-[5px] rounded-[9px] border border-dashed border-border/60 text-muted-foreground/40',
  Uploading = 'relative flex h-full w-full flex-col items-center justify-center gap-[7px] overflow-hidden rounded-[9px] bg-card shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.4)]',
  UploadingSpinner = 'h-[15px] w-[15px] rounded-full shadow-[inset_0_0_0_2px_hsl(var(--primary)/0.3)] border-t-2 border-primary animate-spin',
  UploadingPct = 'font-mono text-[9px] tracking-[0.1em] text-primary',
  UploadingTrack = 'absolute left-2 right-2 bottom-2 h-[3px] rounded-sm bg-border',
  UploadingFill = 'block h-full rounded-sm bg-primary',
  Queued = 'relative flex h-full w-full items-center justify-center overflow-hidden rounded-[9px] bg-muted/28 shadow-[inset_0_0_0_1px_hsl(var(--border)/0.6)]',
  QueuedLabel = 'font-mono text-[8.5px] tracking-[0.14em] text-muted-foreground/60',
  Failed = 'relative flex h-full w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-[9px] shadow-[inset_0_0_0_1px_rgba(248,113,113,0.4)] group',
  FailedLabel = 'font-mono text-[8.5px] tracking-[0.14em] text-[#f87171]',
  Retry = 'font-mono text-[8.5px] text-primary opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
  Chip2d = 'absolute top-[5px] left-[5px] px-1.5 py-px rounded font-mono text-[8px] tracking-[0.1em] text-[#93c5fd] bg-[rgba(96,165,250,0.22)] shadow-[inset_0_0_0_1px_rgba(96,165,250,0.35)]',
  Chip3d = 'absolute top-[5px] left-[5px] px-1.5 py-px rounded font-mono text-[8px] tracking-[0.1em] text-[#c4b5fd] bg-[rgba(167,139,250,0.22)] shadow-[inset_0_0_0_1px_rgba(167,139,250,0.35)]',
}

export function isFileUploaderUploading(item: {
  uploading?: boolean
  status?: FileUploaderItemStatus
}): boolean {
  return item.uploading === true || item.status === FileUploaderItemStatus.Uploading
}

export function formatFileUploaderPercent(progress: number): string {
  return `${progress}%`
}

export function canFileUploaderAdd(input: {
  allowUpload: boolean
  disabled: boolean
  addDisabled: boolean
  underCap: boolean
}): boolean {
  return input.allowUpload && !input.disabled && !input.addDisabled && input.underCap
}
