import 'server-only'

/**
 * Resolving the chat model reads `STORYTELLER_CHAT_MODEL`, so it cannot live in
 * the catalog: that module is imported by the Writers Room picker and ships to
 * the browser, where a server variable is `undefined`.
 *
 * Splitting it out makes that explicit rather than silently returning a
 * different model on the client than on the server. Every caller is an API
 * route already.
 */
import { env } from '@/shared/config/env'
import { clientEnv } from '@/shared/config/env.client'
import {
  DEFAULT_CHAT_MODEL,
  isKnownChatModel,
} from '@/domains/storyteller/config/constants/chat-model-catalog'

/**
 * The effective chat model id: an explicit override, else
 * `STORYTELLER_CHAT_MODEL`, else `NEXT_PUBLIC_DEFAULT_AGENT_MODEL`, else the
 * catalog default.
 */
export function resolveChatModelId(modelName?: string | null): string {
  const trimmed = typeof modelName === 'string' ? modelName.trim() : ''
  if (trimmed) return trimmed

  const fromChatEnv = env.STORYTELLER_CHAT_MODEL?.trim()
  if (fromChatEnv && isKnownChatModel(fromChatEnv)) return fromChatEnv

  const fromPublic = clientEnv.defaultAgentModel
  if (fromPublic && isKnownChatModel(fromPublic)) return fromPublic

  return DEFAULT_CHAT_MODEL
}
