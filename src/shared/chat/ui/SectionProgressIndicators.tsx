import React from 'react'
import { cn } from '@/shared/data/utils'
import { Check, Loader2 } from 'lucide-react'
import {
  SECTION_PROGRESS_CLASS,
  SectionProgressStatus,
} from '@/shared/chat/ui/constants/section-progress'

export function sectionIndicatorClass(status: SectionProgressStatus): string {
  return cn(
    SECTION_PROGRESS_CLASS.IndicatorBase,
    status === SectionProgressStatus.Completed && SECTION_PROGRESS_CLASS.IndicatorCompleted,
    status === SectionProgressStatus.InProgress && SECTION_PROGRESS_CLASS.IndicatorInProgress,
    status === SectionProgressStatus.Pending && SECTION_PROGRESS_CLASS.IndicatorPending,
    status === SectionProgressStatus.Error && SECTION_PROGRESS_CLASS.IndicatorError
  )
}

export function sectionLabelClass(status: SectionProgressStatus): string {
  return cn(
    SECTION_PROGRESS_CLASS.LabelBase,
    status === SectionProgressStatus.Completed && SECTION_PROGRESS_CLASS.LabelCompleted,
    status === SectionProgressStatus.InProgress && SECTION_PROGRESS_CLASS.LabelInProgress,
    status === SectionProgressStatus.Pending && SECTION_PROGRESS_CLASS.LabelPending,
    status === SectionProgressStatus.Error && SECTION_PROGRESS_CLASS.LabelError
  )
}

export function subSectionLabelClass(status: SectionProgressStatus): string {
  return cn(
    status === SectionProgressStatus.Completed && SECTION_PROGRESS_CLASS.SubLabelCompleted,
    status === SectionProgressStatus.InProgress && SECTION_PROGRESS_CLASS.SubLabelInProgress,
    status === SectionProgressStatus.Pending && SECTION_PROGRESS_CLASS.SubLabelPending
  )
}

export const SectionStatusIcon: React.FC<{
  status: SectionProgressStatus
  index: number
}> = ({ status, index }) => {
  if (status === SectionProgressStatus.Completed) {
    return <Check className="w-3.5 h-3.5" />
  }
  if (status === SectionProgressStatus.InProgress) {
    return <Loader2 className="w-3.5 h-3.5 animate-spin" />
  }
  if (status === SectionProgressStatus.Pending) {
    return <span className="text-xs font-medium">{index + 1}</span>
  }
  return <span className="text-xs">!</span>
}

export const SubSectionStatusIcon: React.FC<{ status: SectionProgressStatus }> = ({ status }) => {
  if (status === SectionProgressStatus.Completed) {
    return <Check className="w-3 h-3 text-emerald-500" />
  }
  if (status === SectionProgressStatus.InProgress) {
    return <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
  }
  return <div className="w-3 h-3 rounded-full bg-muted" />
}
