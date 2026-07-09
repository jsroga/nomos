import { readNumber, readString, recordArrayFromJson, recordFromJson, stringArrayFromJson } from '@/shared/data/json-guards'
import type { MarketAnalysisReport } from './types'

function parseViabilityVerdict(
  value: unknown
): MarketAnalysisReport['viabilityVerdict'] | undefined {
  const raw = readString(value)
  if (raw === 'strong' || raw === 'moderate' || raw === 'niche' || raw === 'unclear') {
    return raw
  }
  return undefined
}

export function marketAnalysisReportFromJson(json: string): MarketAnalysisReport | null {
  try {
    const record = recordFromJson(JSON.parse(json))
    const overallScore = readNumber(record.overallScore)
    if (overallScore === undefined) return null

    return {
      primaryArchetype: recordFromJson(record.primaryArchetype),
      otherArchetypes: recordArrayFromJson(record.otherArchetypes),
      viabilityVerdict: parseViabilityVerdict(record.viabilityVerdict),
      viabilityReason: readString(record.viabilityReason),
      referenceScores: recordFromJson(record.referenceScores),
      marketMomentum: recordFromJson(record.marketMomentum),
      marketSize: recordFromJson(record.marketSize),
      competitors: recordArrayFromJson(record.competitors),
      audienceFit: recordFromJson(record.audienceFit),
      trends: recordArrayFromJson(record.trends),
      patterns: recordArrayFromJson(record.patterns),
      overallScore,
      recommendations: stringArrayFromJson(record.recommendations),
      risks: stringArrayFromJson(record.risks),
      opportunities: stringArrayFromJson(record.opportunities),
      generatedAt: readString(record.generatedAt) ?? new Date().toISOString(),
    }
  } catch {
    return null
  }
}
