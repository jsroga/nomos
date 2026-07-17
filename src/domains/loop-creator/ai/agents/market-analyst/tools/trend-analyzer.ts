/**
 * Trend Analyzer Tool
 *
 * Analyzes current and emerging trends in game genres and mechanics.
 */

import { z } from 'zod'
import { TrendData } from '../types'
import { createLoopStructuredTool } from './structured-tool'

/**
 * Current gaming trends database
 */
const TRENDS_DB: TrendData[] = [
  {
    trend: 'Survivors-like Explosion',
    direction: 'rising',
    relevance: 0,
    description:
      'Auto-attacking horde survival games inspired by Vampire Survivors continue to flood the market, but quality differentiation is becoming crucial.',
    timeframe: '2022-2025',
  },
  {
    trend: 'Cozy Games Movement',
    direction: 'rising',
    relevance: 0,
    description:
      'Low-stakes, relaxing games focusing on farming, crafting, and life simulation are experiencing major growth.',
    timeframe: '2023-2025',
  },
  {
    trend: 'Roguelike Fatigue',
    direction: 'stable',
    relevance: 0,
    description:
      'While still popular, players are becoming more selective about roguelikes. Innovation and quality are key.',
    timeframe: '2024-2025',
  },
  {
    trend: 'Poker/Card Game Hybrids',
    direction: 'rising',
    relevance: 0,
    description:
      'Following Balatro\'s success, games combining traditional card games with roguelike elements are trending.',
    timeframe: '2024-2025',
  },
  {
    trend: 'Mobile-First Indies',
    direction: 'rising',
    relevance: 0,
    description:
      'Indies increasingly launching on mobile alongside PC, driven by better tools and market opportunity.',
    timeframe: '2024-2026',
  },
  {
    trend: 'Short Session Design',
    direction: 'rising',
    relevance: 0,
    description:
      'Games designed for 15-30 minute sessions are outperforming longer-form games in engagement metrics.',
    timeframe: '2023-2025',
  },
  {
    trend: 'Meta-Progression Standard',
    direction: 'stable',
    relevance: 0,
    description:
      'Permanent progression between runs is now expected in roguelikes, not a differentiator.',
    timeframe: 'Established',
  },
  {
    trend: 'Steam Next Fest Impact',
    direction: 'rising',
    relevance: 0,
    description: 'Demo events on Steam have become critical launch strategy for indie discovery.',
    timeframe: '2023-2025',
  },
  {
    trend: 'Narrative Roguelikes',
    direction: 'rising',
    relevance: 0,
    description:
      'Roguelikes with strong narrative integration (Hades model) are setting new quality bars.',
    timeframe: '2020-2025',
  },
  {
    trend: 'Build Crafting Depth',
    direction: 'rising',
    relevance: 0,
    description:
      'Players crave synergistic build systems that enable creative expression and optimization.',
    timeframe: '2022-2025',
  },
  {
    trend: 'Multiplayer Roguelikes',
    direction: 'rising',
    relevance: 0,
    description:
      'Co-op roguelikes are growing, but matchmaking and session length remain challenges.',
    timeframe: '2023-2025',
  },
  {
    trend: 'Automation Mechanics',
    direction: 'rising',
    relevance: 0,
    description:
      'Auto-features and idle elements being integrated into traditionally active genres.',
    timeframe: '2022-2025',
  },
  {
    trend: 'Esports Indie Growth',
    direction: 'stable',
    relevance: 0,
    description:
      'While AAA dominates esports, niche competitive scenes around indies are emerging.',
    timeframe: '2023-2026',
  },
  {
    trend: 'Content Creator Designed',
    direction: 'rising',
    relevance: 0,
    description: 'Games designed with streaming and content creation in mind from the start.',
    timeframe: '2023-2025',
  },
  {
    trend: 'Pixel Art Premium',
    direction: 'stable',
    relevance: 0,
    description:
      'High-quality pixel art remains valued, but market is saturated. Quality bar is high.',
    timeframe: 'Established',
  },
]

