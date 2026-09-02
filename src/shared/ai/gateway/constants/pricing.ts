/**
 * USD per million tokens, by model.
 *
 * Committed rather than fetched, and versioned by `effectiveFrom`: prices
 * change, and a historical record has to keep the price that applied when the
 * call ran or last month's spend silently moves.
 *
 * An unknown model **throws** rather than recording zero. A silent zero is
 * worse than no instrumentation, because it reads as "this was free".
 */
export interface ModelPrice {
  readonly inputPerMillion: number
  readonly outputPerMillion: number
  readonly effectiveFrom: string
}

const EFFECTIVE_FROM = '2026-08-28'

/**
 * Keys are OpenRouter model ids, which is how this codebase names models.
 * Add a row before using a model; the gateway refuses to price what it does
 * not know.
 */
export const PROVIDER_PRICING: Readonly<Record<string, ModelPrice>> = {
  'openai/gpt-4o': { inputPerMillion: 2.5, outputPerMillion: 10, effectiveFrom: EFFECTIVE_FROM },
  'openai/gpt-4o-mini': {
    inputPerMillion: 0.15,
    outputPerMillion: 0.6,
    effectiveFrom: EFFECTIVE_FROM,
  },
  'openai/gpt-4.1': { inputPerMillion: 2, outputPerMillion: 8, effectiveFrom: EFFECTIVE_FROM },
  'openai/gpt-4.1-mini': {
    inputPerMillion: 0.4,
    outputPerMillion: 1.6,
    effectiveFrom: EFFECTIVE_FROM,
  },
  'anthropic/claude-sonnet-4': {
    inputPerMillion: 3,
    outputPerMillion: 15,
    effectiveFrom: EFFECTIVE_FROM,
  },
  'anthropic/claude-haiku-4.5': {
    inputPerMillion: 1,
    outputPerMillion: 5,
    effectiveFrom: EFFECTIVE_FROM,
  },
  'google/gemini-2.5-flash': {
    inputPerMillion: 0.3,
    outputPerMillion: 2.5,
    effectiveFrom: EFFECTIVE_FROM,
  },
  'google/gemini-2.5-pro': {
    inputPerMillion: 1.25,
    outputPerMillion: 10,
    effectiveFrom: EFFECTIVE_FROM,
  },
  'voyage-3': { inputPerMillion: 0.06, outputPerMillion: 0, effectiveFrom: EFFECTIVE_FROM },
  'voyage-3-lite': { inputPerMillion: 0.02, outputPerMillion: 0, effectiveFrom: EFFECTIVE_FROM },
  'rerank-2': { inputPerMillion: 0.05, outputPerMillion: 0, effectiveFrom: EFFECTIVE_FROM },
}
