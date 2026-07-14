export enum ContextBudgetSection {
  SystemPrompt = 'systemPrompt',
  ProjectContext = 'projectContext',
  Characters = 'characters',
  Beats = 'beats',
  Memory = 'memory',
  Rag = 'rag',
  UserMessage = 'userMessage',
  Relationships = 'relationships',
}

export const CONTEXT_BUDGET_SECTION_KEYS: ContextBudgetSection[] = [
  ContextBudgetSection.SystemPrompt,
  ContextBudgetSection.ProjectContext,
  ContextBudgetSection.Characters,
  ContextBudgetSection.Beats,
  ContextBudgetSection.Memory,
  ContextBudgetSection.Rag,
  ContextBudgetSection.UserMessage,
  ContextBudgetSection.Relationships,
]

export const TOKEN_BUDGET_TRUNCATION_SUFFIX = '\n... [truncated for token budget]'

export const TOKEN_BUDGET_SECTION_JOIN = '\n\n'
