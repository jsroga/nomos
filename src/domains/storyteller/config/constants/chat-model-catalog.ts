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
   * Offered in the user-facing picker: Kimi and Sol. GLM stays resolvable but
   * unlisted — it is the hardcoded cheap tier and the e2e chat pin, and
   * `resolveChatModelId` accepts non-selectable ids so saved preferences keep
   * resolving.
   */
  userSelectable: boolean
}

export const CHAT_MODELS: ChatModelOption[] = [
  {
    id: 'moonshotai:kimi-k3',
    label: 'Kimi K3',
    provider: 'Moonshot (via OpenRouter)',
    providerKey: 'openrouter',
    envVar: 'OPENROUTER_API_KEY',
    description: 'Long-form craft, voice, and story structure. The default.',
    userSelectable: true,
  },
  {
    id: 'openai:gpt-5.6-sol',
    label: 'GPT-5.6 Sol',
    provider: 'OpenAI (via OpenRouter)',
    providerKey: 'openrouter',
    envVar: 'OPENROUTER_API_KEY',
    description: 'Heavier reasoning on the same writing slots.',
    userSelectable: true,
  },
  {
    id: 'zai-coding-plan:glm-5.2',
    label: 'GLM 5.2',
    provider: 'Z.AI (via OpenRouter)',
    providerKey: 'openrouter',
    envVar: 'OPENROUTER_API_KEY',
    openRouterId: 'z-ai/glm-5.2',
    description: 'Cheap tier for short structured work; not offered in the picker.',
    userSelectable: false,
  },
]

/** Models offered in the user-facing picker (Kimi, Sol). */
export const USER_SELECTABLE_CHAT_MODELS: ChatModelOption[] = CHAT_MODELS.filter(
  option => option.userSelectable
)

export const DEFAULT_CHAT_MODEL = 'moonshotai:kimi-k3'

/** Hardcoded tier for short structured work — never the writer's choice. */
export const CHEAP_TIER_CHAT_MODEL = 'zai-coding-plan:glm-5.2'

const CHAT_MODEL_BY_ID = new Map(CHAT_MODELS.map(m => [m.id, m]))

export function getChatModelOption(id: string): ChatModelOption | undefined {
  return CHAT_MODEL_BY_ID.get(id)
}

export function isKnownChatModel(id: string): boolean {
  return CHAT_MODEL_BY_ID.has(id)
}
