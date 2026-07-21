import { z } from 'zod'
import competitorDbBatch1Json from '../data/competitor-db-batch1.json'
import type { DetailedCompetitor } from './competitor-finder-types'

const detailedCompetitorSchema = z.object({
  name: z.string(),
  genre: z.string(),
  platform: z.array(z.string()),
  playerCount: z.string().optional(),
  similarityScore: z.number(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  marketPosition: z.string(),
  revenue: z.string().optional(),
  pricePoint: z.string(),
  monetization: z.array(z.string()),
  launchYear: z.number(),
  coreLoopDuration: z.string(),
  sessionLoopDuration: z.string(),
  metaLoopDescription: z.string(),
  successFactors: z.array(z.string()),
  innovationPoints: z.array(z.string()),
  targetEmotions: z.array(z.string()),
  marketShare: z.string().optional(),
  growthTrajectory: z.enum(['explosive', 'steady', 'declining', 'stable']),
  communitySize: z.string(),
  updateFrequency: z.string(),
  designLessons: z.array(z.string()),
  avoidMistakes: z.array(z.string()),
})

function parseCompetitorDbBatch1(data: unknown): DetailedCompetitor[] {
  return z.array(detailedCompetitorSchema).parse(data)
}

export const COMPETITOR_DB_BATCH1 = parseCompetitorDbBatch1(competitorDbBatch1Json)
