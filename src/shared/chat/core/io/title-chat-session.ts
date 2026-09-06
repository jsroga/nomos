import '@/shared/data/server-guard'
import type { ProjectScope } from '@/shared/auth/project-scope'
import { complete } from '@/shared/ai/gateway'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import { TEXT_GEN_FAST_MODEL } from '@/shared/agent-kernel/models'
import { isPlainObject, readString } from '@/shared/data/json-guards'
import { ChatMessageRole, ChatPartType } from '@/shared/chat/core/constants/assistant-thread-ui'
import {
  ChatSessionCopy,
  ChatSessionTitleCopy,
  ChatSessionTitleLimit,
} from '@/shared/chat/core/constants/chat-session'
import {
  applyGeneratedChatSessionTitle,
  findOwnedChatSession,
} from '@/shared/chat/core/io/chat-session-store'

export type TitleChatSessionInput = {
  sessionId: string
  userId: string
  scope: ProjectScope
  messages: unknown
}

const TITLE_QUOTE_PATTERN = /["“”']/g

export function firstUserTextFromUiMessages(messages: unknown): string {
  if (!Array.isArray(messages)) return ''
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (!isPlainObject(message)) continue
    if (message.role !== ChatMessageRole.User) continue
    const parts = message.parts
    if (!Array.isArray(parts)) continue
    const chunks: string[] = []
    for (const part of parts) {
      if (!isPlainObject(part) || part.type !== ChatPartType.Text) continue
      const text = readString(part[ChatPartType.Text])
      if (text?.trim()) chunks.push(text)
    }
    if (chunks.length > 0) return chunks.join('\n')
  }
  return ''
}

export function sanitizeGeneratedChatTitle(raw: string): string {
  const cleaned = raw.replace(TITLE_QUOTE_PATTERN, ' ').replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  const words = cleaned.split(' ').slice(0, ChatSessionTitleLimit.MaxWords)
  return words.join(' ').slice(0, ChatSessionTitleLimit.MaxChars)
}

export async function titleChatSession(input: TitleChatSessionInput): Promise<void> {
  const owned = await findOwnedChatSession({ id: input.sessionId, userId: input.userId })
  if (!owned) return
  if (owned.titleLocked) return
  if (owned.title !== ChatSessionCopy.PlaceholderTitle) return
  const prompt = firstUserTextFromUiMessages(input.messages).slice(0, ChatSessionTitleLimit.MaxChars)
  if (!prompt) return
  try {
    const { text } = await complete({
      scope: input.scope,
      feature: LlmFeature.ChatSessionTitle,
      model: TEXT_GEN_FAST_MODEL,
      system: ChatSessionTitleCopy.System,
      prompt,
    })
    const title = sanitizeGeneratedChatTitle(text)
    if (!title) return
    await applyGeneratedChatSessionTitle({
      id: input.sessionId,
      userId: input.userId,
      title,
    })
  } catch {
    // Failures leave ChatSessionCopy.PlaceholderTitle.
  }
}

export function scheduleChatSessionTitle(input: TitleChatSessionInput): void {
  void titleChatSession(input)
}
