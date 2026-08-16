export enum SectionPendingOverlayCopy {
  Title = 'Pending Review',
  Applying = 'Applying Changes...',
  Ready = 'New content ready for approval',
  SavingWait = 'Please wait while changes are being saved',
  Reject = 'Reject',
  Accept = 'Accept',
  Saving = 'Saving...',
  Review = 'Review',
  CloseReview = 'Close Review',
}

export enum SectionPendingOverlayClass {
  MinHeight = 'min-h-[200px]',
  HostRelative = 'relative',
  Layer = 'absolute inset-0 z-20 bg-background/80 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center gap-3 border-2 border-amber-500/50 animate-in fade-in duration-200 overflow-y-auto p-4',
}

export function pendingReviewHostClass(isPending: boolean, isLoading = false): string {
  if (isPending) {
    return `${SectionPendingOverlayClass.HostRelative} ${SectionPendingOverlayClass.MinHeight}`
  }
  if (isLoading) return SectionPendingOverlayClass.HostRelative
  return ''
}
