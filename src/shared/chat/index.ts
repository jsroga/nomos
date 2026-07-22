/**
 * Chat public module API.
 *
 * The legacy bespoke chat (streaming UI + `useChatStream`) has been removed —
 * chat now runs on assistant-ui (`./assistant`). What remains here is the pure,
 * still-shared surface: message/agent types, the `@`-mention model, chat
 * renderers, and the frame protocol, consumed by the assistant-ui adapters and
 * the domain mention providers.
 */

export type {
  Message,
  ActionStatus,
  AgentAction,
  AgentConfigMap,
  AgentQuestion,
  ActionMessageLocation,
} from './core/types'
export { ApprovalActionStatus } from './core/types'
export { getGameEntityProvider } from './core/mentions/game-entity-provider'
export type { MentionProvider, MentionItem, ProjectContext } from './core/mentions/types'
export { ChatRenderersProvider, useChatRenderers } from './core/renderers'
export type { ChatRenderers } from './core/renderers'
export { ChatFrameType } from './core/protocol'
