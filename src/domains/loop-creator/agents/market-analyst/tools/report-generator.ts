/**
 * Report Generator Tool
 *
 * Compiles all market analysis findings into a comprehensive report.
 * This tool should be called LAST after all research is complete.
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import {
  MarketAnalysisReport,
  ReferenceGameScores,
  MarketSizeData,
  CompetitorData,
  AudienceFitData,
  TrendData,
  PatternMatch,
} from '../types'

/**
 * Report generator tool
 */
export const reportGeneratorTool = new DynamicStructuredTool({
  name: 'generate_report',
  description:
    'Compile all research findings into a final market analysis report. CALL THIS LAST after gathering all data.',
  schema: z.object({
    // Reference scores (hidden from user presentation)
    discoElysiumScore: z.number().describe('Narrative RPG score (0-100)'),
    vampireSurvivorsScore: z.number().describe('Action roguelike score (0-100)'),
    counterStrikeScore: z.number().describe('Competitive FPS score (0-100)'),

    // Market data
    marketSize: z
      .object({
        tam: z.string(),
        sam: z.string().optional(),
        relevantSegment: z.string(),
        growthRate: z.string(),
      })
      .describe('Market size estimation'),

    // Competitors
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

    // Audience fit
    audienceFit: z
      .object({
        targetDemographic: z.string(),
        fitScore: z.number(),
        strengths: z.array(z.string()),
        concerns: z.array(z.string()),
      })
      .describe('Audience fit analysis'),

    // Trends
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

    // Patterns matched
    patterns: z
      .array(
        z.object({
          patternName: z.string(),
          matchScore: z.number(),
        })
      )
      .optional()
      .describe('Design patterns matched'),

    // Summary inputs
    keyStrengths: z.array(z.string()).describe('Key strengths identified'),
    keyRisks: z.array(z.string()).describe('Key risks identified'),
    recommendations: z.array(z.string()).describe('Top recommendations'),
  }),
  func: async (input): Promise<string> => {
    try {
      // Calculate overall market viability score
      const scoreComponents = [
        input.audienceFit.fitScore * 0.25, // Audience fit
        Math.min(100, (input.patterns?.length || 0) * 20) * 0.15, // Pattern quality
        (100 - input.competitors.length * 10) * 0.15, // Competition level (less is better)
        (input.trends?.filter(t => t.direction === 'rising').length || 0) * 15 * 0.15, // Trend alignment
        30 * 0.3, // Base score
      ]

      const overallScore = Math.min(
        100,
        Math.max(0, Math.round(scoreComponents.reduce((sum, s) => sum + s, 0)))
      )

      // Determine dominant game style from reference scores
      const referenceScores: ReferenceGameScores = {
        discoElysium: input.discoElysiumScore,
        vampireSurvivors: input.vampireSurvivorsScore,
        counterStrike: input.counterStrikeScore,
      }

      const dominantStyle =
        input.vampireSurvivorsScore >= Math.max(input.discoElysiumScore, input.counterStrikeScore)
          ? 'Action/Roguelike'
          : input.discoElysiumScore >= input.counterStrikeScore
            ? 'Narrative/RPG'
            : 'Competitive/Skill-based'

      // Build opportunities list
      const opportunities: string[] = []

      if (input.trends?.filter(t => t.direction === 'rising').length || 0 >= 2) {
        opportunities.push('Multiple rising trends support this design direction')
      }

      const competitorWeaknesses = input.competitors.flatMap(c => c.weaknesses)
      const uniqueWeaknesses = [...new Set(competitorWeaknesses)].slice(0, 3)
      if (uniqueWeaknesses.length > 0) {
        opportunities.push(`Competitor gaps to exploit: ${uniqueWeaknesses.join(', ')}`)
      }

      if (input.audienceFit.fitScore >= 60) {
        opportunities.push('Strong audience fit indicates clear market need')
      }

      if (
        input.marketSize.growthRate.includes('20') ||
        input.marketSize.growthRate.includes('25') ||
        input.marketSize.growthRate.includes('85')
      ) {
        opportunities.push(
          `High market growth (${input.marketSize.growthRate}) - good entry timing`
        )
      }

      // Build risks list
      const risks: string[] = [...input.keyRisks]

      if (input.competitors.length >= 4) {
        risks.push('Crowded market - differentiation is essential')
      }

      if (input.trends?.some(t => t.direction === 'declining' && t.relevance > 50)) {
        risks.push('Some relevant trends are declining')
      }

      // Compile full report
      const report: MarketAnalysisReport = {
        referenceScores,
        marketSize: {
          tam: input.marketSize.tam,
          sam: input.marketSize.sam || input.marketSize.tam,
          relevantSegment: input.marketSize.relevantSegment,
          growthRate: input.marketSize.growthRate,
          confidence: 0.75,
          sources: ['Industry reports', 'Steam analytics', 'Market research'],
        },
        competitors: input.competitors.map(c => ({
          name: c.name,
          genre: c.genre,
          platform: [],
          similarityScore: c.similarityScore,
          strengths: c.strengths,
          weaknesses: c.weaknesses,
          marketPosition: c.similarityScore > 70 ? 'Direct competitor' : 'Adjacent market',
        })),
        audienceFit: {
          targetDemographic: input.audienceFit.targetDemographic,
          fitScore: input.audienceFit.fitScore,
          strengths: input.audienceFit.strengths,
          concerns: input.audienceFit.concerns,
          recommendations: input.recommendations.slice(0, 3),
        },
        trends:
          input.trends?.map(t => ({
            ...t,
            description: '',
            timeframe: '2024-2025',
          })) || [],
        patterns:
          input.patterns?.map(p => ({
            patternName: p.patternName,
            matchScore: p.matchScore,
            description: '',
            examples: [],
            applicability: p.matchScore > 60 ? 'Strong' : 'Moderate',
          })) || [],
        overallScore,
        recommendations: input.recommendations,
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
        topRecommendations: input.recommendations.slice(0, 3),
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
            narrative: input.discoElysiumScore,
            action: input.vampireSurvivorsScore,
            competitive: input.counterStrikeScore,
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

/**
 * Format report for display
 */
export function formatReportForDisplay(report: MarketAnalysisReport): string {
  const sections: string[] = []

  // Header
  sections.push('# Market Analysis Report')
  sections.push(`Generated: ${new Date(report.generatedAt).toLocaleDateString()}`)
  sections.push(`Confidence: ${Math.round(report.confidence * 100)}%`)
  sections.push('')

  // Overall Score
  sections.push(`## Overall Market Viability: ${report.overallScore}/100`)
  sections.push('')

  // Market Size
  sections.push('## Market Size')
  sections.push(`- Total Addressable Market: ${report.marketSize.tam}`)
  sections.push(`- Relevant Segment: ${report.marketSize.relevantSegment}`)
  sections.push(`- Growth Rate: ${report.marketSize.growthRate}`)
  sections.push('')

  // Competitors
  sections.push(`## Competitors (${report.competitors.length})`)
  report.competitors.forEach(c => {
    sections.push(`### ${c.name}`)
    sections.push(`Similarity: ${c.similarityScore}% | Position: ${c.marketPosition}`)
    sections.push(`Strengths: ${c.strengths.join(', ')}`)
    sections.push(`Weaknesses: ${c.weaknesses.join(', ')}`)
  })
  sections.push('')

  // Audience Fit
  sections.push(`## Audience Fit: ${report.audienceFit.fitScore}/100`)
  sections.push(`Target: ${report.audienceFit.targetDemographic}`)
  sections.push(`Strengths: ${report.audienceFit.strengths.join(', ')}`)
  sections.push(`Concerns: ${report.audienceFit.concerns.join(', ')}`)
  sections.push('')

  // Recommendations
  sections.push('## Top Recommendations')
  report.recommendations.forEach((r, i) => {
    sections.push(`${i + 1}. ${r}`)
  })
  sections.push('')

  // Opportunities & Risks
  sections.push('## Opportunities')
  report.opportunities.forEach(o => sections.push(`- ${o}`))
  sections.push('')
  sections.push('## Risks')
  report.risks.forEach(r => sections.push(`- ${r}`))

  return sections.join('\n')
}
