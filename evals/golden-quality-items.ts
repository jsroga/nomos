import { examplesMatchingScorers } from './select-eval-examples'
import type { StorytellerGoldenExample } from './datasets/storyteller-golden'

export enum GoldenQualityScorerId {
  Hallucination = 'hallucination',
  Magic = 'magic',
}

export const GOLDEN_QUALITY_SCORER_IDS = [
  GoldenQualityScorerId.Hallucination,
  GoldenQualityScorerId.Magic,
] as const

export enum GoldenQualityItemMeta {
  ExampleId = 'exampleId',
  Category = 'category',
  Description = 'description',
  ReferenceOutput = 'referenceOutput',
}

export enum GoldenQualityError {
  MissingReferenceOutput = 'golden quality item missing referenceOutput metadata',
}

export function selectGoldenQualityExamples(
  examples: readonly StorytellerGoldenExample[],
): StorytellerGoldenExample[] {
  return examplesMatchingScorers(examples, GOLDEN_QUALITY_SCORER_IDS)
}

export function goldenQualityTaskOutput(metadata: Record<string, unknown> | undefined): string {
  const output = metadata?.[GoldenQualityItemMeta.ReferenceOutput]
  if (typeof output !== 'string' || output.length === 0) {
    throw new Error(GoldenQualityError.MissingReferenceOutput)
  }
  return output
}
