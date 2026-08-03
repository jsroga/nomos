'use client'

import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Anchor,
  Copy,
  Droplets,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  ScrollText,
  Sparkles,
  // ThumbsUp,
  User,
  Users,
  Waves,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TextMessagePartComponent } from '@assistant-ui/react'
import {
  ActionBarPrimitive,
  MessagePrimitive,
  useComposerRuntime,
  useMessage,
  useMessageRuntime,
} from '@assistant-ui/react'
import { Button } from '@/components/Button'
import { AssistantToolFallback } from './AssistantToolFallback'
import {
  ASSISTANT_THREAD_COPY,
  CHAT_ENTITY_KIND_STYLE,
  ChatEntityKind,
  ChatMessageStatus,
  ChatPartType,
  parseAssistantEntities,
  type ParsedChatEntity,
} from '../core/constants/assistant-thread-ui'

const ENTITY_ICONS: Record<ChatEntityKind, LucideIcon> = {
  [ChatEntityKind.Character]: User,
  [ChatEntityKind.Location]: MapPin,
  [ChatEntityKind.Faction]: Users,
  [ChatEntityKind.Item]: Package,
  [ChatEntityKind.Quest]: ScrollText,
}

const FACTION_ICON_CYCLE: LucideIcon[] = [Droplets, Anchor, Waves]

function EntityCard({ entity, index }: { entity: ParsedChatEntity; index: number }) {
  const style = CHAT_ENTITY_KIND_STYLE[entity.kind]
  const Icon =
    entity.kind === ChatEntityKind.Faction
      ? (FACTION_ICON_CYCLE[index % FACTION_ICON_CYCLE.length] ?? Users)
      : ENTITY_ICONS[entity.kind]

  return (
    <div className="aui-entity-card">
      <span
        className="aui-entity-icon"
        style={{
          background: style.fill,
          border: `1px solid ${style.border}`,
          color: style.foreground,
        }}
      >
        <Icon size={11} aria-hidden />
      </span>
      <div className="aui-entity-copy">
        <span className="aui-entity-name">{entity.name}</span>
        <span className="aui-entity-desc">{entity.description}</span>
      </div>
    </div>
  )
}

function MarkdownBlock({ text }: { text: string }) {
  if (!text.trim()) return null
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
}

const AssistantMarkdownText: TextMessagePartComponent = ({ text }) => {
  const parsed = useMemo(() => parseAssistantEntities(text), [text])

  if (parsed.entities.length === 0) {
    return <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
  }

  return (
    <>
      <MarkdownBlock text={parsed.before} />
      <div className="aui-entity-stack">
        {parsed.entities.map((entity, index) => (
          <EntityCard key={`${entity.name}-${index}`} entity={entity} index={index} />
        ))}
      </div>
      <MarkdownBlock text={parsed.after} />
    </>
  )
}

const UserPlainText: TextMessagePartComponent = ({ text }) => (
  <p>{text}</p>
)

const ASSISTANT_PART_COMPONENTS = {
  Text: AssistantMarkdownText,
  tools: { Fallback: AssistantToolFallback },
}

const USER_PART_COMPONENTS = {
  Text: UserPlainText,
}

function AddToWorldButton() {
  const messageRuntime = useMessageRuntime()
  const composer = useComposerRuntime()

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="ml-0.5 h-6 gap-1 text-xs border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground"
      onClick={() => {
        const text = messageRuntime.unstable_getCopyText().trim()
        if (!text) return
        const parsed = parseAssistantEntities(text)
        const payload =
          parsed.entities.length > 0
            ? parsed.entities.map(e => `- ${e.name}: ${e.description}`).join('\n')
            : text
        composer.setText(`${ASSISTANT_THREAD_COPY.AddToWorldPromptPrefix}${payload}`)
        composer.send()
      }}
    >
      <Plus size={12} aria-hidden />
      {ASSISTANT_THREAD_COPY.AddToWorld}
    </Button>
  )
}

export function UserMessage() {
  return (
    <MessagePrimitive.Root className="aui-user-row">
      <div className="aui-user-bubble">
        <MessagePrimitive.Parts components={USER_PART_COMPONENTS} />
      </div>
    </MessagePrimitive.Root>
  )
}

const REASONING_PART_TYPE = 'reasoning'

function hasRenderableAssistantContent(
  content: ReadonlyArray<{ type: string; text?: string }>,
): boolean {
  return content.some(part => {
    if (part.type === REASONING_PART_TYPE) return false
    if (part.type === ChatPartType.Text) {
      return typeof part.text === 'string' && part.text.trim().length > 0
    }
    return true
  })
}

export function AssistantMessage() {
  const isLast = useMessage(m => m.isLast)
  const showThinking = useMessage(m => {
    if (m.status?.type !== ChatMessageStatus.Running) return false
    return !hasRenderableAssistantContent(m.content)
  })

  return (
    <MessagePrimitive.Root
      className={
        showThinking ? 'aui-assistant-row aui-assistant-row--thinking group' : 'aui-assistant-row group'
      }
    >
      <span className="aui-avatar" aria-hidden>
        <Sparkles size={13} />
      </span>
      <div className="aui-assistant-body">
        {showThinking ? (
          <div
            className="aui-thinking"
            data-testid="assistant-running-status"
            aria-live="polite"
          >
            <span className="aui-thinking-dots" aria-hidden>
              <span className="aui-thinking-dot" />
              <span className="aui-thinking-dot" />
              <span className="aui-thinking-dot" />
            </span>
            <span className="aui-thinking-label">{ASSISTANT_THREAD_COPY.Thinking}</span>
          </div>
        ) : (
          <MessagePrimitive.Parts components={ASSISTANT_PART_COMPONENTS} />
        )}
        <ActionBarPrimitive.Root
          hideWhenRunning
          autohide="never"
          className={isLast ? 'aui-actions aui-actions-always' : 'aui-actions'}
        >
          <ActionBarPrimitive.Copy asChild>
            <button type="button" className="aui-icon-btn" aria-label="Copy">
              <Copy size={13} />
            </button>
          </ActionBarPrimitive.Copy>
          <ActionBarPrimitive.Reload asChild>
            <button type="button" className="aui-icon-btn" aria-label="Regenerate">
              <RefreshCw size={13} />
            </button>
          </ActionBarPrimitive.Reload>
          {/* <ActionBarPrimitive.FeedbackPositive asChild>
            <button type="button" className="aui-icon-btn" aria-label="Like">
              <ThumbsUp size={13} />
            </button>
          </ActionBarPrimitive.FeedbackPositive> */}
          <AddToWorldButton />
        </ActionBarPrimitive.Root>
      </div>
    </MessagePrimitive.Root>
  )
}
