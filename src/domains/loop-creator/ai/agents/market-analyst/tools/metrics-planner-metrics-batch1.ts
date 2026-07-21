import { z } from 'zod'
import metricDatabaseBatch1Json from '../data/metric-database-batch1.json'
import type { MetricDefinition } from './metrics-planner-types'

const metricExampleSchema = z.object({
  game: z.string(),
  value: z.string(),
  insight: z.string(),
})

const metricDefinitionSchema = z.object({
  name: z.string(),
  category: z.enum(['engagement', 'retention', 'monetization', 'virality', 'quality', 'loop_health']),
  description: z.string(),
  formula: z.string().optional(),
  importance: z.enum(['critical', 'important', 'nice_to_have']),
  benchmarks: z.object({
    poor: z.string(),
    average: z.string(),
    good: z.string(),
    excellent: z.string(),
  }),
  applicableGenres: z.array(z.string()),
  measurementTiming: z.string(),
  exampleFromGame: metricExampleSchema.optional(),
})

function parseMetricDatabaseBatch1(data: unknown): MetricDefinition[] {
  return z.array(metricDefinitionSchema).parse(data)
}

export const METRIC_DATABASE_BATCH1 = parseMetricDatabaseBatch1(metricDatabaseBatch1Json)
