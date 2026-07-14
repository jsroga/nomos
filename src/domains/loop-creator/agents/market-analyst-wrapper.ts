/**
 * Market Analyst Agent Wrapper
 *
 * Wraps the ReAct market analyst for integration with the loop-graph.
 */

import { AIMessage } from '@langchain/core/messages'
import { LoopAgentNode } from '@/domains/loop-creator/constants/agent-nodes'
import { LoopAgentActionKind } from '@/domains/loop-creator/constants/loop-agent-actions'
import {
  LoopGameAudienceDefault,
  LoopGameGenreDefault,
  LoopGamePlatformDefault,
  MARKET_ANALYSIS_COMPLETE_REASONING,
  MarketViabilityScoreEmoji,
} from '@/domains/loop-creator/constants/market-analysis'
import { NEXT_AGENT_SUPERVISOR } from '@/domains/loop-creator/constants/graph-state-defaults'
import { LoopCreatorState } from '../core/graph/state'
import { runMarketAnalysis, LoopAnalysisInput } from './market-analyst'

function viabilityScoreEmoji(score: number): string {
  if (score >= 70) return MarketViabilityScoreEmoji.High
  if (score >= 50) return MarketViabilityScoreEmoji.Medium
  if (score >= 30) return MarketViabilityScoreEmoji.Low
  return MarketViabilityScoreEmoji.Critical
}

/**
 * Market analyst agent for the loop-graph
 */
export async function marketAnalystAgent(
  state: LoopCreatorState
): Promise<Partial<LoopCreatorState>> {
  // Build input from state
  const input: LoopAnalysisInput = {
    mechanics: state.mechanics,
    connections: state.connections,
    loops: state.loops,
    gameGenre: state.gameGenre || LoopGameGenreDefault.Indie,
    gamePlatform: state.gamePlatform || LoopGamePlatformDefault.Pc,
    targetAudience: state.targetAudience || LoopGameAudienceDefault.Core,
    gameDescription: state.gameDescription || '',
  }

  const progressMessages: string[] = []

  // Run the analysis
  const { report, messages, error } = await runMarketAnalysis(input, msg => {
    progressMessages.push(msg)
  })

  // Build response message
  let responseContent = ''

  if (report) {
    responseContent = `## Market Analysis Complete

**Market Viability Score: ${report.overallScore}/100** ${viabilityScoreEmoji(report.overallScore)}

### Market Size
- **Total Addressable Market**: ${report.marketSize.tam}
- **Target Segment**: ${report.marketSize.relevantSegment}
- **Growth Rate**: ${report.marketSize.growthRate}

### Audience Fit (${report.audienceFit.fitScore}/100)
${report.audienceFit.targetDemographic}

**Strengths:**
${report.audienceFit.strengths.map(s => `- ${s}`).join('\n')}

**Concerns:**
${report.audienceFit.concerns.map(c => `- ${c}`).join('\n')}

### Competitors (${report.competitors.length} found)
${report.competitors
  .slice(0, 3)
  .map(c => `- **${c.name}** (${c.similarityScore}% similar) - ${c.marketPosition}`)
  .join('\n')}

### Key Opportunities
${report.opportunities
  .slice(0, 3)
  .map(o => `- ${o}`)
  .join('\n')}

### Key Risks
${report.risks
  .slice(0, 3)
  .map(r => `- ${r}`)
  .join('\n')}

### Recommendations
${report.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}
`
  } else if (error) {
    responseContent = `❌ Market analysis failed: ${error}\n\nPlease try again or check your network connection.`
  } else {
    responseContent = `Market analysis completed but no report was generated. Messages:\n${messages.join('\n')}`
  }

  return {
    messages: [
      new AIMessage({
        content: responseContent,
        name: LoopAgentNode.MarketAnalyst,
      }),
    ],
    nextAgent: NEXT_AGENT_SUPERVISOR, // Return to supervisor to present results
    marketAnalysis: report || undefined,
    // Emit action to open the market analysis panel in the UI
    pendingActions: report
      ? [
          {
            type: LoopAgentActionKind.MarketAnalysisComplete,
            payload: { timestamp: Date.now() },
            confidence: 1.0,
            reasoning: MARKET_ANALYSIS_COMPLETE_REASONING,
          },
        ]
      : undefined,
  }
}
