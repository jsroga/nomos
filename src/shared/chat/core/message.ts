/**
 * In-memory crew-turn shape for Loop Creator (role + content, optional speaker).
 */
import { ChatMessageRole } from '@/shared/chat/core/constants/message'

export { ChatMessageRole }

export type ChatMessage = {
  role: ChatMessageRole
  content: string
  name?: string
}

export function userChatMessage(content: string): ChatMessage {
  return { role: ChatMessageRole.Human, content }
}

export function assistantChatMessage(content: string, name?: string): ChatMessage {
  return name === undefined
    ? { role: ChatMessageRole.Ai, content }
    : { role: ChatMessageRole.Ai, content, name }
}
