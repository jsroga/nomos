import type { MarketAnalysisReport } from './types'
import { MastraMessageRole } from '../../constants/market-analyst-agent-wire'
import { marketAnalysisReportFromJson } from './market-analysis-wire'
import { LoopStructuredToolOutputField } from './tools/structured-tool'
import { recordFromJson } from '@/shared/data/json-guards'

enum MarketAnalysisReportPayloadField {
  Report = 'report',
  Result = 'result',
}

export interface MarketAnalysisGenerateResult {
  object?: unknown
  text?: string
  toolResults?: unknown
  steps?: unknown
  response?: { messages?: Array<{ role: string; content: unknown }> }
}

function reportFromJsonText(json: string): MarketAnalysisReport | null {
  return marketAnalysisReportFromJson(json)
}

function reportFromUnknown(value: unknown): MarketAnalysisReport | null {
  if (value == null) return null
  if (typeof value === 'string') {
    const direct = reportFromJsonText(value)
    if (direct) return direct
    try {
      return reportFromUnknown(JSON.parse(value))
    } catch {
      return null
    }
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = reportFromUnknown(item)
      if (found) return found
    }
    return null
  }
  const rec = recordFromJson(value)
  if (Object.keys(rec).length === 0) return null
  const nestedReport = rec[MarketAnalysisReportPayloadField.Report]
  if (nestedReport !== undefined) {
    const found = reportFromUnknown(nestedReport)
    if (found) return found
  }
  const output =
    rec[LoopStructuredToolOutputField.Output] ?? rec[MarketAnalysisReportPayloadField.Result]
  if (output !== undefined) {
    const found = reportFromUnknown(output)
    if (found) return found
  }
  return reportFromJsonText(JSON.stringify(rec))
}

function reportFromMessages(
  messages: Array<{ role: string; content: unknown }> | undefined,
): MarketAnalysisReport | null {
  if (!messages) return null
  for (const msg of messages) {
    if (msg.role === MastraMessageRole.Assistant) continue
    const found = reportFromUnknown(msg.content)
    if (found) return found
  }
  return null
}

export function extractReportFromGenerateResult(
  result: MarketAnalysisGenerateResult,
): MarketAnalysisReport | null {
  const fromTools = reportFromUnknown(result.toolResults)
  if (fromTools) return fromTools
  const fromSteps = reportFromUnknown(result.steps)
  if (fromSteps) return fromSteps
  const fromMessages = reportFromMessages(result.response?.messages)
  if (fromMessages) return fromMessages
  return reportFromUnknown(result.object)
}
