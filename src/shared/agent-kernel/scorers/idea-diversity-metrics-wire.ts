/** Deterministic uniqueness / randomness metrics for idea sets (no LLM). */

export interface IdeaDiversityMetrics {
  uniqueness: number
  randomness: number
  overall: number
  exactDuplicateRate: number
  nearDuplicateRate: number
  uniqueIdeaCount: number
  reason: string
}

const NEAR_DUPLICATE_JACCARD = 0.75

function normalizeIdea(idea: string): string {
  return idea.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
}

function tokens(idea: string): Set<string> {
  const parts = normalizeIdea(idea).split(' ').filter(t => t.length > 1)
  return new Set(parts)
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1
  let intersection = 0
  for (const t of a) {
    if (b.has(t)) intersection += 1
  }
  const union = a.size + b.size - intersection
  return union === 0 ? 0 : intersection / union
}

function exactDuplicateRate(ideas: string[]): number {
  if (ideas.length === 0) return 0
  const seen = new Set<string>()
  let dupes = 0
  for (const idea of ideas) {
    const key = normalizeIdea(idea)
    if (seen.has(key)) dupes += 1
    else seen.add(key)
  }
  return dupes / ideas.length
}

function nearDuplicateRate(ideas: string[]): number {
  if (ideas.length < 2) return 0
  const tokenSets = ideas.map(tokens)
  let nearDupes = 0
  const marked = new Set<number>()
  for (let i = 0; i < tokenSets.length; i += 1) {
    if (marked.has(i)) continue
    for (let j = i + 1; j < tokenSets.length; j += 1) {
      if (marked.has(j)) continue
      if (jaccard(tokenSets[i], tokenSets[j]) >= NEAR_DUPLICATE_JACCARD) {
        marked.add(j)
        nearDupes += 1
      }
    }
  }
  return nearDupes / ideas.length
}

function lexicalDiversity(ideas: string[]): number {
  const allTokens: string[] = []
  for (const idea of ideas) {
    allTokens.push(...normalizeIdea(idea).split(' ').filter(Boolean))
  }
  if (allTokens.length === 0) return 0
  return new Set(allTokens).size / allTokens.length
}

function firstWordEntropy(ideas: string[]): number {
  if (ideas.length === 0) return 0
  const counts = new Map<string, number>()
  for (const idea of ideas) {
    const first = normalizeIdea(idea).split(' ')[0] ?? ''
    counts.set(first, (counts.get(first) ?? 0) + 1)
  }
  let entropy = 0
  for (const count of counts.values()) {
    const p = count / ideas.length
    entropy -= p * Math.log2(p)
  }
  const maxEntropy = Math.log2(ideas.length)
  return maxEntropy === 0 ? 0 : entropy / maxEntropy
}

function lengthSpread(ideas: string[]): number {
  if (ideas.length < 2) return 0
  const lengths = ideas.map(i => normalizeIdea(i).length)
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length
  if (mean === 0) return 0
  const variance =
    lengths.reduce((sum, len) => sum + (len - mean) ** 2, 0) / lengths.length
  const cv = Math.sqrt(variance) / mean
  return Math.max(0, Math.min(1, cv))
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

export function scoreIdeaDiversity(ideas: string[]): IdeaDiversityMetrics {
  const cleaned = ideas.map(i => i.trim()).filter(Boolean)
  if (cleaned.length === 0) {
    return {
      uniqueness: 0,
      randomness: 0,
      overall: 0,
      exactDuplicateRate: 0,
      nearDuplicateRate: 0,
      uniqueIdeaCount: 0,
      reason: 'Empty idea set',
    }
  }

  const exact = exactDuplicateRate(cleaned)
  const near = nearDuplicateRate(cleaned)
  const uniqueness = clamp01(1 - Math.max(exact, near))
  const lex = lexicalDiversity(cleaned)
  const randomness = clamp01(0.45 * lex + 0.35 * firstWordEntropy(cleaned) + 0.2 * lengthSpread(cleaned))
  const overall = clamp01((uniqueness + randomness) / 2)
  const uniqueIdeaCount = new Set(cleaned.map(normalizeIdea)).size

  return {
    uniqueness,
    randomness,
    overall,
    exactDuplicateRate: exact,
    nearDuplicateRate: near,
    uniqueIdeaCount,
    reason: [
      `${uniqueIdeaCount}/${cleaned.length} unique after normalize`,
      `exactDup=${(exact * 100).toFixed(0)}%`,
      `nearDup=${(near * 100).toFixed(0)}%`,
      `lexDiv=${(lex * 100).toFixed(0)}%`,
    ].join('; '),
  }
}
