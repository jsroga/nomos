import { Agent } from '@mastra/core/agent'
import { createTool } from '@mastra/core/tools'
import type { DynamicStructuredTool } from '@langchain/core/tools'
import { LoopAnalysisInput, MarketAnalysisReport } from './types'
import { marketAnalysisReportFromJson } from './market-analysis-wire'
import { MARKET_ANALYST_SYSTEM_PROMPT, buildLoopContext, SCORING_CRITERIA_PLACEHOLDER } from './prompts'
import { marketAnalystTools } from './tools-registry'

function langChainToolToMastra(tool: DynamicStructuredTool) {
  return createTool({
    id: tool.name,
    description: tool.description,
    inputSchema: tool.schema,
    execute: async inputData => {
      const result = await tool.invoke(inputData)
      return typeof result === 'string' ? { output: result } : result
    },
  })
}

/**
 * Create the market analyst as a Mastra agent (no LangGraph).
 */
export function createMarketAnalystAgent() {
  const tools = Object.fromEntries(
    marketAnalystTools.map(tool => [tool.name, langChainToolToMastra(tool)]),
  )

  return new Agent({
    id: 'market-analyst',
    name: 'Market Analyst',
    instructions:
      'Perform comprehensive market research on game loops. Use tools to gather data, score archetypes, and produce a structured report.',
    model: 'openai/gpt-4o',
    tools,
  })
}

/**
 * Run market analysis on a game loop
 */
export async function runMarketAnalysis(
  input: LoopAnalysisInput,
  onProgress?: (message: string) => void,
): Promise<{
  report: MarketAnalysisReport | null
  messages: string[]
  error?: string
}> {
  const messages: string[] = []

  try {
    onProgress?.('Starting market analysis...')
    messages.push('Starting market analysis')

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
      SCORING_CRITERIA_PLACEHOLDER,
    ).replace('{{LOOP_CONTEXT}}', loopContext)

    const agent = createMarketAnalystAgent()

    onProgress?.('Researching market data...')

    const result = await agent.generate(
      [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content:
            'Conduct a comprehensive market analysis for this game loop design. ' +
            `The genre is "${input.gameGenre}", platform is "${input.gamePlatform}", ` +
            `and target audience is "${input.targetAudience}". ` +
            'Use all available tools to gather data, then generate a complete report.',
        },
      ],
      { maxSteps: 25 },
    )

    const agentMessages = result.response?.messages || []
    let report: MarketAnalysisReport | null = null

    for (const msg of agentMessages) {
      if (msg.role !== 'assistant') continue
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
      messages.push(content)

      const reportMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
      if (reportMatch) {
        try {
          report = marketAnalysisReportFromJson(reportMatch[1])
        } catch {
          /* try next message */
        }
      }
    }

    if (!report && result.text) {
      const reportMatch = result.text.match(/```json\s*([\s\S]*?)\s*```/)
      if (reportMatch) {
        try {
          report = marketAnalysisReportFromJson(reportMatch[1])
        } catch {
          /* no structured report */
        }
      }
    }

    onProgress?.(report ? 'Market analysis complete.' : 'Analysis finished without structured report.')

    return { report, messages }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    onProgress?.(`Analysis failed: ${errorMsg}`)
    return { report: null, messages, error: errorMsg }
  }
}

// Re-export tools for tests
export { marketAnalystTools } from './tools-registry'
export type { LoopAnalysisInput, MarketAnalysisReport, MarketAnalystState } from './types'

/**
 * Stream market analysis with progress updates (Mastra agent).
 */
export async function* streamMarketAnalysis(input: LoopAnalysisInput): AsyncGenerator<{
  type: 'progress' | 'tool_call' | 'tool_result' | 'message' | 'report' | 'error'
  content: string | MarketAnalysisReport
}> {
  try {
    yield { type: 'progress', content: 'Initializing market analysis...' }

    const { report, messages, error } = await runMarketAnalysis(input, message => {
      if (message.includes('Researching') || message.includes('Starting')) {
        /* surfaced via final progress */
      }
    })

    yield { type: 'progress', content: 'Researching market data...' }

    if (error) {
      yield { type: 'error', content: error }
      return
    }

    for (const msg of messages) {
      yield { type: 'message', content: msg }
    }

    if (report) {
      yield { type: 'report', content: report }
      yield { type: 'progress', content: 'Market analysis complete.' }
    } else {
      yield { type: 'progress', content: 'Analysis completed but no structured report was generated.' }
    }
  } catch (error) {
    yield {
      type: 'error',
      content: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

