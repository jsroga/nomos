import type { Message } from '@/shared/chat'
import {
  ChatMessageRole,
  OpenAiChatRole,
  StorytellerMessageRole,
} from '@/domains/storyteller/state/constants/storyteller-chat'

/** Map a chat message to the OpenAI-style role/content/name shape sent to the model. */
export function serializeChatMessage(m: Message) {
  return {
    role:
      m.type === ChatMessageRole.Human || m.sender === StorytellerMessageRole.User
        ? OpenAiChatRole.User
        : OpenAiChatRole.Assistant,
    content: m.content,
    name: m.sender,
  }
}

export type SerializedChatMessage = ReturnType<typeof serializeChatMessage>
