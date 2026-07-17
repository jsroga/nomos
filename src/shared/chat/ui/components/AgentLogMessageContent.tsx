'use client'

import React, { useState } from 'react'
import { Check, ChevronDown, ChevronRight, Copy } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useChatRenderers, type ChatRenderers } from '../../core/renderers'
import {
  AGENT_LOG_COPY_FAILED,
  DELEGATION_ELLIPSIS_SUFFIX,
  DELEGATION_HANDOFF_PREFIX,
  MARKDOWN_CODE_BLOCK_LANGUAGE_PREFIX,
} from '../constants/agent-log'
import { getAgentDisplayName } from '../utils/agent-log-message-helpers'

export const MessageHoverActions: React.FC<{ content: string }> = ({ content }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error(AGENT_LOG_COPY_FAILED, err)
    }
  }

  return (
    <div className="absolute top-1 right-1 flex items-center gap-0.5 p-0.5 rounded bg-card/90 border border-border/50 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-150">
      <button
        onClick={handleCopy}
        title={copied ? 'Copied!' : 'Copy'}
        className="p-1 rounded hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground"
      >
        {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  )
}

const CollapsibleJSON: React.FC<{ data: Record<string, unknown>; defaultExpanded?: boolean }> = ({
  data,
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="border border-border/20 rounded bg-muted/5 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
      >
        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <span className="uppercase tracking-wider font-medium">Technical Data</span>
        <span className="ml-auto text-[9px] opacity-50">
          {isExpanded ? 'Click to collapse' : 'Click to expand'}
        </span>
      </button>
      {isExpanded && (
        <div className="border-t border-border/20 bg-background/50">
          <pre className="px-3 py-2 text-[10px] overflow-x-auto max-h-[500px] overflow-y-auto whitespace-pre-wrap font-mono text-muted-foreground/70 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

const TextWithReferences: React.FC<{ children: React.ReactNode; projectId?: string }> = ({
  children,
  projectId,
}) => {
  const renderers = useChatRenderers()

  const text = React.Children.toArray(children)
    .map(child => (typeof child === 'string' ? child : ''))
    .join('')

  if (!text || !renderers.hasRichMarkup(text)) {
    return <>{children}</>
  }

  return <>{renderers.renderRichText(text, { projectId, inline: true })}</>
}

function wrapWithReferences(
  children: React.ReactNode,
  contentHasRefs: boolean,
  projectId: string | undefined
): React.ReactNode {
  if (!contentHasRefs) return children
  return <TextWithReferences projectId={projectId}>{children}</TextWithReferences>
}

function renderDelegationHandoff(content: string): React.ReactNode {
  const toolName = content
    .replace(DELEGATION_HANDOFF_PREFIX, '')
    .trim()
    .replace(DELEGATION_ELLIPSIS_SUFFIX, '')
  const friendlyName = getAgentDisplayName(toolName)

  return (
    <div className="flex items-center gap-2 text-muted-foreground italic">
      <span className="text-primary">→</span>
      <span>
        Handing off to <span className="font-semibold text-primary">{friendlyName}</span>
        {DELEGATION_ELLIPSIS_SUFFIX}
      </span>
    </div>
  )
}

function createMarkdownComponents(
  contentHasRefs: boolean,
  projectId: string | undefined,
  renderers: ChatRenderers
) {
  const wrap = (children: React.ReactNode) =>
    wrapWithReferences(children, contentHasRefs, projectId)

  return {
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h1 className="font-bold text-xl text-foreground mt-4 mb-2">{wrap(children)}</h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className="font-bold text-lg text-foreground mt-3 mb-1.5">{wrap(children)}</h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="font-semibold text-base text-foreground mt-2 mb-1">{wrap(children)}</h3>
    ),
    h4: ({ children }: { children?: React.ReactNode }) => (
      <h4 className="font-medium text-sm text-foreground/90 mt-1.5">{wrap(children)}</h4>
    ),
    p: ({ children }: { children?: React.ReactNode }) => (
      <p className="mb-2 last:mb-0">{wrap(children)}</p>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="space-y-1 pl-1 mb-2">{children}</ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="space-y-1 pl-1 mb-2">{children}</ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => (
      <li className="flex gap-2">
        <span className="text-primary shrink-0">•</span>
        <span className="flex-1">{wrap(children)}</span>
      </li>
    ),
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-bold">{wrap(children)}</strong>
    ),
    em: ({ children }: { children?: React.ReactNode }) => (
      <em className="italic text-muted-foreground">{wrap(children)}</em>
    ),
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
      if (href?.startsWith('#entity/')) {
        const refId = href.replace('#entity/', '')
        const displayName =
          typeof children === 'string'
            ? children
            : React.Children.toArray(children)
                .map(c => (typeof c === 'string' ? c : ''))
                .join('')
        return (
          <>{renderers.renderRichText(`[${displayName}][${refId}]`, { projectId, inline: true })}</>
        )
      }
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {children}
        </a>
      )
    },
    code: ({
      children,
      className,
    }: {
      children?: React.ReactNode
      className?: string
      inline?: boolean
    }) => {
      const isBlock = className?.includes(MARKDOWN_CODE_BLOCK_LANGUAGE_PREFIX)
      return isBlock ? (
        <pre className="bg-muted/50 rounded p-2 overflow-x-auto my-2">
          <code className="text-sm font-mono">{children}</code>
        </pre>
      ) : (
        <code className="bg-muted/50 px-1 py-0.5 rounded text-sm font-mono">{children}</code>
      )
    },
    pre: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className="border-l-2 border-primary/50 pl-3 italic text-muted-foreground my-2">
        {wrap(children)}
      </blockquote>
    ),
    hr: () => <hr className="border-border my-3" />,
  }
}

