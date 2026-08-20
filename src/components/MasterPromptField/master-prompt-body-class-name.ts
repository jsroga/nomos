import { cn } from '@/shared/data/utils'
import { MasterPromptFieldClass } from './constants/master-prompt-field'

export function masterPromptBodyClassName(input: {
  clamp: boolean
  collapsedFill: boolean
  expanded: boolean
  filled: boolean
  minRowsClassName: string
}): string {
  const collapsed = input.clamp && !input.expanded
  return cn(
    MasterPromptFieldClass.Body,
    !input.collapsedFill && MasterPromptFieldClass.BodyText,
    input.clamp ? MasterPromptFieldClass.BodyOnFrame : MasterPromptFieldClass.BodyChrome,
    !input.clamp && input.minRowsClassName,
    collapsed && !input.collapsedFill && MasterPromptFieldClass.BodyFillFrame,
    input.collapsedFill && MasterPromptFieldClass.BodyCollapsed,
    input.clamp && input.expanded && MasterPromptFieldClass.BodyExpanded,
  )
}
