import { describe, expect, it } from 'vitest'
import { extractReportFromGenerateResult } from '../market-analysis-run'
import { LoopStructuredToolOutputField } from '../tools/structured-tool'
import { MastraMessageRole } from '../../../constants/market-analyst-agent-wire'

const OVERALL_SCORE = 71
const RECOMMENDATION = 'Lead with the action loop.'

function reportPayload() {
  return {
    overallScore: OVERALL_SCORE,
    recommendations: [RECOMMENDATION],
    risks: [],
    opportunities: [],
    referenceScores: { discoElysium: 40, vampireSurvivors: 80, counterStrike: 10 },
    marketSize: {
      tam: '1B',
      sam: '200M',
      relevantSegment: 'action roguelikes',
      growthRate: '12%',
    },
    competitors: [],
    audienceFit: {
      targetDemographic: 'midcore',
      fitScore: 70,
      strengths: [],
      concerns: [],
    },
  }
}

describe('extractReportFromGenerateResult', () => {
  it('reads the compiled report from generate_report tool output', () => {
    const report = reportPayload()
    const extracted = extractReportFromGenerateResult({
      toolResults: [
        {
          [LoopStructuredToolOutputField.Output]: JSON.stringify({
            success: true,
            report,
          }),
        },
      ],
    })
    expect(extracted?.overallScore).toBe(OVERALL_SCORE)
    expect(extracted?.recommendations).toEqual([RECOMMENDATION])
  })

  it('falls back to structuredOutput object', () => {
    const extracted = extractReportFromGenerateResult({ object: reportPayload() })
    expect(extracted?.overallScore).toBe(OVERALL_SCORE)
  })

  it('does not scrape fenced JSON from assistant prose', () => {
    const extracted = extractReportFromGenerateResult({
      text: `Here is the report:\n\`\`\`json\n${JSON.stringify(reportPayload())}\n\`\`\``,
      response: {
        messages: [
          {
            role: MastraMessageRole.Assistant,
            content: `\`\`\`json\n${JSON.stringify(reportPayload())}\n\`\`\``,
          },
        ],
      },
    })
    expect(extracted).toBeNull()
  })
})
