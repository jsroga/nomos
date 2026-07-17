import { Agent } from '@mastra/core/agent'
import { createTool } from '@mastra/core/tools'
import type { DynamicStructuredTool } from '@langchain/core/tools'
import {
  MARKET_ANALYSIS_NO_STRUCTURED_REPORT,
  MarketAnalysisStreamEvent,
} from '@/domains/loop-creator/constants/market-analysis'
import {
  MarketAnalysisFailurePrefix,
  MarketAnalysisProgressMessage,
  MarketAnalysisUserPromptPart,
  MarketAnalystAgentId,
  MarketAnalystAgentName,
  MarketAnalystModel,
  MARKET_ANALYST_AGENT_INSTRUCTIONS,
  MarketAnalystPromptPlaceholder,
  MastraMessageRole,
  MarketAnalysisErrorMessage,
} from '../../constants/market-analyst-agent-wire'
import { LoopAnalysisInput, MarketAnalysisReport } from './types'
import { MARKET_ANALYST_SYSTEM_PROMPT, buildLoopContext, SCORING_CRITERIA_PLACEHOLDER } from './prompts'
import {
  extractReportFromAgentMessages,
  extractReportFromText,
} from './market-analysis-run'
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
    id: MarketAnalystAgentId.Id,
    name: MarketAnalystAgentName.Name,
    instructions: MARKET_ANALYST_AGENT_INSTRUCTIONS,
    model: MarketAnalystModel.Default,
    tools,
  })
}

function buildMarketAnalysisPrompt(input: LoopAnalysisInput): string {
  const loopContext = buildLoopContext({
    mechanics: input.mechanics,
    connections: input.connections,
    loops: input.loops,
    gameGenre: input.gameGenre,
    gamePlatform: input.gamePlatform,
    targetAudience: input.targetAudience,
    gameDescription: input.gameDescription,
  })

  return MARKET_ANALYST_SYSTEM_PROMPT.replace(
    MarketAnalystPromptPlaceholder.ScoringCriteria,
    SCORING_CRITERIA_PLACEHOLDER,
  ).replace(MarketAnalystPromptPlaceholder.LoopContext, loopContext)
}

function buildMarketAnalysisUserMessage(input: LoopAnalysisInput): string {
  return (
    MarketAnalysisUserPromptPart.Intro +
    `The genre is "${input.gameGenre}", platform is "${input.gamePlatform}", ` +
    `and target audience is "${input.targetAudience}". ` +
    MarketAnalysisUserPromptPart.ToolsSuffix
  )
}

function collectAssistantMessages(
  agentMessages: Array<{ role: string; content: unknown }>,
): string[] {
  return agentMessages
    .filter(msg => msg.role === MastraMessageRole.Assistant)
    .map(msg => (typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)))
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
    onProgress?.(MarketAnalysisProgressMessage.StartingUi)
    messages.push(MarketAnalysisProgressMessage.StartingLog)

    const agent = createMarketAnalystAgent()
    onProgress?.(MarketAnalysisProgressMessage.Researching)

    const result = await agent.generate(
      [
        { role: MastraMessageRole.System, content: buildMarketAnalysisPrompt(input) },
        { role: MastraMessageRole.User, content: buildMarketAnalysisUserMessage(input) },
      ],
      { maxSteps: 25 },
    )

    const agentMessages = result.response?.messages || []
    messages.push(...collectAssistantMessages(agentMessages))

    const report =
      extractReportFromAgentMessages(agentMessages) ?? extractReportFromText(result.text)

    onProgress?.(
      report
        ? MarketAnalysisProgressMessage.Complete
        : MarketAnalysisProgressMessage.NoStructuredReport,
    )

    return { report, messages }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : MarketAnalysisErrorMessage.Unknown
    onProgress?.(`${MarketAnalysisFailurePrefix.AnalysisFailed}${errorMsg}`)
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
  type: MarketAnalysisStreamEvent
  content: string | MarketAnalysisReport
}> {
  try {
    yield {
      type: MarketAnalysisStreamEvent.Progress,
      content: MarketAnalysisProgressMessage.Initializing,
    }

    const { report, messages, error } = await runMarketAnalysis(input)

    yield {
      type: MarketAnalysisStreamEvent.Progress,
      content: MarketAnalysisProgressMessage.Researching,
    }

    if (error) {
      yield { type: MarketAnalysisStreamEvent.Error, content: error }
      return
    }

    for (const msg of messages) {
      yield { type: MarketAnalysisStreamEvent.Message, content: msg }
    }

    if (report) {
      yield { type: MarketAnalysisStreamEvent.Report, content: report }
      yield {
        type: MarketAnalysisStreamEvent.Progress,
        content: MarketAnalysisProgressMessage.Complete,
      }
    } else {
      yield {
        type: MarketAnalysisStreamEvent.Progress,
        content: MARKET_ANALYSIS_NO_STRUCTURED_REPORT,
      }
    }
  } catch (error) {
    yield {
      type: MarketAnalysisStreamEvent.Error,
      content: error instanceof Error ? error.message : MarketAnalysisErrorMessage.Unknown,
    }
  }
}
