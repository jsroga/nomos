/**
 * Report Generator Tool
 *
 * Compiles all market analysis findings into a comprehensive report.
 * This tool should be called LAST after all research is complete.
 */

import { z } from 'zod'
import { MarketAnalysisReport, ReferenceGameScores } from '../types'
import { createLoopStructuredTool } from './structured-tool'

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
      // Calculate overall market viability score
      const scoreComponents = [
        parsed.audienceFit.fitScore * 0.25,
        Math.min(100, (parsed.patterns?.length || 0) * 20) * 0.15,
        (100 - parsed.competitors.length * 10) * 0.15,
        (parsed.trends?.filter(t => t.direction === 'rising').length || 0) * 15 * 0.15,
        30 * 0.3,
      ]

      const overallScore = Math.min(
        100,
        Math.max(0, Math.round(scoreComponents.reduce((sum, s) => sum + s, 0)))
      )

      // Determine dominant game style from reference scores
      const referenceScores: ReferenceGameScores = {
        discoElysium: parsed.discoElysiumScore,
        vampireSurvivors: parsed.vampireSurvivorsScore,
        counterStrike: parsed.counterStrikeScore,
      }

      const dominantStyle =
        parsed.vampireSurvivorsScore >= Math.max(parsed.discoElysiumScore, parsed.counterStrikeScore)
          ? 'Action/Roguelike'
          : parsed.discoElysiumScore >= parsed.counterStrikeScore
            ? 'Narrative/RPG'
            : 'Competitive/Skill-based'

      // Build opportunities list
      const opportunities: string[] = []

      if (parsed.trends?.filter(t => t.direction === 'rising').length || 0 >= 2) {
        opportunities.push('Multiple rising trends support this design direction')
      }

      const competitorWeaknesses = parsed.competitors.flatMap(c => c.weaknesses)
      const uniqueWeaknesses = [...new Set(competitorWeaknesses)].slice(0, 3)
      if (uniqueWeaknesses.length > 0) {
        opportunities.push(`Competitor gaps to exploit: ${uniqueWeaknesses.join(', ')}`)
      }

      if (parsed.audienceFit.fitScore >= 60) {
        opportunities.push('Strong audience fit indicates clear market need')
      }

      if (
        parsed.marketSize.growthRate.includes('20') ||
        parsed.marketSize.growthRate.includes('25') ||
        parsed.marketSize.growthRate.includes('85')
      ) {
        opportunities.push(
          `High market growth (${parsed.marketSize.growthRate}) - good entry timing`
        )
      }

      // Build risks list
      const risks: string[] = [...parsed.keyRisks]

      if (parsed.competitors.length >= 4) {
        risks.push('Crowded market - differentiation is essential')
      }

      if (parsed.trends?.some(t => t.direction === 'declining' && t.relevance > 50)) {
        risks.push('Some relevant trends are declining')
      }

      // Compile full report
      const report: MarketAnalysisReport = {
        referenceScores,
        marketSize: {
          tam: parsed.marketSize.tam,
          sam: parsed.marketSize.sam || parsed.marketSize.tam,
          relevantSegment: parsed.marketSize.relevantSegment,
          growthRate: parsed.marketSize.growthRate,
          confidence: 0.75,
          sources: ['Industry reports', 'Steam analytics', 'Market research'],
        },
        competitors: parsed.competitors.map(c => ({
          name: c.name,
          genre: c.genre,
          platform: [],
          similarityScore: c.similarityScore,
          strengths: c.strengths,
          weaknesses: c.weaknesses,
          marketPosition: c.similarityScore > 70 ? 'Direct competitor' : 'Adjacent market',
        })),
        audienceFit: {
          targetDemographic: parsed.audienceFit.targetDemographic,
          fitScore: parsed.audienceFit.fitScore,
          strengths: parsed.audienceFit.strengths,
          concerns: parsed.audienceFit.concerns,
          recommendations: parsed.recommendations.slice(0, 3),
        },
        trends:
          parsed.trends?.map(t => ({
            ...t,
            description: '',
            timeframe: '2024-2025',
          })) || [],
        patterns:
          parsed.patterns?.map(p => ({
            patternName: p.patternName,
            matchScore: p.matchScore,
            description: '',
            examples: [],
            applicability: p.matchScore > 60 ? 'Strong' : 'Moderate',
          })) || [],
        overallScore,
        recommendations: parsed.recommendations,
        risks,
        opportunities,
        generatedAt: new Date().toISOString(),
        sourcesUsed: ['Web research', 'Steam data', 'Game databases', 'Trend analysis'],
        confidence: 0.75,
      }

      // Generate user-facing summary
      const summary = {
        verdict:
          overallScore >= 70
            ? '🟢 Strong market opportunity'
            : overallScore >= 50
              ? '🟡 Viable with execution focus'
              : overallScore >= 30
                ? '🟠 Challenging - needs differentiation'
                : '🔴 High risk - consider pivoting',
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
        // Hide reference scores from direct display but include for internal use
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
