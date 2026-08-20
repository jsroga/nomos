/**
 * Pull tool `args` / `input` objects from an assistant-ui message content array.
 */

import { recordFromJson, readString } from '@/shared/data/json-guards'

const EMPTY_TOOL_ARGS: Record<string, unknown>[] = []
const EMPTY_TOOL_NAMES: string[] = []

enum AssistantToolPartPrefix {
  Tool = 'tool-',
}

enum GenericToolPartSuffix {
  Call = 'call',
  Result = 'result',
  Invocation = 'invocation',
}

function isGenericToolPartSuffix(value: string): boolean {
  return (
    value === GenericToolPartSuffix.Call ||
    value === GenericToolPartSuffix.Result ||
    value === GenericToolPartSuffix.Invocation
  )
}

export function toolNameFromAssistantPart(part: unknown): string | null {
  const record = recordFromJson(part)
  const named = readString(record.toolName) ?? readString(record.name)
  if (named) return named
  const type = readString(record.type)
  if (!type?.startsWith(AssistantToolPartPrefix.Tool)) return null
  const rest = type.slice(AssistantToolPartPrefix.Tool.length)
  if (!rest || isGenericToolPartSuffix(rest)) return null
  return rest
}

export function toolNamesFromAssistantContent(content: readonly unknown[]): string[] {
  const names: string[] = []
  for (const part of content) {
    const name = toolNameFromAssistantPart(part)
    if (name) names.push(name)
  }
  return names
}

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

export function createToolNamesSnapshotSelector(): (
  content: readonly unknown[],
) => string[] {
  let lastContent: readonly unknown[] | undefined
  let lastSerialized = ''
  let lastNames: string[] = EMPTY_TOOL_NAMES
  return content => {
    if (content === lastContent) return lastNames
    const next = toolNamesFromAssistantContent(content)
    const serialized = JSON.stringify(next)
    lastContent = content
    if (serialized === lastSerialized) return lastNames
    lastSerialized = serialized
    lastNames = next.length === 0 ? EMPTY_TOOL_NAMES : next
    return lastNames
  }
}