const trendAnalyzerSchema = z.object({
  genre: z.string().describe('Game genre to analyze trends for'),
  mechanics: z.array(z.string()).optional().describe('Key mechanics to consider'),
  platform: z.string().optional().describe('Target platform'),
})

/**
 * Trend analyzer tool
 */
export const trendAnalyzerTool = createLoopStructuredTool({
  name: 'trend_analyzer',
  description:
    'Analyze current and emerging trends relevant to a game genre and mechanics. Identifies opportunities and risks.',
  schema: trendAnalyzerSchema,
  func: async input => {
    const { genre, mechanics, platform } = trendAnalyzerSchema.parse(input)
    try {
      const searchText = [genre, ...(mechanics || []), platform || ''].join(' ').toLowerCase()

      // Score trends by relevance
      const scoredTrends = TRENDS_DB.map(trend => {
        const trendText = `${trend.trend} ${trend.description}`.toLowerCase()

        let relevance = 0

        // Check for keyword matches
        const keywords = searchText.split(/\s+/)
        for (const keyword of keywords) {
          if (keyword.length > 3 && trendText.includes(keyword)) {
            relevance += 20
          }
        }

        // Genre-specific boosts
        if (searchText.includes('roguelike') && trendText.includes('roguelike')) {
          relevance += 30
        }
        if (searchText.includes('survivor') && trendText.includes('survivor')) {
          relevance += 40
        }
        if (searchText.includes('card') && trendText.includes('card')) {
          relevance += 30
        }
        if (searchText.includes('mobile') && trendText.includes('mobile')) {
          relevance += 30
        }
        if (searchText.includes('coop') && trendText.includes('multiplayer')) {
          relevance += 25
        }

        return {
          ...trend,
          relevance: Math.min(100, relevance),
        }
      })

      // Sort by relevance
      const relevantTrends = scoredTrends
        .filter(t => t.relevance > 20)
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 8)

      // Categorize trends in a single pass (opportunity / risk / stable).
      const opportunities: Array<{ trend: string; description: string; relevance: number }> = []
      const risks: Array<{ trend: string; description: string }> = []
      const stable: typeof relevantTrends = []
      for (const t of relevantTrends) {
        if (t.direction === 'rising') {
          opportunities.push({ trend: t.trend, description: t.description, relevance: t.relevance })
        } else if (
          t.direction === 'declining' ||
          (t.direction === 'stable' && t.description.includes('saturat'))
        ) {
          risks.push({ trend: t.trend, description: t.description })
        } else if (t.direction === 'stable' && !t.description.includes('saturat')) {
          stable.push(t)
        }
      }

      // Generate insights
      const insights: string[] = []

      if (opportunities.length >= 3) {
        insights.push('Multiple rising trends align with this design - good timing')
      }
      if (risks.length > 0) {
        insights.push('Some market saturation detected - differentiation needed')
      }
      if (relevantTrends.some(t => t.trend.includes('Fatigue'))) {
        insights.push('Genre may be reaching saturation - quality is paramount')
      }
      if (relevantTrends.some(t => t.trend.includes('Short Session'))) {
        insights.push('Consider designing for shorter play sessions')
      }

      return JSON.stringify({
        success: true,
        genre,
        trendCount: relevantTrends.length,
        trends: relevantTrends,
        summary: {
          opportunities: opportunities.slice(0, 3),
          risks: risks.slice(0, 2),
          stable: stable.slice(0, 2).map(t => t.trend),
        },
        insights,
        marketTiming:
          opportunities.length > risks.length
            ? 'Favorable - rising trends outweigh risks'
            : risks.length > opportunities.length
              ? 'Challenging - consider timing carefully'
              : 'Neutral - execution quality will determine success',
      })
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Trend analysis failed',
      })
    }
  },
})
