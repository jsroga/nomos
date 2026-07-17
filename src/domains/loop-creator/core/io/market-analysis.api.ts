import type { MarketAnalysisReport } from '../../ai/agents/market-analyst/types'
import {
  ContentType,
  HttpMethod,
} from '@/shared/data/constants/protocol'
import { fetchJsonRecord } from '@/shared/data/fetch-json-record'
import { recordFromJson } from '@/shared/data/json-guards'
import { joinUrlPath } from '@/shared/data/url-builder'

const MARKET_ANALYSIS_ROUTE = '/api/loop-creator/market-analysis'

export interface MarketAnalysisPayload {
  mechanics: Array<{ id: string; name: string; type: string; description: string }>
  connections: Array<{ id: string; source: string; target: string; label?: string }>
  loops: Array<{ id: string; name: string; type: string; description: string }>
  gameGenre: string
  gamePlatform: string
  targetAudience: string
  gameDescription: string
}

export interface SavedMarketAnalysisResponse {
  exists: boolean
  analysis: MarketAnalysisReport | null
  metadata?: Record<string, unknown>
}

function isMarketAnalysisReport(value: unknown): value is MarketAnalysisReport {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const report = recordFromJson(value)
  return (
    typeof report.overallScore === 'number' &&
    typeof report.generatedAt === 'string' &&
    Array.isArray(report.recommendations) &&
    Array.isArray(report.risks) &&
    Array.isArray(report.opportunities)
  )
}

export async function fetchSavedMarketAnalysis(
  gameLoopId: string
): Promise<SavedMarketAnalysisResponse> {
  const data = await fetchJsonRecord(joinUrlPath(MARKET_ANALYSIS_ROUTE, gameLoopId))
  return {
    exists: data.exists === true,
    analysis: isMarketAnalysisReport(data.analysis) ? data.analysis : null,
    metadata: typeof data.metadata === 'object' && data.metadata !== null ? recordFromJson(data.metadata) : undefined,
  }
}

export async function startMarketAnalysis(
  payload: MarketAnalysisPayload,
  signal: AbortSignal
): Promise<Response> {
  const response = await fetch(MARKET_ANALYSIS_ROUTE, {
    method: HttpMethod.Post,
    headers: { 'Content-Type': ContentType.Json },
    body: JSON.stringify(payload),
    signal,
  })

  if (!response.ok) {
    throw new Error(`Analysis failed: ${response.statusText}`)
  }

  return response
}

export async function saveMarketAnalysis(
  gameLoopId: string,
  report: MarketAnalysisReport
): Promise<Record<string, unknown>> {
  return fetchJsonRecord(joinUrlPath(MARKET_ANALYSIS_ROUTE, gameLoopId), {
    method: HttpMethod.Post,
    headers: { 'Content-Type': ContentType.Json },
    body: JSON.stringify(report),
  })
}

export async function deleteSavedMarketAnalysis(gameLoopId: string): Promise<void> {
  await fetchJsonRecord(joinUrlPath(MARKET_ANALYSIS_ROUTE, gameLoopId), {
    method: HttpMethod.Delete,
  })
}
