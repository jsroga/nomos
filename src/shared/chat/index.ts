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
export { resumeChatWorkflow } from './core/io/chat-ui.api'
export { WorkspaceChatOverlay } from './ui/WorkspaceChatOverlay/WorkspaceChatOverlay'
export { WorkspaceChatToggle } from './ui/WorkspaceChatOverlay/WorkspaceChatToggle'
export { useWorkspaceChatUiStore } from './state/workspace-chat-ui-store'
export { DEFAULT_RESUME_URL } from './core/constants/chat-stream'
export {
  CHAT_STUCK_TIMEOUT_MS,
  CHAT_ROUTE_MAX_DURATION_SECONDS,
  CHAT_AUTHOR_GENERATE_TIMEOUT_MS,
} from './core/constants/chat-timeouts'
