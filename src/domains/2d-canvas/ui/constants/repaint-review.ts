export const REPAINT_REVIEW_GAP_PX = 12

export enum RepaintPreviewMode {
  Before = 'before',
  After = 'after',
}

export enum RepaintReviewCopy {
  Approve = 'Approve',
  Reject = 'Reject',
  Before = 'Before',
  After = 'After',
  ResultAlt = 'Painted result',
}

export enum RepaintReviewClass {
  Image = 'absolute z-40 pointer-events-none origin-top-left',
  Bar = 'absolute z-[60] box-border flex h-11 items-center gap-1.5 rounded-[11px] border border-border bg-popover px-1.5 shadow-[0_18px_40px_rgba(0,0,0,0.65)]',
  Divider = 'h-[22px] w-px bg-border',
}

export const REPAINT_REVIEW_ORIGIN = '50%'
