'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  createThreadIsEmptySelector,
  createThreadIsRunningSelector,
  createThreadLastAssistantTextSelector,
} from './assistant-thread-selectors'
import {
  ArrowUp,
  // AtSign,
  Braces,
  ChevronDown,
  // Paperclip,
  Square,
} from 'lucide-react'
import {
  ComposerPrimitive,
  ThreadPrimitive,
  useComposer,
  // useComposerRuntime,
  useThread,
} from '@assistant-ui/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/DropdownMenu'
import type { AssistantMentionBundle } from './useAssistantMentions'
import { useAssistantChatDetails } from './AssistantChatDetailsContext'
import {
  ASSISTANT_THREAD_COPY,
  ASSISTANT_THREAD_WIRE,
  deriveFollowUpChips,
  shortModelLabel,
  type AssistantChatModelOption,
} from '../core/constants/assistant-thread-ui'

// const MENTION_TRIGGER_CHAR = ASSISTANT_THREAD_WIRE.MentionAt
const TEXTAREA_MAX_PX = 180

type AssistantThreadComposerProps = {
  mentions?: AssistantMentionBundle
  chatModelId?: string
  chatModelOptions?: readonly AssistantChatModelOption[]
  onChatModelChange?: (modelId: string) => void
}

function autoGrow(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = ASSISTANT_THREAD_WIRE.CssHeightAuto
  el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_PX)}px`
}

function FollowUpChips() {
  const lastAssistantTextSelector = useMemo(() => createThreadLastAssistantTextSelector(), [])
  const isEmptySelector = useMemo(() => createThreadIsEmptySelector(), [])
  const isRunningSelector = useMemo(() => createThreadIsRunningSelector(), [])
  const lastAssistantText = useThread(lastAssistantTextSelector)
  const isEmpty = useThread(isEmptySelector)
  const isRunning = useThread(isRunningSelector)
  const chips = useMemo(
    () => (lastAssistantText ? deriveFollowUpChips(lastAssistantText) : []),
    [lastAssistantText],
  )

  if (isEmpty || isRunning || chips.length === 0) return null

  return (
    <div className="aui-chips">
      {chips.map(prompt => (
        <ThreadPrimitive.Suggestion
          key={prompt}
          prompt={prompt}
          autoSend
          className="aui-chip"
        >
          {prompt}
        </ThreadPrimitive.Suggestion>
      ))}
    </div>
  )
}

function ComposerInput() {
  const ref = useRef<HTMLTextAreaElement | null>(null)
  const text = useComposer(c => c.text)

  useEffect(() => {
    autoGrow(ref.current)
  }, [text])

  return (
    <ComposerPrimitive.Input
      ref={ref}
      rows={1}
      placeholder={ASSISTANT_THREAD_COPY.InputPlaceholder}
      className="aui-composer-input"
      onInput={e => autoGrow(e.currentTarget)}
    />
  )
}

/*
function MentionButton({ enabled }: { enabled: boolean }) {
  const composer = useComposerRuntime()
  const onClick = useCallback(() => {
    if (!enabled) return
    const current = composer.getState().text
    const next =
      current.endsWith(ASSISTANT_THREAD_WIRE.MentionAt) ||
      current.endsWith(ASSISTANT_THREAD_WIRE.MentionAtSpace)
        ? current
        : `${current}${ASSISTANT_THREAD_WIRE.MentionAt}`
    composer.setText(next)
  }, [composer, enabled])

  return (
    <button
      type="button"
      className="aui-composer-tool"
      aria-label="Mention"
      disabled={!enabled}
      onClick={onClick}
    >
      <AtSign size={15} aria-hidden />
    </button>
  )
}

function AttachButton() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const composer = useComposerRuntime()

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) void composer.addAttachment(file)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        className="aui-composer-tool"
        aria-label="Attach"
        onClick={() => inputRef.current?.click()}
      >
        <Paperclip size={15} aria-hidden />
      </button>
    </>
  )
}
*/

function DetailsToggle() {
  const { showDetails, toggleDetails } = useAssistantChatDetails()
  return (
    <button
      type="button"
      className={
        showDetails ? 'aui-composer-tool aui-composer-tool--active' : 'aui-composer-tool'
      }
      aria-label={
        showDetails
          ? ASSISTANT_THREAD_COPY.HideDetailsAria
          : ASSISTANT_THREAD_COPY.ShowDetailsAria
      }
      aria-pressed={showDetails}
      title={ASSISTANT_THREAD_COPY.ShowDetails}
      onClick={toggleDetails}
    >
      <Braces size={15} aria-hidden />
    </button>
  )
}

function ModelPicker({
  modelId,
  options,
  onChange,
}: {
  modelId: string
  options: readonly AssistantChatModelOption[]
  onChange: (modelId: string) => void
}) {
  const selected = options.find(option => option.id === modelId)
  const label = selected?.label ?? shortModelLabel(modelId)

  const handleChange = useCallback(
    (next: string) => {
      onChange(next)
    },
    [onChange],
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="aui-model-btn" aria-label="Model">
          <span className="aui-model-dot" aria-hidden />
          {label}
          <ChevronDown size={11} aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[10rem] border-white/10 bg-neutral-950 text-white">
        <DropdownMenuRadioGroup value={modelId} onValueChange={handleChange}>
          {options.map(option => (
            <DropdownMenuRadioItem
              key={option.id}
              value={option.id}
              className="text-sm text-white/90 focus:bg-white/10 focus:text-white"
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AssistantThreadComposer({
  mentions,
  chatModelId,
  chatModelOptions,
  onChatModelChange,
}: AssistantThreadComposerProps) {
  const fallbackLabel = shortModelLabel(process.env.NEXT_PUBLIC_DEFAULT_AGENT_MODEL)
  const hasPicker =
    Boolean(chatModelId) &&
    Boolean(onChatModelChange) &&
    (chatModelOptions?.length ?? 0) > 0

  return (
    <div className="aui-composer-wrap">
      <div className="aui-composer-col">
        <FollowUpChips />

        <ComposerPrimitive.Unstable_TriggerPopoverRoot>
          <ComposerPrimitive.Root className="aui-composer-surface">
            <ComposerInput />

            <div className="aui-composer-controls">
              <div className="aui-composer-left">
                {/* <AttachButton /> */}
                {/* <MentionButton enabled={Boolean(mentions)} /> */}
                <DetailsToggle />
                {hasPicker && chatModelId && onChatModelChange && chatModelOptions ? (
                  <ModelPicker
                    modelId={chatModelId}
                    options={chatModelOptions}
                    onChange={onChatModelChange}
                  />
                ) : (
                  <button type="button" className="aui-model-btn" aria-label="Model" disabled>
                    <span className="aui-model-dot" aria-hidden />
                    {fallbackLabel}
                    <ChevronDown size={11} aria-hidden />
                  </button>
                )}
              </div>

              <ThreadPrimitive.If running={false}>
                <ComposerPrimitive.Send className="aui-send" aria-label="Send">
                  <ArrowUp size={16} aria-hidden />
                </ComposerPrimitive.Send>
              </ThreadPrimitive.If>
              <ThreadPrimitive.If running>
                <ComposerPrimitive.Cancel className="aui-send" aria-label="Stop">
                  <Square size={14} aria-hidden fill="currentColor" />
                </ComposerPrimitive.Cancel>
              </ThreadPrimitive.If>
            </div>
          </ComposerPrimitive.Root>

          {mentions ? (
            <ComposerPrimitive.Unstable_TriggerPopover
              char={ASSISTANT_THREAD_WIRE.MentionAt}
              adapter={mentions.adapter}
              className="z-30 max-h-64 w-72 overflow-y-auto rounded-md border border-white/10 bg-neutral-950 p-1 shadow-lg"
            >
              <ComposerPrimitive.Unstable_TriggerPopover.Directive
                formatter={mentions.directive.formatter}
              />
              <ComposerPrimitive.Unstable_TriggerPopoverItems>
                {items =>
                  items.map((item, index) => (
                    <ComposerPrimitive.Unstable_TriggerPopoverItem
                      key={item.id}
                      item={item}
                      index={index}
                      className="flex w-full flex-col items-start rounded px-2 py-1 text-left text-sm text-white/90 hover:bg-white/10"
                    >
                      <span>{item.label}</span>
                      {item.description ? (
                        <span className="text-xs text-white/40">{item.description}</span>
                      ) : null}
                    </ComposerPrimitive.Unstable_TriggerPopoverItem>
                  ))
                }
              </ComposerPrimitive.Unstable_TriggerPopoverItems>
            </ComposerPrimitive.Unstable_TriggerPopover>
          ) : null}
        </ComposerPrimitive.Unstable_TriggerPopoverRoot>

        <span className="aui-kbd-hint">{ASSISTANT_THREAD_COPY.KeyboardHint}</span>
      </div>
    </div>
  )
}
