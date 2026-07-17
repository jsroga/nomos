export enum SectionProgressStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Completed = 'completed',
  Error = 'error',
}

export const SECTION_PROGRESS_CLASS = {
  IndicatorBase: 'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5',
  IndicatorCompleted: 'bg-emerald-500/20 text-emerald-500',
  IndicatorInProgress: 'bg-blue-500/20 text-blue-500',
  IndicatorPending: 'bg-muted text-muted-foreground',
  IndicatorError: 'bg-red-500/20 text-red-500',
  LabelBase: 'text-sm font-medium',
  LabelCompleted: 'text-foreground',
  LabelInProgress: 'text-blue-500',
  LabelPending: 'text-muted-foreground',
  LabelError: 'text-red-500',
  SubLabelCompleted: 'text-foreground',
  SubLabelInProgress: 'text-blue-500',
  SubLabelPending: 'text-muted-foreground',
} as const
