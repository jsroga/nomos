'use client'

import {
  createContext,
  isValidElement,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { isPlainObject } from '@/shared/data/json-guards'
import { cn } from '@/shared/data/utils'
import {
  entityRefIdFromHref,
  rewriteEntityRefsToMarkdownLinks,
} from '@/domains/storyteller/core/entities/reference-parser'
import { EntityMarkdownHref } from '@/domains/storyteller/core/entities/constants/reference-parser'
import { ReferenceText } from '@/domains/storyteller/ui/ReferenceText'

enum ChatMarkdownClass {
  Block = '[&_p]:mb-3 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_table]:w-full [&_table]:text-sm [&_td]:px-1.5 [&_td]:py-1 [&_th]:px-1.5 [&_th]:py-1 [&_th]:text-left',
}

enum MarkdownUrlProtocol {
  Https = 'https:',
  Http = 'http:',
  Mailto = 'mailto:',
}

enum MarkdownElement {
  Paragraph = 'p',
  Anchor = 'a',
}

enum ReactElementProp {
  Children = 'children',
}

const ChatMarkdownProjectIdContext = createContext<string | undefined>(undefined)

function isReactNode(value: unknown): value is ReactNode {
  if (value === null || value === undefined || typeof value === 'boolean') return true
  if (typeof value === 'string' || typeof value === 'number') return true
  if (Array.isArray(value)) return value.every(isReactNode)
  return isValidElement(value)
}

function markdownChildrenToText(children: ReactNode): string {
  if (children === null || children === undefined || typeof children === 'boolean') {
    return ''
  }
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children)
  }
  if (Array.isArray(children)) {
    let out = ''
    for (const child of children) out += markdownChildrenToText(child)
    return out
  }
  if (isValidElement(children)) {
    const props = children.props
    if (isPlainObject(props)) {
      const nested = Reflect.get(props, ReactElementProp.Children)
      return isReactNode(nested) ? markdownChildrenToText(nested) : ''
    }
  }
  return ''
}

function ChatEntityMarkdownAnchor({
  href,
  children,
}: {
  href?: string
  children?: ReactNode
}) {
  const projectId = useContext(ChatMarkdownProjectIdContext)
  const refId = entityRefIdFromHref(href)
  if (refId) {
    const displayName = markdownChildrenToText(children) || refId
    return <ReferenceText text={`[${displayName}][${refId}]`} projectId={projectId} inline />
  }
  if (!href) return <span>{children}</span>
  return <a href={href}>{children}</a>
}

function MarkdownInlineParagraph({ children }: { children?: ReactNode }) {
  return <>{children}</>
}

const CHAT_MARKDOWN_COMPONENTS: Components = {
  [MarkdownElement.Anchor]: ChatEntityMarkdownAnchor,
}

const CHAT_MARKDOWN_INLINE_COMPONENTS: Components = {
  [MarkdownElement.Anchor]: ChatEntityMarkdownAnchor,
  [MarkdownElement.Paragraph]: MarkdownInlineParagraph,
}

function allowMarkdownUrl(url: string): string {
  if (url.startsWith(EntityMarkdownHref.Prefix)) return url
  if (
    url.startsWith(MarkdownUrlProtocol.Https) ||
    url.startsWith(MarkdownUrlProtocol.Http) ||
    url.startsWith(MarkdownUrlProtocol.Mailto)
  ) {
    return url
  }
  return ''
}

interface ChatEntityMarkdownProps {
  text: string
  projectId?: string
  inline?: boolean
  className?: string
}

export function ChatEntityMarkdown({
  text,
  projectId,
  inline = false,
  className,
}: ChatEntityMarkdownProps) {
  const rewritten = useMemo(() => rewriteEntityRefsToMarkdownLinks(text), [text])
  if (!rewritten) return null
  const markdown = (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      urlTransform={allowMarkdownUrl}
      components={inline ? CHAT_MARKDOWN_INLINE_COMPONENTS : CHAT_MARKDOWN_COMPONENTS}
    >
      {rewritten}
    </ReactMarkdown>
  )
  return (
    <ChatMarkdownProjectIdContext.Provider value={projectId}>
      {inline ? markdown : <div className={cn(ChatMarkdownClass.Block, className)}>{markdown}</div>}
    </ChatMarkdownProjectIdContext.Provider>
  )
}
