/**
 * Token Budget Manager (M2)
 *
 * Caps total tokens per agent call by section,
 * truncating by relevance or recency when over budget.
 */

import {
  CONTEXT_BUDGET_SECTION_KEYS,
  ContextBudgetSection,
  TOKEN_BUDGET_SECTION_JOIN,
  TOKEN_BUDGET_TRUNCATION_SUFFIX,
} from '@/domains/storyteller/services/constants/token-budget'

export interface TokenBudgets {
  [ContextBudgetSection.SystemPrompt]: number
  [ContextBudgetSection.ProjectContext]: number
  [ContextBudgetSection.Characters]: number
  [ContextBudgetSection.Beats]: number
  [ContextBudgetSection.Memory]: number
  [ContextBudgetSection.Rag]: number
  [ContextBudgetSection.UserMessage]: number
  [ContextBudgetSection.Relationships]: number
}

export const DEFAULT_TOKEN_BUDGETS: TokenBudgets = {
  [ContextBudgetSection.SystemPrompt]: 3000, // Fixed, not truncated
  [ContextBudgetSection.ProjectContext]: 4000, // Bible, rules, factions
  [ContextBudgetSection.Characters]: 2000, // Top N most relevant characters
  [ContextBudgetSection.Beats]: 2000, // Last N beats (summarized)
  [ContextBudgetSection.Memory]: 4000, // Compressed conversation history
  [ContextBudgetSection.Rag]: 1500, // RAG results
  [ContextBudgetSection.UserMessage]: 500, // Current message
  [ContextBudgetSection.Relationships]: 500, // Active relationship context
}

export interface RawContextParts {
  [ContextBudgetSection.SystemPrompt]?: string
  [ContextBudgetSection.ProjectContext]?: string
  [ContextBudgetSection.Characters]?: string
  [ContextBudgetSection.Beats]?: string
  [ContextBudgetSection.Memory]?: string
  [ContextBudgetSection.Rag]?: string
  [ContextBudgetSection.UserMessage]?: string
  [ContextBudgetSection.Relationships]?: string
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
  return text.slice(0, maxChars) + TOKEN_BUDGET_TRUNCATION_SUFFIX
}

/**
 * Apply token budgets to raw context parts.
 * Truncates each section that exceeds its budget.
 */
const BUDGET_SECTION_KEYS = CONTEXT_BUDGET_SECTION_KEYS

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

  const context = sections.join(TOKEN_BUDGET_SECTION_JOIN)
  const totalTokens = estimateTokens(context)

  return { context, trimmed, totalTokens }
}
