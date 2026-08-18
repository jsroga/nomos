import { MasterPromptFieldCopy } from './constants/master-prompt-field'

export function formatMasterPromptCharCount(length: number): string {
  return `${length} ${MasterPromptFieldCopy.Chars}`
}
