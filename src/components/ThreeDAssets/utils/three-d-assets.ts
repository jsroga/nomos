/** ThreeDAssets block copy and class tokens. */

export enum ThreeDAssetsCopy {
  Label = 'ASSETS',
  ShowOnCanvas = 'Show all on canvas',
  HideOnCanvas = 'Hide all on canvas',
  EmptyHelper = 'Drawn from canvas selections, or upload your own.',
  PreviewEmptyHelper = 'No assets to preview.',
  Drop = 'Drop assets here',
  Choose = 'Choose files',
  EmptyMeta = '2D OR 3D · MAX 50MB',
  UploadingHelper = 'Uploads continue while you keep working. Existing assets stay exportable.',
  Removed = 'Asset removed',
  Undo = 'Undo',
  UploadComplete = 'Upload complete',
  UploadFailed = 'Upload failed',
  Unsupported = 'Unsupported format',
  Uploading = 'UPLOADING',
  Of = 'OF',
}

export enum ThreeDAssetsClass {
  Root = 'flex flex-col',
  Header = 'mb-2.5 flex items-center justify-between',
  Label = 'inline-flex items-center gap-2 font-mono text-[10.5px] tracking-[0.16em] uppercase text-muted-foreground/80 whitespace-nowrap',
  Meta = 'flex items-center gap-[9px] text-muted-foreground/70',
  Count = 'font-mono text-[10.5px]',
  Eye = 'text-muted-foreground/70 transition-all duration-150 ease-in-out hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm',
  UploadingLabel = 'font-mono text-[10.5px] tracking-[0.1em] text-primary',
  EmptyHelper = 'mb-2.5 text-[11.5px] leading-[1.6] text-muted-foreground/75',
  QueueHelper = 'mt-3 text-[11.5px] leading-[1.55] text-muted-foreground/70',
  Live = 'sr-only',
}

export const THREE_D_ASSETS_UNDO_MS = 4000

export function fileStem(filename: string): string {
  const base = filename.split('/').pop() ?? filename
  const dot = base.lastIndexOf('.')
  if (dot <= 0) return base
  return base.slice(0, dot)
}

export function formatUploadingLabel(current: number, total: number): string {
  return `${ThreeDAssetsCopy.Uploading} ${current} ${ThreeDAssetsCopy.Of} ${total}`
}
