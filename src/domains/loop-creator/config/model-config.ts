/**
 * Loop-creator model resolution — single source of truth for the default model
 * used by the LangGraph specialist agents (supervisor, balance-analyst,
 * concept-evaluator, loop-planner, progression-architect, mechanics-designer).
 *
 * Order: explicit `override` (per-request `state.modelConfig.model`) →
 * `LOOP_CREATOR_MODEL` env → default. Returns a bare LangChain model name
 * (`gpt-4o`), NOT the Mastra `provider/model` form — these agents still run on
 * `@langchain/openai` `ChatOpenAI`. First convention step toward the eventual
 * Mastra port; centralizes the model string that was hardcoded in each agent.
 */

import '@/shared/data/server-guard'

const LOOP_CREATOR_MODEL_ENV = 'LOOP_CREATOR_MODEL'
const LOOP_CREATOR_DEFAULT_MODEL = 'gpt-4o'
const OPENAI_PROVIDER_PREFIX = 'openai/'
const PROVIDER_SEPARATOR = '/'

/** Resolve the loop-creator default model: `override` → env → `gpt-4o`. */
export function resolveLoopCreatorModel(override?: string): string {
  return override || process.env[LOOP_CREATOR_MODEL_ENV] || LOOP_CREATOR_DEFAULT_MODEL
}

/**
 * Same resolution, normalized to the Mastra `provider/model` form for the
 * flagged Mastra agents (`LOOP_CREATOR_MASTRA=1`). A bare name is assumed to be
 * an OpenAI model; an id that already carries a `provider/` prefix is passed
 * through.
 */
export function resolveLoopCreatorMastraModel(override?: string): string {
  const base = resolveLoopCreatorModel(override)
  return base.includes(PROVIDER_SEPARATOR) ? base : `${OPENAI_PROVIDER_PREFIX}${base}`
}
