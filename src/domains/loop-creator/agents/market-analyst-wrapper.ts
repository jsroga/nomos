/**
 * Market Analyst Agent Wrapper
 *
 * Wraps the ReAct market analyst for integration with the loop-graph.
 */

import { AIMessage } from '@langchain/core/messages'
import { LoopCreatorState } from '../graph/state'
import { runMarketAnalysis, LoopAnalysisInput } from './market-analyst'

/**
 * Market analyst agent for the loop-graph
 */
export async function marketAnalystAgent(
  state: LoopCreatorState
): Promise<Partial<LoopCreatorState>> {
  // Build input from state
  const input: LoopAnalysisInput = {
    mechanics: state.mechanics.map(m => ({
      id: m.id,
      name: m.name,
      type: m.type,
      description: m.description || '',
    })),
    connections: state.connections.map(c => ({
      id: c.id,
      source: c.source,
      target: c.target,
      label: c.label,
    })),
    loops: state.loops.map(l => ({
      id: l.id,
      name: l.name,
      type: l.type,
      description: l.description,
    })),
    gameGenre: state.gameGenre || 'indie',
    gamePlatform: state.gamePlatform || 'pc',
    targetAudience: state.targetAudience || 'core',
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

**Market Viability Score: ${report.overallScore}/100** ${
      report.overallScore >= 70
        ? '🟢'
        : report.overallScore >= 50
          ? '🟡'
          : report.overallScore >= 30
            ? '🟠'
            : '🔴'
    }

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
        name: 'market_analyst',
      }),
    ],
    nextAgent: 'supervisor', // Return to supervisor to present results
    marketAnalysis: report || undefined,
    // Emit action to open the market analysis panel in the UI
    pendingActions: report
      ? [
          {
            type: 'MARKET_ANALYSIS_COMPLETE' as const,
            payload: { timestamp: Date.now() },
            confidence: 1.0,
            reasoning: 'Market analysis completed successfully',
          },
        ]
      : undefined,
  }
}
