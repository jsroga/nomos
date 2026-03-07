/**
 * Market Analyst Agent
 *
 * A ReAct-style agent that performs comprehensive market research on game loops.
 * Uses 17 specialized tools including real-time market signals and knows when research is complete.
 *
 * KEY DESIGN: A loop only needs to excel at ONE archetype to be viable.
 */

import { ChatOpenAI } from '@langchain/openai'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages'
import { LoopAnalysisInput, MarketAnalystState, MarketAnalysisReport } from './types'
import { MARKET_ANALYST_SYSTEM_PROMPT, buildLoopContext, SCORING_CRITERIA_PLACEHOLDER } from './prompts'

// Import all tools
import { webSearchTool } from './tools/web-search'
import { steamChartsTool } from './tools/steam-charts'
import { gameDatabaseTool } from './tools/game-database'
import { patternMatcherTool } from './tools/pattern-matcher'

// Reference game scorers
import { discoElysiumScorerTool } from './tools/scorers/disco-elysium'
import { vampireSurvivorsScorerTool } from './tools/scorers/vampire-survivors'
import { counterStrikeScorerTool } from './tools/scorers/counter-strike'
import { bestMatchScorerTool } from './tools/scorers/best-match'

// Market analysis tools
import { marketSizeEstimatorTool } from './tools/market-size'
import { audienceAnalyzerTool } from './tools/audience-analyzer'
import { competitorFinderTool } from './tools/competitor-finder'
import { trendAnalyzerTool } from './tools/trend-analyzer'
import { metricsPlannerTool } from './tools/metrics-planner'
import { reportGeneratorTool } from './tools/report-generator'

// Real-time market signal tools
import { twitterTrendsTool } from './tools/twitter-trends'
import { steamTrendingTool } from './tools/steam-trending'
import { redditPulseTool } from './tools/reddit-pulse'
import { marketMomentumTool } from './tools/market-momentum'

/**
 * All available tools for the market analyst (17 tools)
 *
 * TOOL DESIGN PHILOSOPHY:
 * 1. Tools provide data + curated examples (secret sauce)
 * 2. Agent provides intelligence (reasoning about when/how to use tools)
 * 3. Combination creates insights neither could alone
 *
 * KEY PRINCIPLE: A loop only needs to excel at ONE archetype to be viable.
 */
export const marketAnalystTools = [
  // Research tools - gather external data
  webSearchTool,
  steamChartsTool,
  gameDatabaseTool,

  // Real-time market signal tools (START HERE)
  marketMomentumTool, // PRIMARY: Aggregated market signals
  twitterTrendsTool, // Live gaming discussions
  steamTrendingTool, // Current top games
  redditPulseTool, // Community sentiment

  // Analysis tools - process loop design
  patternMatcherTool,
  competitorFinderTool, // Enhanced with deep competitor profiles
  metricsPlannerTool, // Smart KPI recommendations with benchmarks
  audienceAnalyzerTool,
  trendAnalyzerTool,
  marketSizeEstimatorTool,

  // Archetype scoring tools
  bestMatchScorerTool, // PRIMARY: Identifies best archetype match
  discoElysiumScorerTool, // Legacy - use bestMatchScorerTool
  vampireSurvivorsScorerTool, // Legacy - use bestMatchScorerTool
  counterStrikeScorerTool, // Legacy - use bestMatchScorerTool

  // Output tool - compile final report
  reportGeneratorTool,
]

/**
 * Create the market analyst agent
 */
export function createMarketAnalystAgent() {
  const model = new ChatOpenAI({
    modelName: 'gpt-4o',
    temperature: 0.3, // Lower temperature for more consistent research
  })

  const agent = createReactAgent({
    llm: model,
    tools: marketAnalystTools,
  })

  return agent
}

/**
 * Run market analysis on a game loop
 */
