'use client'

import { useLayoutEffect, useRef } from 'react'
import { HtmlElementType } from '@/shared/data/constants/protocol'
import { cn } from '@/shared/data/utils'
import {
  MASTER_PROMPT_CLAMP_MAX_PX,
  MASTER_PROMPT_FADE_HEIGHT_PX,
  MASTER_PROMPT_HEIGHT_AUTO,
  MasterPromptFieldClass,
  MasterPromptFieldCopy,
} from './constants/master-prompt-field'
import { formatMasterPromptCharCount } from './format-master-prompt-char-count'

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
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const filled = value.trim().length > 0
  const collapsedFill = clamp && filled && !expanded

  useLayoutEffect(() => {
    const node = textareaRef.current
    if (!node) return
    if (!clamp || !expanded) {
      node.style.height = ''
      return
    }
    node.style.height = MASTER_PROMPT_HEIGHT_AUTO
    node.style.height = `${node.scrollHeight}px`
  }, [clamp, expanded, value])

  if (loading) return <MasterPromptLoadingSkeleton />

  const textarea = (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={event => onChange(event.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      className={cn(
        MasterPromptFieldClass.Body,
        !clamp && minRowsClassName,
        collapsedFill && MasterPromptFieldClass.BodyClamped,
        clamp && expanded && filled && MasterPromptFieldClass.BodyExpanded,
      )}
      style={collapsedFill ? { height: MASTER_PROMPT_CLAMP_MAX_PX } : undefined}
    />
  )

  if (!clamp) return textarea

  return (
    <>
      <div className={collapsedFill ? MasterPromptFieldClass.ClampFrame : undefined}>
        {textarea}
        {collapsedFill ? (
          <span className={MasterPromptFieldClass.Fade} style={{ height: MASTER_PROMPT_FADE_HEIGHT_PX }} />
        ) : null}
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
