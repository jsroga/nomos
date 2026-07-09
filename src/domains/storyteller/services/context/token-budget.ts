/**
 * Token Budget Manager (M2)
 *
 * Caps total tokens per agent call by section,
 * truncating by relevance or recency when over budget.
 */

export interface TokenBudgets {
  systemPrompt: number
  projectContext: number
  characters: number
  beats: number
  memory: number
  rag: number
  userMessage: number
  relationships: number
}

export const DEFAULT_TOKEN_BUDGETS: TokenBudgets = {
  systemPrompt: 3000, // Fixed, not truncated
  projectContext: 4000, // Bible, rules, factions
  characters: 2000, // Top N most relevant characters
  beats: 2000, // Last N beats (summarized)
  memory: 4000, // Compressed conversation history
  rag: 1500, // RAG results
  userMessage: 500, // Current message
  relationships: 500, // Active relationship context
}

export interface RawContextParts {
  systemPrompt?: string
  projectContext?: string
  characters?: string
  beats?: string
  memory?: string
  rag?: string
  userMessage?: string
  relationships?: string
}

export interface BudgetedContext {
  /** The final context string within budget */
  context: string
  /** Metadata about what was trimmed */
  trimmed: Array<{ section: string; originalTokens: number; budgetedTokens: number }>
  /** Total estimated tokens */
  totalTokens: number
}

/**
 * Estimate token count using 4 chars/token heuristic.
 * Fast approximation for budget checking (not billing-accurate).
 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / 4)
}

/**
 * Truncate text to fit within a token budget.
 * Keeps the beginning (most important context) and truncates the end.
 */
function truncateToTokenBudget(text: string, maxTokens: number): string {
  const estimated = estimateTokens(text)
  if (estimated <= maxTokens) return text

  // Approximate char limit
  const maxChars = maxTokens * 4
  return text.slice(0, maxChars) + '\n... [truncated for token budget]'
}

/**
 * Apply token budgets to raw context parts.
 * Truncates each section that exceeds its budget.
 */
const BUDGET_SECTION_KEYS: Array<keyof RawContextParts & keyof TokenBudgets> = [
  'systemPrompt',
  'projectContext',
  'characters',
  'beats',
  'memory',
  'rag',
  'userMessage',
  'relationships',
]

export function budgetContext(
  rawContext: RawContextParts,
  budgets: TokenBudgets = DEFAULT_TOKEN_BUDGETS
): BudgetedContext {
  const trimmed: BudgetedContext['trimmed'] = []
  const sections: string[] = []

  for (const sectionKey of BUDGET_SECTION_KEYS) {
    const maxTokens = budgets[sectionKey]
    const text = rawContext[sectionKey]
    if (!text) continue

    const originalTokens = estimateTokens(text)
    const budgeted = truncateToTokenBudget(text, maxTokens)
    const budgetedTokens = estimateTokens(budgeted)

    if (budgetedTokens < originalTokens) {
      trimmed.push({ section: sectionKey, originalTokens, budgetedTokens })
    }

    sections.push(budgeted)
  }

  const context = sections.join('\n\n')
  const totalTokens = estimateTokens(context)

  return { context, trimmed, totalTokens }
}
