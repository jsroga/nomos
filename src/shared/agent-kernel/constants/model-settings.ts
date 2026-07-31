/**
 * Admin-configurable model slots + the OpenRouter model options offered in the
 * admin panel. Each slot maps to a resolver (see `model-settings.ts` +
 * `resolveRoleModel`/`resolveGameDesignModel`/…). All ids are OpenRouter model
 * ids (provider/model form) routed through the single OPENROUTER_API_KEY.
 */

export const MODEL_SETTING_DEFAULT_ROLE = 'default'

export interface ModelSettingRoleDef {
  role: string
  label: string
  description: string
}

export const MODEL_SETTING_ROLES: ModelSettingRoleDef[] = [
  {
    role: MODEL_SETTING_DEFAULT_ROLE,
    label: 'Default (all agents)',
    description: 'Fallback for any slot left unset. Set this to make everything fast/cheap in one move.',
  },
  { role: 'chat', label: 'Storyteller · Chat', description: 'Writers-room chat adapter (tool routing + conversation).' },
  { role: 'author', label: 'Storyteller · Author', description: 'GRRM author — drafts and revises prose (token-heavy).' },
  { role: 'planner', label: 'Storyteller · Planner', description: 'Beat plans (structured JSON, high-leverage reasoning).' },
  { role: 'premise', label: 'Storyteller · Premise', description: 'Premise / roadmap architecture.' },
  { role: 'critic', label: 'Storyteller · Critics', description: 'Narrow diagnose-only critics.' },
  { role: 'muse', label: 'Storyteller · Muse', description: 'Wildcard idea generation.' },
  { role: 'game-design', label: 'Game Design', description: 'Game-design agent + tools.' },
  { role: 'loop-creator', label: 'Loop Creator', description: 'Loop-creator specialists + market analyst.' },
  { role: 'judging', label: 'Evals · Judge', description: 'LLM-as-judge scorers (npm run eval).' },
]

export const MODEL_SETTING_ROLE_IDS: readonly string[] = MODEL_SETTING_ROLES.map(r => r.role)

export interface OpenRouterModelOption {
  id: string
  label: string
}

/** Curated OpenRouter model ids for the admin dropdown (provider/model form). */
export const OPENROUTER_MODEL_OPTIONS: OpenRouterModelOption[] = [
  { id: 'openrouter/auto-beta', label: 'Auto — OpenRouter auto-beta router' },
  { id: 'openai/gpt-5.6-luna', label: 'GPT-5.6 Luna — fast thinking' },
  { id: 'openai/gpt-5.6-luna-pro', label: 'GPT-5.6 Luna Pro' },
  { id: 'openai/gpt-5.4', label: 'GPT-5.4' },
  { id: 'google/gemini-3.5-flash', label: 'Gemini 3.5 Flash — cheap/fast' },
  { id: 'anthropic/claude-opus-4.8', label: 'Claude Opus 4.8' },
  { id: 'anthropic/claude-sonnet-5', label: 'Claude Sonnet 5' },
  { id: 'anthropic/claude-haiku-4.5', label: 'Claude Haiku 4.5 — cheap' },
  { id: 'moonshotai/kimi-k2.7-code', label: 'Kimi K2.7 Code' },
  { id: 'z-ai/glm-5.2', label: 'GLM 5.2' },
  { id: 'deepseek/deepseek-v4-pro', label: 'DeepSeek V4 Pro' },
  { id: 'x-ai/grok-4.5', label: 'Grok 4.5' },
]

export const OPENROUTER_MODEL_OPTION_IDS: readonly string[] = OPENROUTER_MODEL_OPTIONS.map(o => o.id)

/**
 * `provider/model` (or gatewayed `openrouter/provider/model`), the only shape
 * `toOpenRouterModel` can route. The curated list above is a convenience, not a
 * whitelist — admins may paste any id OpenRouter serves, so the write path
 * validates shape rather than membership.
 */
const OPENROUTER_MODEL_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*(?:\/[a-zA-Z0-9._:-]+){1,2}$/

export const OPENROUTER_MODEL_ID_MAX_LENGTH = 120

export function isOpenRouterModelId(value: string): boolean {
  const trimmed = value.trim()
  return (
    trimmed.length > 0 &&
    trimmed.length <= OPENROUTER_MODEL_ID_MAX_LENGTH &&
    OPENROUTER_MODEL_ID_PATTERN.test(trimmed)
  )
}