export async function runMarketAnalysis(
  input: LoopAnalysisInput,
  onProgress?: (message: string) => void
): Promise<{
  report: MarketAnalysisReport | null
  messages: string[]
  error?: string
}> {
  const messages: string[] = []

  try {
    onProgress?.('🔍 Starting market analysis...')
    messages.push('Starting market analysis')

    // Build context from input
    const loopContext = buildLoopContext({
      mechanics: input.mechanics,
      connections: input.connections,
      loops: input.loops,
      gameGenre: input.gameGenre,
      gamePlatform: input.gamePlatform,
      targetAudience: input.targetAudience,
      gameDescription: input.gameDescription,
    })

    // Create the system prompt with context and scoring criteria
    const systemPrompt = MARKET_ANALYST_SYSTEM_PROMPT.replace(
      '{{SCORING_CRITERIA}}',
      SCORING_CRITERIA_PLACEHOLDER
    ).replace('{{LOOP_CONTEXT}}', loopContext)

    // Create the agent
    const agent = createMarketAnalystAgent()

    // Run the agent with streaming
    onProgress?.('📊 Researching market data...')

    const result = await agent.invoke(
      {
        messages: [
          new SystemMessage(systemPrompt),
          new HumanMessage(
            'Conduct a comprehensive market analysis for this game loop design. ' +
              `The genre is "${input.gameGenre}", platform is "${input.gamePlatform}", ` +
              `and target audience is "${input.targetAudience}". ` +
              'Use all available tools to gather data, then generate a complete report.'
          ),
        ],
      },
      {
        recursionLimit: 25, // Allow enough iterations for thorough research
      }
    )

    // Extract the final report from the agent's messages
    const agentMessages = result.messages || []
    let report: MarketAnalysisReport | null = null

    // Look through tool calls for the generate_report result
    for (const msg of agentMessages) {
      if (msg.content && typeof msg.content === 'string') {
        try {
          const parsed = JSON.parse(msg.content)
          if (parsed.report) {
            report = parsed.report
            onProgress?.('✅ Market analysis complete!')
            messages.push('Analysis complete')
            break
          }
        } catch {
          // Not JSON, continue
        }
      }
    }

    // If no report found, try to extract from the last AI message
    if (!report) {
      const lastAIMessage = [...agentMessages].reverse().find(m => m instanceof AIMessage)
      if (lastAIMessage?.content) {
        messages.push(
          typeof lastAIMessage.content === 'string'
            ? lastAIMessage.content
            : 'Analysis completed but report format unclear'
        )
      }
    }

    return {
      report,
      messages,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    messages.push(`Error: ${errorMessage}`)
    onProgress?.(`❌ Error: ${errorMessage}`)

    return {
      report: null,
      messages,
      error: errorMessage,
    }
  }
}

/**
 * Stream market analysis with progress updates
 */
export async function* streamMarketAnalysis(input: LoopAnalysisInput): AsyncGenerator<{
  type: 'progress' | 'tool_call' | 'tool_result' | 'message' | 'report' | 'error'
  content: string | MarketAnalysisReport
}> {
  try {
    yield { type: 'progress', content: '🔍 Initializing market analysis...' }

    // Build context
    const loopContext = buildLoopContext({
      mechanics: input.mechanics,
      connections: input.connections,
      loops: input.loops,
      gameGenre: input.gameGenre,
      gamePlatform: input.gamePlatform,
      targetAudience: input.targetAudience,
      gameDescription: input.gameDescription,
    })

    const systemPrompt = MARKET_ANALYST_SYSTEM_PROMPT.replace(
      '{{SCORING_CRITERIA}}',
      SCORING_CRITERIA_PLACEHOLDER
    ).replace('{{LOOP_CONTEXT}}', loopContext)

    // Create agent
    const agent = createMarketAnalystAgent()

    yield { type: 'progress', content: '📊 Starting research...' }

    // Stream agent execution
    const stream = await agent.stream(
      {
        messages: [
          new SystemMessage(systemPrompt),
          new HumanMessage(
            'Conduct a comprehensive market analysis for this game loop design. ' +
              `The genre is "${input.gameGenre}", platform is "${input.gamePlatform}", ` +
              `and target audience is "${input.targetAudience}". ` +
              'Use all available tools to gather data, then generate a complete report.'
          ),
        ],
      },
      {
        recursionLimit: 25,
      }
    )

    let report: MarketAnalysisReport | null = null

    for await (const chunk of stream) {
      // Handle different chunk types
      if (chunk.agent) {
        const agentMessages = chunk.agent.messages || []
        for (const msg of agentMessages) {
          if (msg.tool_calls?.length > 0) {
            for (const toolCall of msg.tool_calls) {
              yield {
                type: 'tool_call',
                content: `🔧 Using ${toolCall.name}...`,
              }
            }
          }
        }
      }

      if (chunk.tools) {
        const toolMessages = chunk.tools.messages || []
        for (const msg of toolMessages) {
          if (msg.content && typeof msg.content === 'string') {
            try {
              const parsed = JSON.parse(msg.content)

              // Check for report
              if (parsed.report) {
                report = parsed.report
                yield { type: 'report', content: report }
              } else if (parsed.success) {
                // Tool succeeded
                yield {
                  type: 'tool_result',
                  content: parsed.summary || parsed.interpretation || 'Tool completed',
                }
              }
            } catch {
              // Not JSON
            }
          }
        }
      }
    }

    if (report) {
      yield { type: 'progress', content: '✅ Market analysis complete!' }
    } else {
      yield { type: 'progress', content: '⚠️ Analysis completed but no report generated' }
    }
  } catch (error) {
    yield {
      type: 'error',
      content: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Re-export types
export type { LoopAnalysisInput, MarketAnalysisReport, MarketAnalystState }
