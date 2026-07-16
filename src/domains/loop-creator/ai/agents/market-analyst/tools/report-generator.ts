/**
 * Report Generator Tool
 *
 * Compiles all market analysis findings into a comprehensive report.
 * This tool should be called LAST after all research is complete.
 */

import { z } from 'zod'
import { createLoopStructuredTool } from './structured-tool'
import {
  buildMarketVerdict,
  buildReportOpportunities,
  buildReportRisks,
  calculateReportOverallScore,
  compileMarketAnalysisReport,
  determineDominantStyle,
} from './report-generator-compose'

const reportGeneratorSchema = z.object({
  discoElysiumScore: z.number().describe('Narrative RPG score (0-100)'),
  vampireSurvivorsScore: z.number().describe('Action roguelike score (0-100)'),
  counterStrikeScore: z.number().describe('Competitive FPS score (0-100)'),
  marketSize: z
    .object({
      tam: z.string(),
      sam: z.string().optional(),
      relevantSegment: z.string(),
      growthRate: z.string(),
    })
    .describe('Market size estimation'),
  competitors: z
    .array(
      z.object({
        name: z.string(),
        genre: z.string(),
        similarityScore: z.number(),
        strengths: z.array(z.string()),
        weaknesses: z.array(z.string()),
      })
    )
    .describe('Top competitors identified'),
  audienceFit: z
    .object({
      targetDemographic: z.string(),
      fitScore: z.number(),
      strengths: z.array(z.string()),
      concerns: z.array(z.string()),
    })
    .describe('Audience fit analysis'),
  trends: z
    .array(
      z.object({
        trend: z.string(),
        direction: z.enum(['rising', 'stable', 'declining']),
        relevance: z.number(),
      })
    )
    .optional()
    .describe('Relevant market trends'),
  patterns: z
    .array(
      z.object({
        patternName: z.string(),
        matchScore: z.number(),
      })
    )
    .optional()
    .describe('Design patterns matched'),
  keyStrengths: z.array(z.string()).describe('Key strengths identified'),
  keyRisks: z.array(z.string()).describe('Key risks identified'),
  recommendations: z.array(z.string()).describe('Top recommendations'),
})

/**
 * Report generator tool
 */
export const reportGeneratorTool = createLoopStructuredTool({
  name: 'generate_report',
  description:
    'Compile all research findings into a final market analysis report. CALL THIS LAST after gathering all data.',
  schema: reportGeneratorSchema,
  func: async input => {
    const parsed = reportGeneratorSchema.parse(input)
    try {
      const overallScore = calculateReportOverallScore(parsed)
      const referenceScores = {
        discoElysium: parsed.discoElysiumScore,
        vampireSurvivors: parsed.vampireSurvivorsScore,
        counterStrike: parsed.counterStrikeScore,
      }
      const dominantStyle = determineDominantStyle(parsed)
      const opportunities = buildReportOpportunities(parsed)
      const risks = buildReportRisks(parsed)
      const report = compileMarketAnalysisReport(
        parsed,
        overallScore,
        opportunities,
        risks,
        referenceScores,
      )

      const summary = {
        verdict: buildMarketVerdict(overallScore),
        overallScore,
        dominantStyle,
        marketSize: report.marketSize.relevantSegment,
        competitorCount: report.competitors.length,
        audienceFit: report.audienceFit.fitScore,
        topOpportunities: opportunities.slice(0, 3),
        topRisks: risks.slice(0, 3),
        topRecommendations: parsed.recommendations.slice(0, 3),
      }

      return JSON.stringify({
        success: true,
        report,
        summary,
        _internal: {
          referenceScores,
          styleAnalysis: {
            dominantStyle,
            narrative: parsed.discoElysiumScore,
            action: parsed.vampireSurvivorsScore,
            competitive: parsed.counterStrikeScore,
          },
        },
      })
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Report generation failed',
      })
    }
  },
})
