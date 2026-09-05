'use client'

import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Anchor,
  Check,
  Copy,
  Droplets,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  ScrollText,
  Brain,
  Sparkles,
  // ThumbsUp,
  User,
  Users,
  Waves,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type {
  ReasoningMessagePartComponent,
  TextMessagePartComponent,
} from '@assistant-ui/react'
import {
  ActionBarPrimitive,
  MessagePrimitive,
  useMessage,
  useMessageRuntime,
} from '@assistant-ui/react'
import { Button } from '@/components/Button'
import { useChatRenderers } from '../core/renderers'
import { describeThinkingProgress } from '../core/thinking-progress'
import { AssistantToolFallback } from './AssistantToolFallback'
import { useAssistantAddToWorld } from './AssistantAddToWorldContext'
import { createToolArgsSnapshotSelector, createToolNamesSnapshotSelector } from './tool-args-from-assistant-content'
import {
  createAssistantPlainTextSelector,
  createShowThinkingSelector,
} from './assistant-message-selectors'
import {
  ASSISTANT_THREAD_COPY,
  CHAT_ENTITY_KIND_STYLE,
  ChatEntityKind,
  ChatMessageRole,
  ChatMessageStatus,
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
  const { hasRichMarkup, renderRichText } = useChatRenderers()
  const parsed = useMemo(() => parseAssistantEntities(text), [text])

  if (hasRichMarkup(text)) {
    return <>{renderRichText(text, { inline: false })}</>
  }

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

/**
 * Streamed model thinking. assistant-ui's default Reasoning component renders
 * `null`, so without this the reasoning frames arrive and vanish — which is the
 * whole reason a turn could look frozen for a minute.
 */
const AssistantReasoning: ReasoningMessagePartComponent = ({ text, status }) => {
  const [open, setOpen] = useState(false)
  const streaming = status?.type === ChatMessageStatus.Running
  const body = text.trim()
  if (!body) return null

  return (
    <div className={streaming ? 'aui-reasoning aui-reasoning--live' : 'aui-reasoning'}>
      <button
        type="button"
        className="aui-reasoning-toggle"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
      >
        <Brain size={12} aria-hidden />
        {streaming ? ASSISTANT_THREAD_COPY.ReasoningLive : ASSISTANT_THREAD_COPY.ReasoningDone}
      </button>
      {/* While streaming, show the tail so there is visible motion without
          flooding the thread; expanded shows the whole trace. */}
      <p className={open ? 'aui-reasoning-text' : 'aui-reasoning-text aui-reasoning-text--peek'}>
        {open ? body : body.slice(-REASONING_PEEK_CHARS)}
      </p>
    </div>
  )
}

const REASONING_PEEK_CHARS = 240

const ASSISTANT_PART_COMPONENTS = {
  Text: AssistantMarkdownText,
  Reasoning: AssistantReasoning,
  tools: { Fallback: AssistantToolFallback },
}

const USER_PART_COMPONENTS = {
  Text: UserPlainText,
}

function AddToWorldButton() {
  const messageRuntime = useMessageRuntime()
  const { onAddToWorld, sectionLabelsFromToolArgs, isAddToWorldSettled, canAddToWorld } =
    useAssistantAddToWorld()
  const plainTextSelector = useMemo(() => {
    const select = createAssistantPlainTextSelector()
    return (m: { content: ReadonlyArray<{ type: string; text?: string }> }) => select(m.content)
  }, [])
  const fallbackText = useMessage(plainTextSelector)
  const roleSelector = useMemo(
    () => (m: { role: string }) => m.role,
    [],
  )
  const role = useMessage(roleSelector)
  const toolArgsSelector = useMemo(() => {
    const select = createToolArgsSnapshotSelector()
    return (m: { content: readonly unknown[] }) => select(m.content)
  }, [])
  const toolNamesSelector = useMemo(() => {
    const select = createToolNamesSnapshotSelector()
    return (m: { content: readonly unknown[] }) => select(m.content)
  }, [])
  const toolArgs = useMessage(toolArgsSelector)
  const toolNames = useMessage(toolNamesSelector)
  const sectionLabels = useMemo(
    () => sectionLabelsFromToolArgs?.(toolArgs) ?? [],
    [sectionLabelsFromToolArgs, toolArgs],
  )
  const [added, setAdded] = useState(false)
  const [busy, setBusy] = useState(false)
  const settled = isAddToWorldSettled?.(toolArgs) ?? false
  const visible =
    role === ChatMessageRole.Assistant &&
    (canAddToWorld
      ? canAddToWorld({ role, toolNames, toolArgs })
      : Boolean(onAddToWorld))

  if (!visible) return null

  if (added || settled) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="ml-0.5 h-6 gap-1 text-xs border-primary/50 text-primary"
        disabled
      >
        <Check size={12} aria-hidden />
        {ASSISTANT_THREAD_COPY.AddedToWorld}
      </Button>
    )
  }

  return (
    <span className="ml-0.5 inline-flex items-center gap-1.5">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-6 gap-1 text-xs border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground"
        disabled={!onAddToWorld || busy}
        onClick={() => {
          if (!onAddToWorld) return
          const text =
            messageRuntime.unstable_getCopyText().trim() || fallbackText
          if (!text && toolArgs.length === 0) return
          setBusy(true)
          const result = onAddToWorld({ text, toolArgs })
          void (async () => {
            try {
              const ok = await Promise.resolve(result)
              if (ok) setAdded(true)
              setBusy(false)
            } catch {
            }
          })()
        }}
      >
        <Plus size={12} aria-hidden />
        {ASSISTANT_THREAD_COPY.AddToWorld}
      </Button>
      {sectionLabels.length > 0 ? (
        <span className="max-w-[280px] text-[10px] leading-tight text-muted-foreground">
          {sectionLabels.join(ASSISTANT_THREAD_COPY.SectionLabelJoin)}
        </span>
      ) : null}
    </span>
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

const THINKING_TICK_MS = 1000

/**
 * Reasoning is not streamed, so a turn can sit with zero renderable frames for
 * a minute. Elapsed time is the only honest progress signal the client has.
 */
function ThinkingIndicator() {
  const [startedAt] = useState(() => Date.now())
  const [elapsedMs, setElapsedMs] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setElapsedMs(Date.now() - startedAt), THINKING_TICK_MS)
    return () => clearInterval(timer)
  }, [startedAt])

  const progress = describeThinkingProgress(elapsedMs)

  return (
    <div className="aui-thinking" data-testid="assistant-running-status" aria-live="polite">
      <span className="aui-thinking-dots" aria-hidden>
        <span className="aui-thinking-dot" />
        <span className="aui-thinking-dot" />
        <span className="aui-thinking-dot" />
      </span>
      <span className="aui-thinking-label">
        {progress.label}
        {progress.showSeconds ? ` · ${progress.seconds}s` : ''}
      </span>
    </div>
  )
}

export function AssistantMessage() {
  const isLastSelector = useMemo(() => (m: { isLast: boolean }) => m.isLast, [])
  const isLast = useMessage(isLastSelector)
  const showThinkingSelector = useMemo(() => {
    const select = createShowThinkingSelector()
    return (m: {
      status?: { type?: string } | null
      content: ReadonlyArray<{ type: string; text?: string }>
    }) => select({ status: m.status, content: m.content })
  }, [])
  const showThinking = useMessage(showThinkingSelector)

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
          <ThinkingIndicator />
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