function parseMessageContent(
  content: string,
  projectId: string | undefined,
  renderers: ChatRenderers
): React.ReactNode {
  if (content.includes(DELEGATION_HANDOFF_PREFIX)) {
    return renderDelegationHandoff(content)
  }

  const contentHasRefs = renderers.hasRichMarkup(content)
  const processedContent = contentHasRefs
    ? content.replace(/\[([^\]]+)\]\[([^\]\s]+)\]/g, '[$1](#entity/$2)')
    : content

  return (
    <ReactMarkdown components={createMarkdownComponents(contentHasRefs, projectId, renderers)}>
      {processedContent}
    </ReactMarkdown>
  )
}

function parseJsonMessageContent(
  content: string,
  isActivityPanelOpen: boolean,
  hasActions: boolean,
  projectId: string | undefined,
  renderers: ChatRenderers
): React.ReactNode | undefined {
  let parsedData: Record<string, unknown> | null = null
  try {
    parsedData = JSON.parse(content)
  } catch {
    const messageMatch = content.match(/"message"\s*:\s*"([^"]*)"?/)
    if (messageMatch) {
      return parseMessageContent(messageMatch[1], projectId, renderers)
    }
    if (!isActivityPanelOpen) {
      return null
    }
    return undefined
  }

  if (!parsedData) return undefined

  if (parsedData.message && typeof parsedData.message === 'string') {
    const displayContent = parsedData.message
    if (isActivityPanelOpen && hasActions) {
      return (
        <>
          <div className="mb-3">{parseMessageContent(displayContent, projectId, renderers)}</div>
          <CollapsibleJSON data={parsedData} defaultExpanded={true} />
        </>
      )
    }
    return parseMessageContent(displayContent, projectId, renderers)
  }

  if (!isActivityPanelOpen) return null
  return <CollapsibleJSON data={parsedData} defaultExpanded={false} />
}

export const MessageContent: React.FC<{
  content: string
  isActivityPanelOpen?: boolean
  hasActions?: boolean
  projectId?: string
}> = ({ content, isActivityPanelOpen = false, hasActions = false, projectId }) => {
  const renderers = useChatRenderers()

  if (content.trim().startsWith('{')) {
    const jsonResult = parseJsonMessageContent(
      content,
      isActivityPanelOpen,
      hasActions,
      projectId,
      renderers
    )
    if (jsonResult !== undefined) return jsonResult
  }

  return parseMessageContent(content, projectId, renderers)
}
