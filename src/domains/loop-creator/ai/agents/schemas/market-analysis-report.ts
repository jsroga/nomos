import { z } from 'zod'

enum MarketViabilityVerdict {
  Strong = 'strong',
  Moderate = 'moderate',
  Niche = 'niche',
  Unclear = 'unclear',
}

enum TrendDirection {
  Rising = 'rising',
  Stable = 'stable',
  Declining = 'declining',
}

export const MarketAnalysisReportSchema = z.object({
  overallScore: z.number(),
  recommendations: z.array(z.string()),
  risks: z.array(z.string()),
  opportunities: z.array(z.string()),
  generatedAt: z.string().optional(),
  sourcesUsed: z.array(z.string()).optional(),
  confidence: z.number().optional(),
  viabilityVerdict: z
    .enum([
      MarketViabilityVerdict.Strong,
      MarketViabilityVerdict.Moderate,
      MarketViabilityVerdict.Niche,
      MarketViabilityVerdict.Unclear,
    ])
    .optional(),
  viabilityReason: z.string().optional(),
  referenceScores: z.object({
    discoElysium: z.number(),
    vampireSurvivors: z.number(),
    counterStrike: z.number(),
  }),
  marketSize: z.object({
    tam: z.string(),
    sam: z.string(),
    relevantSegment: z.string(),
    growthRate: z.string(),
    confidence: z.number().optional(),
    sources: z.array(z.string()).optional(),
  }),
  competitors: z.array(
    z.object({
      name: z.string(),
      genre: z.string(),
      similarityScore: z.number(),
      strengths: z.array(z.string()),
      weaknesses: z.array(z.string()),
      platform: z.array(z.string()).optional(),
      playerCount: z.string().optional(),
      marketPosition: z.string().optional(),
    })
  ),
  audienceFit: z.object({
    targetDemographic: z.string(),
    fitScore: z.number(),
    strengths: z.array(z.string()),
    concerns: z.array(z.string()),
    recommendations: z.array(z.string()).optional(),
  }),
  trends: z
    .array(
      z.object({
        trend: z.string(),
        direction: z.enum([TrendDirection.Rising, TrendDirection.Stable, TrendDirection.Declining]),
        relevance: z.number(),
        description: z.string().optional(),
        timeframe: z.string().optional(),
      })
    )
    .optional(),
  patterns: z
    .array(
      z.object({
        patternName: z.string(),
        matchScore: z.number(),
        description: z.string().optional(),
        examples: z.array(z.string()).optional(),
        applicability: z.string().optional(),
      })
    )
    .optional(),
})
