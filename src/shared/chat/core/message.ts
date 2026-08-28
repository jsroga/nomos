/**
 * The message shape the loop-creator and game-design graphs pass around.
 *
 * These were `@langchain/core/messages` classes, used purely as data — a role,
 * some content and an optional name. Twelve of the sixteen LangChain imports
 * in the codebase were for this and nothing else, so the dependency was
 * carrying a struct.
 *
 * Kept as a class rather than an interface because the call sites construct
 * with `new` and branch on the role; a factory would have meant touching every
 * one of them for no gain.
 */
import { ChatMessageRole } from '@/shared/chat/core/constants/message'

export { ChatMessageRole }

interface ChatMessageInit {
  content: string
  name?: string
}

export class ChatMessage {
  readonly role: ChatMessageRole
  readonly content: string
  readonly name?: string

  constructor(role: ChatMessageRole, init: string | ChatMessageInit) {
    const resolved = typeof init === 'string' ? { content: init } : init
    this.role = role
    this.content = resolved.content
    this.name = resolved.name
  }

  /** Named for the LangChain method it replaces, so call sites did not churn. */
  _getType(): ChatMessageRole {
    return this.role
  }
}

export class HumanMessage extends ChatMessage {
  constructor(init: string | ChatMessageInit) {
    super(ChatMessageRole.Human, init)
  }
}

export class AIMessage extends ChatMessage {
  constructor(init: string | ChatMessageInit) {
    super(ChatMessageRole.Ai, init)
  }
}

export class SystemMessage extends ChatMessage {
  constructor(init: string | ChatMessageInit) {
    super(ChatMessageRole.System, init)
  }
}

/** The LangChain name for the base type; kept so imports read the same. */
export type BaseMessage = ChatMessage
