import { tokenize } from './beat-text'

const STOP = new Set([
  'about',
  'after',
  'because',
  'before',
  'could',
  'from',
  'have',
  'their',
  'there',
  'these',
  'those',
  'would',
  'which',
  'while',
])

const MIN_CONCRETE_LENGTH = 5

export function scoreConcreteNounDensity(text: string): number {
  const tokens = tokenize(text)
  if (tokens.length === 0) return 0
  let concrete = 0
  for (const token of tokens) {
    if (token.length >= MIN_CONCRETE_LENGTH && !STOP.has(token)) concrete += 1
  }
  return concrete / tokens.length
}

export function isBrevityCheat(slopHitsPerThousand: number, concreteDensity: number): boolean {
  return slopHitsPerThousand < 1 && concreteDensity < 0.08
}
