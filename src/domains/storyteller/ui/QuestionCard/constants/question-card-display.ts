import { QuestionUrgency } from '@/domains/storyteller/core/types/enums'

export const QUESTION_URGENCY_BORDER_CLASS: Record<QuestionUrgency, string> = {
  [QuestionUrgency.BLOCKING]: 'border-red-500/50 bg-red-500/5',
  [QuestionUrgency.IMPORTANT]: 'border-yellow-500/50 bg-yellow-500/5',
  [QuestionUrgency.OPTIONAL]: 'border-blue-500/50 bg-blue-500/5',
}

export const QUESTION_URGENCY_BADGE: Record<
  QuestionUrgency,
  { text: string; color: string }
> = {
  [QuestionUrgency.BLOCKING]: { text: 'Requires Answer', color: 'bg-red-500/20 text-red-400' },
  [QuestionUrgency.IMPORTANT]: { text: 'Important', color: 'bg-yellow-500/20 text-yellow-400' },
  [QuestionUrgency.OPTIONAL]: { text: 'Optional', color: 'bg-blue-500/20 text-blue-400' },
}
