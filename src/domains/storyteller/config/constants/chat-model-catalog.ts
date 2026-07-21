/**
 * Chat model catalog — the single source of truth for models selectable in the
 * Storyteller Writers Room chat header.
 *
 * Internal id convention is `provider:model` (e.g. `zai-coding-plan:glm-5.2`).
 * `ModelConfig.resolveStorytellerModel` routes these through the OpenRouter
 * gateway (`openrouter/…`) on the single OPENROUTER_API_KEY — using an entry's
 * `openRouterId` when the OpenRouter id differs (GLM → `z-ai/glm-5.2`).
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
  /**
   * OpenRouter model id when it differs from the internal `provider:model` id
   * (e.g. internal `zai-coding-plan:glm-5.2` → OpenRouter `z-ai/glm-5.2`).
   * `resolveStorytellerModel` routes it as `openrouter/<openRouterId>`.
   */
  openRouterId?: string
  /** When set, resolveStorytellerModel returns a `{ url, id, apiKey }` object (legacy escape hatch). */
  endpointUrl?: string
  /** Optional one-line description for the picker. */
  description?: string
  /**
   * Offered in the user-facing picker (PLAN-V2 1.4 lockdown): only the
   * author-model choices (Kimi, GLM) are user-selectable — the rest of the
   * catalog is internal routing ("secret sauce"). `resolveChatModelId` still
   * accepts non-selectable ids so legacy saved preferences keep resolving.
   */
  userSelectable: boolean
}

export const CHAT_MODELS: ChatModelOption[] = [
  {
    id: 'openai:gpt-4o-mini',
    label: 'GPT-4o mini',
    provider: 'OpenAI',
    providerKey: 'openai',
    envVar: 'OPENAI_API_KEY',
    description: 'Fast and cheap — internal glue/autocomplete tier.',
    userSelectable: false,
  },
  {
    id: 'anthropic:claude-sonnet-5',
    label: 'Claude Sonnet 5',
    provider: 'Anthropic',
    providerKey: 'anthropic',
    envVar: 'ANTHROPIC_API_KEY',
    description: 'Strong narrative voice and consistency — internal chat slot.',
    userSelectable: false,
  },
  {
    id: 'google:gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    provider: 'Google',
    providerKey: 'google',
    envVar: 'GOOGLE_API_KEY',
    description: 'Fast Google model with a large context window.',
    userSelectable: false,
  },
  {
    id: 'zai-coding-plan:glm-5.2',
    label: 'GLM 5.2',
    provider: 'Z.AI (via OpenRouter)',
    providerKey: 'openrouter',
    envVar: 'OPENROUTER_API_KEY',
    openRouterId: 'z-ai/glm-5.2',
    description: 'Zhipu GLM 5.2 via OpenRouter — author choice, single key.',
    userSelectable: true,
  },
  {
    id: 'moonshotai:kimi-k2.7-code',
    label: 'Kimi 2.7',
    provider: 'Moonshot (via OpenRouter)',
    providerKey: 'openrouter',
    envVar: 'OPENROUTER_API_KEY',
    description: 'Moonshot Kimi K2.7 Code via OpenRouter — default author, single key.',
    userSelectable: true,
  },
]

/** Models offered in the user-facing picker (Kimi + GLM only — 1.4 lockdown). */
export const USER_SELECTABLE_CHAT_MODELS: ChatModelOption[] = CHAT_MODELS.filter(
  option => option.userSelectable
)

export const DEFAULT_CHAT_MODEL = 'moonshotai:kimi-k2.7-code'

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
