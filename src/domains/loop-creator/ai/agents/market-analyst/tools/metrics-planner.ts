/**
 * Smart Metrics Planner Tool
 *
 * Suggests relevant KPIs and metrics based on game type, loop structure, and business model.
 */

import { z } from 'zod'
import { GENRE_METRIC_PRIORITIES, METRIC_DATABASE } from './metrics-planner-data'
import { planMetrics } from './metrics-planner-plan'
import { createLoopStructuredTool } from './structured-tool'

const metricsPlannerSchema = z.object({
  gameGenre: z.string().describe('Primary game genre'),
  gameSubgenre: z.string().optional().describe('Subgenre if applicable'),
  businessModel: z
    .enum(['premium', 'f2p', 'freemium', 'subscription'])
    .describe('Monetization approach'),
  platform: z.enum(['pc', 'mobile', 'console', 'multi-platform']).describe('Target platform'),
  developmentPhase: z
    .enum(['concept', 'prototype', 'production', 'launch', 'live'])
    .optional()
    .describe('Current development phase'),
  focusAreas: z
    .array(
      z.enum(['engagement', 'retention', 'monetization', 'virality', 'quality', 'loop_health']),
    )
    .optional()
    .describe('Specific areas to focus metrics on'),
})

/**
 * Smart metrics planner tool
 */
export const metricsPlannerTool = createLoopStructuredTool({
  name: 'metrics_planner',
  description: `Plan which KPIs and metrics to track based on game type. Returns:
- Prioritized metrics for your specific game type
- Industry benchmarks with examples from successful games
- Measurement timing and formulas
- Custom metric recommendations
Use this to understand what "good" looks like and set realistic targets.`,
  schema: metricsPlannerSchema,
  func: async input => {
    try {
      return JSON.stringify(planMetrics(metricsPlannerSchema.parse(input)))
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Metrics planning failed',
      })
    }
  },
})

export { METRIC_DATABASE, GENRE_METRIC_PRIORITIES }
