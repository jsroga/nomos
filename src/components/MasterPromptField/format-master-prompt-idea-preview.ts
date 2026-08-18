import {
  MASTER_PROMPT_IDEA_PREVIEW_MAX,
  MASTER_PROMPT_IDEA_PREVIEW_SUFFIX,
} from './constants/master-prompt-field'

export function formatMasterPromptIdeaPreview(idea: string): string {
  if (idea.length <= MASTER_PROMPT_IDEA_PREVIEW_MAX) return idea
  return `${idea.slice(0, MASTER_PROMPT_IDEA_PREVIEW_MAX).trimEnd()}${MASTER_PROMPT_IDEA_PREVIEW_SUFFIX}`
}
