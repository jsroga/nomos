/**
 * Chat model catalog — the single source of truth for models selectable in the
 * Storyteller Writers Room chat header.
 *
 * Internal id convention is `provider:model` (e.g. `zai-coding-plan:glm-5.2`).
 * `ModelConfig.resolveStorytellerModel` converts these to Mastra's
 * `provider/model` string form, or to an explicit `{ url, id, apiKey }` object
 * for providers that need a custom endpoint (e.g. Z.AI Coding Plan).
 *
 * `providerKey` must match a key returned by `/api/settings/providers` so the
 * picker can grey out models whose API key is not configured.
 */

export interface ChatModelOption {
  /** Internal id, `provider:model` form. */
  id: string
  /** Human-friendly label shown in the picker. */
  label: string
  /** Provider display name. */
  provider: string
  /** Matches a key from `/api/settings/providers` (e.g. `zhipu`, `moonshot`). */
  providerKey: string
  /** Env var that must be set for this model to be usable. */
  envVar: string
  /** When set, resolveStorytellerModel returns a `{ url, id, apiKey }` object. */
  endpointUrl?: string
  /** Optional one-line description for the picker. */
  description?: string
}

export const CHAT_MODELS: ChatModelOption[] = [
  {
    id: 'openai:gpt-4o-mini',
    label: 'GPT-4o mini',
    provider: 'OpenAI',
    providerKey: 'openai',
    envVar: 'OPENAI_API_KEY',
    description: 'Fast and cheap — default chat model.',
  },
  {
    id: 'anthropic:claude-sonnet-5',
    label: 'Claude Sonnet 5',
    provider: 'Anthropic',
    providerKey: 'anthropic',
    envVar: 'ANTHROPIC_API_KEY',
    description: 'Strong narrative voice and consistency.',
  },
  {
    id: 'google:gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    provider: 'Google',
    providerKey: 'google',
    envVar: 'GOOGLE_API_KEY',
    description: 'Fast Google model with a large context window.',
  },
  {
    id: 'zai-coding-plan:glm-5.2',
    label: 'GLM 5.2',
    provider: 'Z.AI (Coding Plan)',
    providerKey: 'zhipu',
    envVar: 'ZHIPU_API_KEY',
    endpointUrl: 'https://api.z.ai/api/coding/paas/v4',
    description: 'Zhipu GLM 5.2 via the Coding Plan endpoint.',
  },
  {
    id: 'moonshotai:kimi-k2.7-code',
    label: 'Kimi 2.7',
    provider: 'Moonshot',
    providerKey: 'moonshot',
    envVar: 'MOONSHOT_API_KEY',
    description: 'Moonshot Kimi K2.7 Code — strong coding & agent loops.',
  },
]

export const DEFAULT_CHAT_MODEL = 'openai:gpt-4o-mini'

const CHAT_MODEL_BY_ID = new Map(CHAT_MODELS.map(m => [m.id, m]))

export function getChatModelOption(id: string): ChatModelOption | undefined {
  return CHAT_MODEL_BY_ID.get(id)
}

export function isKnownChatModel(id: string): boolean {
  return CHAT_MODEL_BY_ID.has(id)
}

/**
 * Resolve the effective chat model id from an optional client override.
 * Falls back to `NEXT_PUBLIC_DEFAULT_AGENT_MODEL` when it is a known catalog
 * entry, otherwise `DEFAULT_CHAT_MODEL`.
 */
export function resolveChatModelId(modelName?: string | null): string {
  const trimmed = typeof modelName === 'string' ? modelName.trim() : ''
  if (trimmed) return trimmed
  const fromEnv = process.env.NEXT_PUBLIC_DEFAULT_AGENT_MODEL
  if (fromEnv && isKnownChatModel(fromEnv)) return fromEnv
  return DEFAULT_CHAT_MODEL
}
