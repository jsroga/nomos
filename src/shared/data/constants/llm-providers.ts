/**
 * LLM provider vocabulary shared by the settings UI and the provider health
 * endpoints (`/api/settings/providers`, `/api/settings/providers/test`).
 * Keys mirror the providers map returned by the GET route.
 */

export type TestableLlmProviderKey = 'openrouter'

export interface TestableLlmProvider {
  key: TestableLlmProviderKey
  label: string
}

/** Chat LLMs route through OpenRouter (`OPENROUTER_API_KEY`). */
export const TESTABLE_LLM_PROVIDERS: readonly TestableLlmProvider[] = [
  { key: 'openrouter', label: 'OpenRouter' },
]
