export const STYLE_REF_UNDO_TOAST_MS = 4000

export enum StyleRefsCopy {
  StyleImagesLabel = 'Style references',
  StyleImagesHint =
    'Up to 3 images for appearance — medium, brushwork, texture, and color — not the scene they depict.',
  StyleImagesAdminHint = 'Switch a reference on or off. Other users get this set, or their own images if they changed them.',
  StyleImagesDrop = 'Drop images here',
  StyleImagesChoose = 'Choose images',
  StyleImagesUploading = 'UPLOADING',
  ApplyStyleToAll = 'Apply style to all tiles',
  SrefCaption = 'SREF',
  PromptGenerating = 'Prompt is generating — references stay editable.',
  ReferenceRemoved = 'Reference removed',
  Undo = 'Undo',
  StyleRefUploadFailed = 'Could not upload style reference',
  StyleRefsCleared = 'Style references cleared',
  FailedToLoad = 'Failed to load project style refs:',
  FailedToSave = 'Failed to save world settings:',
  FailedToUpload = 'Failed to upload style refs:',
}

export enum StyleRefsClass {
  Header = 'mt-[22px] mb-2 flex items-center gap-2',
  Label = 'inline-flex items-center gap-2 font-mono text-[10.5px] tracking-[0.16em] uppercase text-muted-foreground/80 whitespace-nowrap',
  Count = 'ml-auto font-mono text-[10.5px] text-muted-foreground/60 whitespace-nowrap',
  Uploading = 'ml-auto font-mono text-[10.5px] text-primary whitespace-nowrap',
  Hint = 'mb-2.5 text-[11.5px] leading-[1.6] text-muted-foreground/75 text-pretty',
  Generating = 'mt-2.5 text-[11.5px] leading-[1.6] text-muted-foreground/75',
  CatalogGrid = 'm-0 list-none grid grid-cols-3 gap-2 p-0 [&>li]:m-0 [&>li]:p-0 [&>li]:min-w-0',
  CatalogCell = 'relative aspect-square overflow-hidden rounded-[9px] shadow-[inset_0_0_0_1px_hsl(var(--border)/0.7)]',
  CatalogCellOff = 'opacity-45',
  CatalogImage = 'h-full w-full object-cover',
  CatalogChrome = 'absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-1 px-1.5 py-1 bg-gradient-to-t from-[rgba(9,9,11,0.82)] to-transparent',
  CatalogCaption = 'min-w-0 font-mono text-[8.5px] tracking-[0.06em] text-foreground/85 truncate',
  ApplyAll = 'mt-2.5 w-full font-mono text-[10.5px] tracking-[0.08em] uppercase',
}
