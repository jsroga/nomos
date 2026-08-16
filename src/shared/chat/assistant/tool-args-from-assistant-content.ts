/**
 * Pull tool `args` / `input` objects from an assistant-ui message content array.
 */

import { recordFromJson } from '@/shared/data/json-guards'

const EMPTY_TOOL_ARGS: Record<string, unknown>[] = []

export function toolArgsFromAssistantContent(
  content: readonly unknown[],
): Record<string, unknown>[] {
  const collected: Record<string, unknown>[] = []
  for (const part of content) {
    const record = recordFromJson(part)
    const args = recordFromJson(record.args ?? record.input ?? record.arguments)
    if (Object.keys(args).length > 0) collected.push(args)
  }
  return collected
}

/**
 * Per-hook getSnapshot cache. Returning a new array from useMessage every
 * render trips React's "getSnapshot should be cached" loop.
 */
export function createToolArgsSnapshotSelector(): (
  content: readonly unknown[],
) => Record<string, unknown>[] {
  let lastContent: readonly unknown[] | undefined
  let lastSerialized = ''
  let lastArgs: Record<string, unknown>[] = EMPTY_TOOL_ARGS
  return content => {
    if (content === lastContent) return lastArgs
    const next = toolArgsFromAssistantContent(content)
    const serialized = JSON.stringify(next)
    lastContent = content
    if (serialized === lastSerialized) return lastArgs
    lastSerialized = serialized
    lastArgs = next.length === 0 ? EMPTY_TOOL_ARGS : next
    return lastArgs
  }
}
