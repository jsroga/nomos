'use client'

import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { cn } from '@/shared/data/utils'

enum BibleMarkdownClass {
  Block = '[&_p]:mb-3 [&_p:last-child]:mb-0 [&_strong]:font-semibold',
}

enum MarkdownElement {
  Paragraph = 'p',
}

function MarkdownInlineParagraph({ children }: { children?: ReactNode }) {
  return <>{children}</>
}

const BIBLE_MARKDOWN_INLINE_COMPONENTS: Components = {
  [MarkdownElement.Paragraph]: MarkdownInlineParagraph,
}

interface BibleMarkdownProps {
  text: string
  inline?: boolean
  className?: string
}

export function BibleMarkdown({ text, inline = false, className }: BibleMarkdownProps) {
  if (!text) return null
  if (inline) {
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={BIBLE_MARKDOWN_INLINE_COMPONENTS}>
        {text}
      </ReactMarkdown>
    )
  }
  return (
    <div className={cn(BibleMarkdownClass.Block, className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  )
}
