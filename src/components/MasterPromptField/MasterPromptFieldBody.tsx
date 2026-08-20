'use client'

import { HtmlElementType } from '@/shared/data/constants/protocol'
import { cn } from '@/shared/data/utils'
import { MasterPromptFieldClass, MasterPromptFieldCopy } from './constants/master-prompt-field'
import { formatMasterPromptCharCount } from './format-master-prompt-char-count'
import { masterPromptBodyClassName } from './master-prompt-body-class-name'
import { MasterPromptCollapsedFade } from './master-prompt-collapsed-mask'

interface MasterPromptFieldBodyProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minRowsClassName: string
  clamp: boolean
  expanded: boolean
  onToggleExpanded: () => void
  loading: boolean
  onBlur?: () => void
}

function MasterPromptLoadingSkeleton() {
  return (
    <div className={MasterPromptFieldClass.BodyLoading} aria-busy="true">
      <span className={cn(MasterPromptFieldClass.SkeletonBar, 'w-[92%]')} />
      <span className={cn(MasterPromptFieldClass.SkeletonBar, 'w-[76%] bg-muted/60')} />
      <span className={cn(MasterPromptFieldClass.SkeletonBar, 'w-[58%] bg-muted/45')} />
    </div>
  )
}

export function MasterPromptFieldBody({
  value,
  onChange,
  placeholder,
  minRowsClassName,
  clamp,
  expanded,
  onToggleExpanded,
  loading,
  onBlur,
}: MasterPromptFieldBodyProps) {
  const filled = value.trim().length > 0
  const collapsed = clamp && !expanded
  const collapsedFill = collapsed && filled

  if (loading) return <MasterPromptLoadingSkeleton />

  const textarea = (
    <textarea
      value={value}
      onChange={event => onChange(event.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      className={masterPromptBodyClassName({
        clamp,
        collapsedFill,
        expanded,
        filled,
        minRowsClassName,
      })}
    />
  )

  if (!clamp) return textarea

  return (
    <>
      <div
        className={cn(
          MasterPromptFieldClass.Frame,
          collapsed && MasterPromptFieldClass.FrameClamped,
          clamp && expanded && MasterPromptFieldClass.FrameExpanded,
        )}
      >
        {collapsedFill ? <MasterPromptCollapsedFade value={value} /> : null}
        {textarea}
      </div>
      {filled ? (
        <div className={MasterPromptFieldClass.Footer}>
          <span className={MasterPromptFieldClass.CharCount}>{formatMasterPromptCharCount(value.length)}</span>
          <button type={HtmlElementType.Button} className={MasterPromptFieldClass.ShowAll} onClick={onToggleExpanded}>
            {expanded ? MasterPromptFieldCopy.ShowLess : MasterPromptFieldCopy.ShowAll}
          </button>
        </div>
      ) : null}
    </>
  )
}
