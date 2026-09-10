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

export interface OpenRouterModelOption {
  id: string
  label: string
}

/** The three models text generation runs on (provider/model form). */
export const OPENROUTER_MODEL_OPTIONS: OpenRouterModelOption[] = [
  { id: 'moonshotai/kimi-k3', label: 'Kimi K3 — prose and structure' },
  { id: 'openai/gpt-5.6-sol', label: 'GPT-5.6 Sol — heavier reasoning' },
  { id: 'z-ai/glm-5.2', label: 'GLM 5.2 — cheap tier' },
]

