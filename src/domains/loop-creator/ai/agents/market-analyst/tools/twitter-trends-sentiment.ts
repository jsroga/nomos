const SENTIMENT_KEYWORDS = {
  positive: [
    'amazing',
    'love',
    'best',
    'great',
    'incredible',
    'masterpiece',
    'addictive',
    'fun',
    'recommend',
    'goty',
    'perfect',
    'brilliant',
    '10/10',
    'must play',
    'banger',
    'fire',
    'goated',
    'peak',
    'W',
    'gem',
    'underrated',
  ],
  negative: [
    'trash',
    'hate',
    'worst',
    'boring',
    'dead',
    'scam',
    'broken',
    'unplayable',
    'refund',
    'disappointed',
    'overhyped',
    'mid',
    'L',
    'overrated',
    'garbage',
    'rip',
    'dying',
    'flop',
    'abandoned',
    'buggy',
  ],
}

export function analyzeSentiment(text: string): {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed'
  score: number
} {
  const lower = text.toLowerCase()
  let positiveCount = 0
  let negativeCount = 0

  for (const keyword of SENTIMENT_KEYWORDS.positive) {
    if (lower.includes(keyword)) positiveCount++
  }
  for (const keyword of SENTIMENT_KEYWORDS.negative) {
    if (lower.includes(keyword)) negativeCount++
  }

  const total = positiveCount + negativeCount
  if (total === 0) return { sentiment: 'neutral', score: 0 }

  const score = (positiveCount - negativeCount) / total

  if (score > 0.3) return { sentiment: 'positive', score }
  if (score < -0.3) return { sentiment: 'negative', score }
  if (positiveCount > 0 && negativeCount > 0) return { sentiment: 'mixed', score }
  return { sentiment: 'neutral', score }
}
