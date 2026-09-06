import '@/shared/data/server-guard'
import { ProblemType, type Finding } from '@/domains/storyteller/core/types/finding'

export const DIALOGUE_PROBLEM_TYPES = [
  ProblemType.DialogueAdjacency,
  ProblemType.DialogueEmbodiment,
] as const

export type DialogueProblemType = (typeof DIALOGUE_PROBLEM_TYPES)[number]

export function isDialogueProblemType(value: ProblemType): value is DialogueProblemType {
  return DIALOGUE_PROBLEM_TYPES.some(type => type === value)
}

export function findingQuoteRequired(finding: Finding): string {
  return finding.location.quote
}
