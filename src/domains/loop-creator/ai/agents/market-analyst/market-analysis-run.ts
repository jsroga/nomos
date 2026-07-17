import type { MarketAnalysisReport } from './types'
import { MastraMessageRole } from '../../constants/market-analyst-agent-wire'
import { marketAnalysisReportFromJson } from './market-analysis-wire'

function extractReportFromJsonBlock(content: string): MarketAnalysisReport | null {
  const reportMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
  if (!reportMatch) return null
  try {
    return marketAnalysisReportFromJson(reportMatch[1])
  } catch {
    return null
  }
}

export function extractReportFromAgentMessages(
  messages: Array<{ role: string; content: unknown }>,
): MarketAnalysisReport | null {
  for (const msg of messages) {
    if (msg.role !== MastraMessageRole.Assistant) continue
    const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
    const report = extractReportFromJsonBlock(content)
    if (report) return report
  }
  return null
}

export function extractReportFromText(text: string | undefined): MarketAnalysisReport | null {
  if (!text) return null
  return extractReportFromJsonBlock(text)
}
