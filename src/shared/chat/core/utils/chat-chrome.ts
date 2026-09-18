import {
  CHAT_CHROME_COPY,
  CHAT_CHROME_MS_PER_SECOND,
  CHAT_CHROME_THOUGHT_MIN_SECONDS,
  CHAT_CHROME_TOOL_COUNT_ONE,
} from '../constants/chat-chrome'

export {
  CHAT_CHROME_COPY,
  CHAT_CHROME_MS_PER_SECOND,
  CHAT_CHROME_PARAGRAPH_BREAK,
  CHAT_CHROME_THOUGHT_MIN_SECONDS,
  CHAT_CHROME_TOOL_COUNT_ONE,
  ChatChromeClass,
} from '../constants/chat-chrome'

export function uniqueToolNames(names: readonly string[]): string[] {
  const seen = new Set<string>()
  const unique: string[] = []
  for (const name of names) {
    if (seen.has(name)) continue
    seen.add(name)
    unique.push(name)
  }
  return unique
}

export function formatThoughtDurationLabel(elapsedMs: number): string {
  const seconds = Math.max(
    CHAT_CHROME_THOUGHT_MIN_SECONDS,
    Math.round(elapsedMs / CHAT_CHROME_MS_PER_SECOND),
  )
  return `${CHAT_CHROME_COPY.Thought} ${seconds}${CHAT_CHROME_COPY.SecondsSuffix}`
}

export function formatToolsCalledLabel(count: number): string {
  if (count === CHAT_CHROME_TOOL_COUNT_ONE) return CHAT_CHROME_COPY.ToolCalledOne
  return `${count} ${CHAT_CHROME_COPY.ToolsCalledRest}`
}

export function formatToolDebugLabel(toolName: string): string {
  return `${CHAT_CHROME_COPY.ToolDebugPrefix}${toolName}`
}

export function toolCardBodyMessage(
  title: string,
  compactMessage: string | null,
): string | undefined {
  if (!compactMessage || compactMessage === title) return undefined
  return compactMessage
}
