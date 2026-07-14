/**
 * LLM provider vocabulary shared by the settings UI and the provider health
 * endpoints (`/api/settings/providers`, `/api/settings/providers/test`).
 * Keys mirror the providers map returned by the GET route.
 */

export type TestableLlmProviderKey = 'openai' | 'anthropic' | 'google' | 'zhipu' | 'moonshot'

export interface TestableLlmProvider {
  key: TestableLlmProviderKey
  label: string
}

/** LLM providers with a live-testable chat model (PLAN-V2 1.4). */
export const TESTABLE_LLM_PROVIDERS: readonly TestableLlmProvider[] = [
  { key: 'openai', label: 'OpenAI' },
  { key: 'anthropic', label: 'Anthropic' },
  { key: 'google', label: 'Google / Gemini' },
  { key: 'zhipu', label: 'Z.AI (GLM)' },
  { key: 'moonshot', label: 'Moonshot (Kimi)' },
]
