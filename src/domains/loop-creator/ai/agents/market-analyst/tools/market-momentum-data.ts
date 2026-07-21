import { z } from 'zod'
import genreMomentumJson from '../data/genre-momentum.json'
import risingCompetitorsJson from '../data/rising-competitors.json'
import socialBuzzJson from '../data/social-buzz.json'
import type { GenreMomentum, RisingCompetitor, SocialBuzz } from './market-momentum-types'

const genreMomentumSchema = z.object({
  genre: z.string(),
  overallTrend: z.enum(['rising', 'stable', 'declining', 'emerging']),
  momentumScore: z.number(),
  signals: z.object({
    twitter: z.object({
      volume: z.number(),
      sentiment: z.number(),
      trending: z.boolean(),
    }),
    steam: z.object({
      playerGrowth: z.number(),
      newReleases: z.number(),
      topPerformers: z.array(z.string()),
    }),
    reddit: z.object({
      engagement: z.number(),
      sentiment: z.string(),
      hotTopics: z.array(z.string()),
    }),
  }),
  marketTiming: z.enum(['optimal', 'good', 'saturated', 'risky']),
  competitorDensity: z.enum(['low', 'medium', 'high', 'oversaturated']),
  opportunities: z.array(z.string()),
  risks: z.array(z.string()),
})

const socialBuzzSchema = z.object({
  topic: z.string(),
  buzzScore: z.number(),
  sources: z.array(z.string()),
  sentiment: z.enum(['positive', 'negative', 'mixed']),
  timeframe: z.string(),
  keyInfluencers: z.array(z.string()),
  viralPotential: z.enum(['high', 'medium', 'low']),
})

const risingCompetitorSchema = z.object({
  game: z.string(),
  genre: z.array(z.string()),
  momentumScore: z.number(),
  reason: z.string(),
  lessonsToLearn: z.array(z.string()),
  differentiators: z.array(z.string()),
})

function parseGenreMomentum(data: unknown): GenreMomentum[] {
  return z.array(genreMomentumSchema).parse(data)
}

function parseSocialBuzz(data: unknown): SocialBuzz[] {
  return z.array(socialBuzzSchema).parse(data)
}

function parseRisingCompetitors(data: unknown): RisingCompetitor[] {
  return z.array(risingCompetitorSchema).parse(data)
}

export const GENRE_MOMENTUM_DATA = parseGenreMomentum(genreMomentumJson)
export const SOCIAL_BUZZ = parseSocialBuzz(socialBuzzJson)
export const RISING_COMPETITORS = parseRisingCompetitors(risingCompetitorsJson)
